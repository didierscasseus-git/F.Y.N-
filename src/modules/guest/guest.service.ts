/**
 * GUEST PROFILE SERVICE
 * 
 * Business logic for guest profile management.
 * PRD Section 4 - Guest Domain
 */

import { query, transaction } from '../../core/connectors/postgres';
import { logMutation, AuditAction, AuditSource } from '../../core/audit';
import { Role } from '../../core/auth/rbac';
import { Errors } from '../../core/errors/StandardError';
import { createLogger } from '../../core/logger';

const logger = createLogger('GUEST_SERVICE');

export interface GuestProfile {
    id: string;
    name: string;
    phoneNumber?: string; // Encrypted
    email?: string; // Encrypted
    visitCount: number;
    lastVisit?: Date;
    vipStatus: boolean;
    optOut: boolean;
    retentionPolicy: 'INDEFINITE' | 'REQUEST_DELETE';
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGuestInput {
    name: string;
    phoneNumber?: string;
    email?: string;
    vipStatus?: boolean;
    optOut?: boolean;
}

export interface UpdateGuestInput {
    name?: string;
    phoneNumber?: string;
    email?: string;
    vipStatus?: boolean;
    optOut?: boolean;
    retentionPolicy?: 'INDEFINITE' | 'REQUEST_DELETE';
}

/**
 * Create a new guest profile
 */
export async function createGuest(
    input: CreateGuestInput,
    actorId: string,
    role: Role
): Promise<GuestProfile> {
    logger.info('Creating guest profile', { name: input.name, actor: actorId });

    const result = await query(`
    INSERT INTO guest_profiles (
      name, phone_number, email, vip_status, opt_out
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
        input.name,
        input.phoneNumber || null,
        input.email || null,
        input.vipStatus || false,
        input.optOut || false
    ]);

    const guest = mapDbToGuest(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'guest_profile',
        guest.id,
        undefined,
        guest as any
    );

    logger.info('Guest profile created', { guestId: guest.id });

    return guest;
}

/**
 * Get guest by ID
 */
export async function getGuestById(id: string): Promise<GuestProfile | null> {
    const result = await query(`
    SELECT * FROM guest_profiles
    WHERE id = $1 AND deleted_at IS NULL
  `, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    return mapDbToGuest(result.rows[0]);
}

/**
 * Search guests by name, phone, or email
 */
export async function searchGuests(
    searchTerm: string,
    limit: number = 50
): Promise<GuestProfile[]> {
    const result = await query(`
    SELECT * FROM guest_profiles
    WHERE deleted_at IS NULL
      AND (
        name ILIKE $1
        OR phone_number ILIKE $1
        OR email ILIKE $1
      )
    ORDER BY name
    LIMIT $2
  `, [`%${searchTerm}%`, limit]);

    return result.rows.map(mapDbToGuest);
}

/**
 * Update guest profile
 */
export async function updateGuest(
    id: string,
    input: UpdateGuestInput,
    actorId: string,
    role: Role
): Promise<GuestProfile> {
    // Get current state
    const current = await getGuestById(id);
    if (!current) {
        throw Errors.notFound('GuestProfile', id);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
    }

    if (input.phoneNumber !== undefined) {
        updates.push(`phone_number = $${paramIndex++}`);
        values.push(input.phoneNumber);
    }

    if (input.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(input.email);
    }

    if (input.vipStatus !== undefined) {
        updates.push(`vip_status = $${paramIndex++}`);
        values.push(input.vipStatus);
    }

    if (input.optOut !== undefined) {
        updates.push(`opt_out = $${paramIndex++}`);
        values.push(input.optOut);
    }

    if (input.retentionPolicy !== undefined) {
        updates.push(`retention_policy = $${paramIndex++}`);
        values.push(input.retentionPolicy);
    }

    if (updates.length === 0) {
        return current;
    }

    values.push(id);

    const result = await query(`
    UPDATE guest_profiles
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
    RETURNING *
  `, values);

    if (result.rows.length === 0) {
        throw Errors.notFound('GuestProfile', id);
    }

    const updated = mapDbToGuest(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.UPDATE,
        'guest_profile',
        id,
        current as any,
        updated as any
    );

    logger.info('Guest profile updated', { guestId: id });

    return updated;
}

/**
 * Soft delete guest profile
 */
export async function deleteGuest(
    id: string,
    actorId: string,
    role: Role
): Promise<void> {
    const current = await getGuestById(id);
    if (!current) {
        throw Errors.notFound('GuestProfile', id);
    }

    await query(`
    UPDATE guest_profiles
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.DELETE,
        'guest_profile',
        id,
        current as any,
        undefined,
        'User requested deletion'
    );

    logger.info('Guest profile soft-deleted', { guestId: id });
}

/**
 * Increment visit count
 */
export async function incrementVisitCount(id: string): Promise<void> {
    await query(`
    UPDATE guest_profiles
    SET visit_count = visit_count + 1,
        last_visit = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);
}

/**
 * Map database row to GuestProfile
 */
function mapDbToGuest(row: any): GuestProfile {
    return {
        id: row.id,
        name: row.name,
        phoneNumber: row.phone_number,
        email: row.email,
        visitCount: row.visit_count,
        lastVisit: row.last_visit ? new Date(row.last_visit) : undefined,
        vipStatus: row.vip_status,
        optOut: row.opt_out,
        retentionPolicy: row.retention_policy,
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
