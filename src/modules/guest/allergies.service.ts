/**
 * GUEST ALLERGIES SERVICE
 * 
 * Manage guest allergies with severity tracking.
 * PRD Section 4 & 5 - Allergy Management
 */

import { query } from '../../core/connectors/postgres';
import { logMutation, AuditAction, AuditSource } from '../../core/audit';
import { Role } from '../../core/auth/rbac';
import { Errors } from '../../core/errors/StandardError';

export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';

export interface GuestAllergy {
    id: string;
    guestId: string;
    allergen: string;
    severity: AllergySeverity;
    verifiedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateAllergyInput {
    allergen: string;
    severity: AllergySeverity;
}

/**
 * Get all allergies for a guest
 */
export async function getGuestAllergies(guestId: string): Promise<GuestAllergy[]> {
    const result = await query(`
    SELECT * FROM guest_allergies
    WHERE guest_id = $1
    ORDER BY severity DESC, allergen
  `, [guestId]);

    return result.rows.map(mapDbToAllergy);
}

/**
 * Add allergy for guest
 */
export async function addGuestAllergy(
    guestId: string,
    input: CreateAllergyInput,
    actorId: string,
    role: Role
): Promise<GuestAllergy> {
    const result = await query(`
    INSERT INTO guest_allergies (guest_id, allergen, severity, verified_by)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [guestId, input.allergen, input.severity, actorId]);

    const allergy = mapDbToAllergy(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'guest_allergy',
        allergy.id,
        undefined,
        allergy as any
    );

    return allergy;
}

/**
 * Update allergy severity
 */
export async function updateGuestAllergy(
    allergyId: string,
    severity: AllergySeverity,
    actorId: string,
    role: Role
): Promise<GuestAllergy> {
    // Get current
    const current = await query(`
    SELECT * FROM guest_allergies WHERE id = $1
  `, [allergyId]);

    if (current.rows.length === 0) {
        throw Errors.notFound('GuestAllergy', allergyId);
    }

    const result = await query(`
    UPDATE guest_allergies
    SET severity = $1, verified_by = $2
    WHERE id = $3
    RETURNING *
  `, [severity, actorId, allergyId]);

    const updated = mapDbToAllergy(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.UPDATE,
        'guest_allergy',
        allergyId,
        mapDbToAllergy(current.rows[0]) as any,
        updated as any
    );

    return updated;
}

/**
 * Delete allergy
 */
export async function deleteGuestAllergy(
    allergyId: string,
    actorId: string,
    role: Role
): Promise<void> {
    const result = await query(`
    DELETE FROM guest_allergies
    WHERE id = $1
    RETURNING *
  `, [allergyId]);

    if (result.rows.length === 0) {
        throw Errors.notFound('GuestAllergy', allergyId);
    }

    const deleted = mapDbToAllergy(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.DELETE,
        'guest_allergy',
        allergyId,
        deleted as any,
        undefined
    );
}

function mapDbToAllergy(row: any): GuestAllergy {
    return {
        id: row.id,
        guestId: row.guest_id,
        allergen: row.allergen,
        severity: row.severity,
        verifiedBy: row.verified_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
