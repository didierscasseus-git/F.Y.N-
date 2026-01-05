/**
 * WAITLIST SERVICE
 * 
 * Waitlist queue management with wait time estimates.
 * PRD Section 7 - Waitlist Management
 */

import { query } from '../../core/connectors/postgres';
import { logMutation, AuditAction, AuditSource } from '../../core/audit';
import { Role } from '../../core/auth/rbac';
import { Errors } from '../../core/errors/StandardError';
import { createLogger } from '../../core/logger';
import { incrementVisitCount } from '../guest/guest.service';

const logger = createLogger('WAITLIST_SERVICE');

export type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';

export interface WaitlistEntry {
    id: string;
    guestId: string;
    partySize: number;
    estimatedWaitMinutes?: number;
    status: WaitlistStatus;
    phoneNumber?: string;
    notes?: string;
    position?: number; // Queue position
    createdAt: Date;
    updatedAt: Date;
    seatedAt?: Date;
}

export interface CreateWaitlistInput {
    guestId: string;
    partySize: number;
    estimatedWaitMinutes?: number;
    phoneNumber?: string;
    notes?: string;
}

export interface UpdateWaitlistInput {
    partySize?: number;
    estimatedWaitMinutes?: number;
    status?: WaitlistStatus;
    phoneNumber?: string;
    notes?: string;
}

/**
 * Add guest to waitlist
 */
export async function addToWaitlist(
    input: CreateWaitlistInput,
    actorId: string,
    role: Role
): Promise<WaitlistEntry> {
    logger.info('Adding guest to waitlist', { guestId: input.guestId, actor: actorId });

    const result = await query(`
    INSERT INTO waitlist_entries (
      guest_id, party_size, estimated_wait_minutes, phone_number, notes
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
        input.guestId,
        input.partySize,
        input.estimatedWaitMinutes || null,
        input.phoneNumber || null,
        input.notes || null
    ]);

    const entry = mapDbToWaitlistEntry(result.rows[0]);

    // Calculate position
    entry.position = await getQueuePosition(entry.id);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'waitlist_entry',
        entry.id,
        undefined,
        entry as any
    );

    logger.info('Guest added to waitlist', { entryId: entry.id, position: entry.position });

    return entry;
}

/**
 * Get waitlist entry by ID
 */
export async function getWaitlistEntryById(id: string): Promise<WaitlistEntry | null> {
    const result = await query(`
    SELECT * FROM waitlist_entries WHERE id = $1
  `, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    const entry = mapDbToWaitlistEntry(result.rows[0]);
    entry.position = await getQueuePosition(id);

    return entry;
}

/**
 * Get current waitlist (WAITING and NOTIFIED entries)
 */
export async function getCurrentWaitlist(): Promise<WaitlistEntry[]> {
    const result = await query(`
    SELECT * FROM waitlist_entries
    WHERE status IN ('WAITING', 'NOTIFIED')
    ORDER BY created_at ASC
  `);

    const entries = result.rows.map(mapDbToWaitlistEntry);

    // Add positions
    for (let i = 0; i < entries.length; i++) {
        entries[i].position = i + 1;
    }

    return entries;
}

/**
 * Get waitlist entries for a guest
 */
export async function getGuestWaitlistEntries(guestId: string): Promise<WaitlistEntry[]> {
    const result = await query(`
    SELECT * FROM waitlist_entries
    WHERE guest_id = $1
    ORDER BY created_at DESC
  `, [guestId]);

    return result.rows.map(mapDbToWaitlistEntry);
}

/**
 * Update waitlist entry
 */
export async function updateWaitlistEntry(
    id: string,
    input: UpdateWaitlistInput,
    actorId: string,
    role: Role
): Promise<WaitlistEntry> {
    const current = await getWaitlistEntryById(id);
    if (!current) {
        throw Errors.notFound('WaitlistEntry', id);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.partySize !== undefined) {
        updates.push(`party_size = $${paramIndex++}`);
        values.push(input.partySize);
    }

    if (input.estimatedWaitMinutes !== undefined) {
        updates.push(`estimated_wait_minutes = $${paramIndex++}`);
        values.push(input.estimatedWaitMinutes);
    }

    if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(input.status);

        // Set seated_at when seated
        if (input.status === 'SEATED') {
            updates.push(`seated_at = CURRENT_TIMESTAMP`);
            // Increment visit count
            await incrementVisitCount(current.guestId);
        }
    }

    if (input.phoneNumber !== undefined) {
        updates.push(`phone_number = $${paramIndex++}`);
        values.push(input.phoneNumber);
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
    UPDATE waitlist_entries
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

    const updated = mapDbToWaitlistEntry(result.rows[0]);
    updated.position = await getQueuePosition(id);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.UPDATE,
        'waitlist_entry',
        id,
        current as any,
        updated as any
    );

    logger.info('Waitlist entry updated', { entryId: id });

    return updated;
}

/**
 * Mark waitlist entry as notified
 */
export async function notifyGuest(
    id: string,
    actorId: string,
    role: Role
): Promise<WaitlistEntry> {
    return updateWaitlistEntry(id, { status: 'NOTIFIED' }, actorId, role);
}

/**
 * Mark waitlist entry as seated
 */
export async function seatGuest(
    id: string,
    actorId: string,
    role: Role
): Promise<WaitlistEntry> {
    return updateWaitlistEntry(id, { status: 'SEATED' }, actorId, role);
}

/**
 * Cancel waitlist entry
 */
export async function cancelWaitlistEntry(
    id: string,
    actorId: string,
    role: Role
): Promise<WaitlistEntry> {
    return updateWaitlistEntry(id, { status: 'CANCELLED' }, actorId, role);
}

/**
 * Get queue position for an entry
 */
async function getQueuePosition(entryId: string): Promise<number> {
    const result = await query(`
    SELECT COUNT(*) as position
    FROM waitlist_entries
    WHERE status IN ('WAITING', 'NOTIFIED')
      AND created_at <= (SELECT created_at FROM waitlist_entries WHERE id = $1)
      AND id <= $1
  `, [entryId]);

    return parseInt(result.rows[0]?.position || '0', 10);
}

function mapDbToWaitlistEntry(row: any): WaitlistEntry {
    return {
        id: row.id,
        guestId: row.guest_id,
        partySize: row.party_size,
        estimatedWaitMinutes: row.estimated_wait_minutes,
        status: row.status,
        phoneNumber: row.phone_number,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        seatedAt: row.seated_at ? new Date(row.seated_at) : undefined
    };
}
