/**
 * GUEST PREFERENCES SERVICE
 * 
 * Manage guest dining preferences.
 * PRD Section 4 - Guest Preferences
 */

import { query } from '../../core/connectors/postgres';
import { logMutation, AuditAction, AuditSource } from '../../core/audit';
import { Role } from '../../core/auth/rbac';
import { Errors } from '../../core/errors/StandardError';

export type PreferenceCategory = 'SEATING' | 'MENU' | 'SERVICE' | 'OTHER';

export interface GuestPreference {
    id: string;
    guestId: string;
    category: PreferenceCategory;
    preferenceValue: string;
    note?: string;
    createdAt: Date;
}

export interface CreatePreferenceInput {
    category: PreferenceCategory;
    preferenceValue: string;
    note?: string;
}

/**
 * Get all preferences for a guest
 */
export async function getGuestPreferences(guestId: string): Promise<GuestPreference[]> {
    const result = await query(`
    SELECT * FROM guest_preferences
    WHERE guest_id = $1
    ORDER BY category, created_at DESC
  `, [guestId]);

    return result.rows.map(mapDbToPreference);
}

/**
 * Add preference for guest
 */
export async function addGuestPreference(
    guestId: string,
    input: CreatePreferenceInput,
    actorId: string,
    role: Role
): Promise<GuestPreference> {
    const result = await query(`
    INSERT INTO guest_preferences (guest_id, category, preference_value, note)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [guestId, input.category, input.preferenceValue, input.note || null]);

    const preference = mapDbToPreference(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'guest_preference',
        preference.id,
        undefined,
        preference as any
    );

    return preference;
}

/**
 * Delete preference
 */
export async function deleteGuestPreference(
    preferenceId: string,
    actorId: string,
    role: Role
): Promise<void> {
    const result = await query(`
    DELETE FROM guest_preferences
    WHERE id = $1
    RETURNING *
  `, [preferenceId]);

    if (result.rows.length === 0) {
        throw Errors.notFound('GuestPreference', preferenceId);
    }

    const deleted = mapDbToPreference(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.DELETE,
        'guest_preference',
        preferenceId,
        deleted as any,
        undefined
    );
}

function mapDbToPreference(row: any): GuestPreference {
    return {
        id: row.id,
        guestId: row.guest_id,
        category: row.category,
        preferenceValue: row.preference_value,
        note: row.note,
        createdAt: new Date(row.created_at)
    };
}
