/**
 * RESERVATION SERVICE
 * 
 * Reservation management with status tracking.
 * PRD Section 6 - Reservations
 */

import { query } from '../../core/connectors/postgres';
import { logMutation, AuditAction, AuditSource } from '../../core/audit';
import { Role } from '../../core/auth/rbac';
import { Errors } from '../../core/errors/StandardError';
import { createLogger } from '../../core/logger';
import { incrementVisitCount } from '../guest/guest.service';
import { createPublisher } from '../../core/connectors/pubsub';

const logger = createLogger('RESERVATION_SERVICE');
const publisher = createPublisher('reservation.events');

export type ReservationStatus =
    | 'BOOKED'
    | 'ARRIVED'
    | 'SEATED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW';

export type ReservationSource = 'PHONE' | 'WEB' | 'WALK_IN';

export interface Reservation {
    id: string;
    guestId: string;
    partySize: number;
    reservationTime: Date;
    durationMinutes: number;
    status: ReservationStatus;
    notes?: string;
    source: ReservationSource;
    confirmationSent: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateReservationInput {
    guestId: string;
    partySize: number;
    reservationTime: Date;
    durationMinutes?: number;
    notes?: string;
    source: ReservationSource;
}

export interface UpdateReservationInput {
    partySize?: number;
    reservationTime?: Date;
    durationMinutes?: number;
    status?: ReservationStatus;
    notes?: string;
}

/**
 * Create reservation
 */
export async function createReservation(
    input: CreateReservationInput,
    actorId: string,
    role: Role
): Promise<Reservation> {
    logger.info('Creating reservation', { guestId: input.guestId, actor: actorId });

    const result = await query(`
    INSERT INTO reservations (
      guest_id, party_size, reservation_time, duration_minutes, notes, source
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
        input.guestId,
        input.partySize,
        input.reservationTime.toISOString(),
        input.durationMinutes || 90,
        input.notes || null,
        input.source
    ]);

    const reservation = mapDbToReservation(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'reservation',
        reservation.id,
        undefined,
        reservation as any
    );

    logger.info('Reservation created', { reservationId: reservation.id });

    // Publish event
    await publisher.publish(reservation, { eventType: 'RESERVATION_CREATED' });

    return reservation;
}

/**
 * Get reservation by ID
 */
export async function getReservationById(id: string): Promise<Reservation | null> {
    const result = await query(`
    SELECT * FROM reservations WHERE id = $1
  `, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    return mapDbToReservation(result.rows[0]);
}

/**
 * Get reservations for a guest
 */
export async function getGuestReservations(guestId: string): Promise<Reservation[]> {
    const result = await query(`
    SELECT * FROM reservations
    WHERE guest_id = $1
    ORDER BY reservation_time DESC
  `, [guestId]);

    return result.rows.map(mapDbToReservation);
}

/**
 * Get reservations by date range
 */
export async function getReservationsByDateRange(
    startDate: Date,
    endDate: Date,
    status?: ReservationStatus
): Promise<Reservation[]> {
    let sql = `
    SELECT * FROM reservations
    WHERE reservation_time >= $1 AND reservation_time <= $2
  `;
    const params: any[] = [startDate.toISOString(), endDate.toISOString()];

    if (status) {
        sql += ` AND status = $3`;
        params.push(status);
    }

    sql += ` ORDER BY reservation_time ASC`;

    const result = await query(sql, params);
    return result.rows.map(mapDbToReservation);
}

/**
 * Update reservation
 */
export async function updateReservation(
    id: string,
    input: UpdateReservationInput,
    actorId: string,
    role: Role
): Promise<Reservation> {
    const current = await getReservationById(id);
    if (!current) {
        throw Errors.notFound('Reservation', id);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.partySize !== undefined) {
        updates.push(`party_size = $${paramIndex++}`);
        values.push(input.partySize);
    }

    if (input.reservationTime !== undefined) {
        updates.push(`reservation_time = $${paramIndex++}`);
        values.push(input.reservationTime.toISOString());
    }

    if (input.durationMinutes !== undefined) {
        updates.push(`duration_minutes = $${paramIndex++}`);
        values.push(input.durationMinutes);
    }

    if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(input.status);

        // Increment visit count when completed
        if (input.status === 'COMPLETED') {
            await incrementVisitCount(current.guestId);
        }
    }

    if (input.notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(input.notes);
    }

    if (updates.length === 0) {
        return current;
    }

    values.push(id);

    const result = await query(`
    UPDATE reservations
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

    const updated = mapDbToReservation(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.UPDATE,
        'reservation',
        id,
        current as any,
        updated as any
    );

    logger.info('Reservation updated', { reservationId: id });

    // Publish event
    await publisher.publish(updated, { eventType: 'RESERVATION_UPDATED', status: updated.status });

    return updated;
}

/**
 * Cancel reservation
 */
export async function cancelReservation(
    id: string,
    actorId: string,
    role: Role
): Promise<Reservation> {
    return updateReservation(id, { status: 'CANCELLED' }, actorId, role);
}

/**
 * Mark reservation as arrived
 */
export async function markArrived(
    id: string,
    actorId: string,
    role: Role
): Promise<Reservation> {
    return updateReservation(id, { status: 'ARRIVED' }, actorId, role);
}

/**
 * Mark reservation as seated
 */
export async function markSeated(
    id: string,
    actorId: string,
    role: Role
): Promise<Reservation> {
    return updateReservation(id, { status: 'SEATED' }, actorId, role);
}

function mapDbToReservation(row: any): Reservation {
    return {
        id: row.id,
        guestId: row.guest_id,
        partySize: row.party_size,
        reservationTime: new Date(row.reservation_time),
        durationMinutes: row.duration_minutes,
        status: row.status,
        notes: row.notes,
        source: row.source,
        confirmationSent: row.confirmation_sent,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
