/**
 * EIGHTY-SIX ENGINE
 * 
 * Automated detection of 86 triggers with mandatory staff confirmation.
 * AUTO_UN_86 = DISABLED (manual resolution only)
 * PRD Section 10 - 86 Management
 */

import { query } from '../../core/connectors/postgres';
import { getMenuItemIngredients } from '../menu/menu.service';
import { create86Event } from '../inventory/inventory.service';
import { Role } from '../../core/auth/rbac';
import { createLogger } from '../../core/logger';

const logger = createLogger('EIGHTY_SIX_ENGINE');

export interface EightySixSuggestion {
    id: string;
    menuItemId: string;
    menuItemName: string;
    triggerReason: string;
    triggerDetails: Record<string, any>;
    suggestedAt: Date;
    confirmedAt?: Date;
    confirmedBy?: string;
    rejected: boolean;
}

export type TriggerType = 'INVENTORY_DEPLETED' | 'INGREDIENT_UNAVAILABLE' | 'MANUAL_REQUEST';

/**
 * Scan for 86 triggers
 */
export async function scanForTriggers(): Promise<EightySixSuggestion[]> {
    logger.info('Scanning for 86 triggers');

    const suggestions: EightySixSuggestion[] = [];

    // Get all available menu items
    const menuItems = await query(`
    SELECT id, name FROM menu_items
    WHERE status = 'AVAILABLE'
  `);

    for (const item of menuItems.rows) {
        const trigger = await checkMenuItemTriggers(item.id, item.name);
        if (trigger) {
            // Check if suggestion already exists
            const existing = await query(`
        SELECT id FROM eighty_six_suggestions
        WHERE menu_item_id = $1 AND confirmed_at IS NULL AND rejected = FALSE
      `, [item.id]);

            if (existing.rows.length === 0) {
                // Create new suggestion
                const result = await query(`
          INSERT INTO eighty_six_suggestions (
            menu_item_id, menu_item_name, trigger_reason, trigger_details
          ) VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [item.id, item.name, trigger.reason, JSON.stringify(trigger.details)]);

                suggestions.push(mapDbToSuggestion(result.rows[0]));

                logger.warn('86 trigger detected', {
                    menuItemId: item.id,
                    menuItemName: item.name,
                    reason: trigger.reason
                });
            }
        }
    }

    logger.info('86 scan complete', { suggestionsCreated: suggestions.length });

    return suggestions;
}

/**
 * Check if menu item should be 86'd
 */
async function checkMenuItemTriggers(
    menuItemId: string,
    menuItemName: string
): Promise<{ reason: string; details: Record<string, any> } | null> {
    // Get ingredients
    const ingredients = await getMenuItemIngredients(menuItemId);

    if (ingredients.length === 0) {
        // No ingredients tracked - cannot auto-detect
        return null;
    }

    // Check each ingredient's inventory
    for (const ingredient of ingredients) {
        const inventoryResult = await query(`
      SELECT name, current_quantity, unit
      FROM inventory_items
      WHERE id = $1
    `, [ingredient.inventoryItemId]);

        if (inventoryResult.rows.length === 0) {
            continue;
        }

        const inventory = inventoryResult.rows[0];
        const currentQty = parseFloat(inventory.current_quantity);

        // Check if ingredient is depleted (less than required quantity)
        if (currentQty < ingredient.quantityRequired && !ingredient.isOptional) {
            return {
                reason: 'INGREDIENT_UNAVAILABLE',
                details: {
                    ingredientName: inventory.name,
                    requiredQuantity: ingredient.quantityRequired,
                    currentQuantity: currentQty,
                    unit: inventory.unit
                }
            };
        }
    }

    return null;
}

/**
 * Get pending 86 suggestions
 */
export async function getPending86Suggestions(): Promise<EightySixSuggestion[]> {
    const result = await query(`
    SELECT * FROM eighty_six_suggestions
    WHERE confirmed_at IS NULL AND rejected = FALSE
    ORDER BY suggested_at ASC
  `);

    return result.rows.map(mapDbToSuggestion);
}

/**
 * Confirm 86 suggestion (creates actual 86 event)
 */
export async function confirm86Suggestion(
    suggestionId: string,
    actorId: string,
    role: Role
): Promise<void> {
    // Get suggestion
    const suggestionResult = await query(`
    SELECT * FROM eighty_six_suggestions
    WHERE id = $1 AND confirmed_at IS NULL
  `, [suggestionId]);

    if (suggestionResult.rows.length === 0) {
        throw new Error('Suggestion not found or already confirmed');
    }

    const suggestion = mapDbToSuggestion(suggestionResult.rows[0]);

    // Create actual 86 event
    await create86Event(
        suggestion.menuItemId,
        `${suggestion.triggerReason}: ${JSON.stringify(suggestion.triggerDetails)}`,
        actorId,
        role
    );

    // Mark suggestion as confirmed
    await query(`
    UPDATE eighty_six_suggestions
    SET confirmed_at = CURRENT_TIMESTAMP,
        confirmed_by = $1
    WHERE id = $2
  `, [actorId, suggestionId]);

    logger.info('86 suggestion confirmed', {
        suggestionId,
        menuItemId: suggestion.menuItemId,
        confirmedBy: actorId
    });
}

/**
 * Reject 86 suggestion
 */
export async function reject86Suggestion(
    suggestionId: string,
    actorId: string
): Promise<void> {
    await query(`
    UPDATE eighty_six_suggestions
    SET rejected = TRUE,
        confirmed_by = $1
    WHERE id = $2
  `, [actorId, suggestionId]);

    logger.info('86 suggestion rejected', { suggestionId, rejectedBy: actorId });
}

/**
 * Check if menu item can be ordered (for POS integration)
 */
export async function canOrderMenuItem(menuItemId: string): Promise<{
    canOrder: boolean;
    reason?: string;
}> {
    // Check if item is 86'd
    const result = await query(`
    SELECT status FROM menu_items WHERE id = $1
  `, [menuItemId]);

    if (result.rows.length === 0) {
        return { canOrder: false, reason: 'Menu item not found' };
    }

    if (result.rows[0].status === 'EIGHTY_SIXED') {
        return { canOrder: false, reason: 'Item is currently 86\'d' };
    }

    // Check for active 86 events
    const activeEvent = await query(`
    SELECT id FROM eighty_six_events
    WHERE menu_item_id = $1 AND resolved_at IS NULL
  `, [menuItemId]);

    if (activeEvent.rows.length > 0) {
        return { canOrder: false, reason: 'Item is currently 86\'d' };
    }

    return { canOrder: true };
}

function mapDbToSuggestion(row: any): EightySixSuggestion {
    return {
        id: row.id,
        menuItemId: row.menu_item_id,
        menuItemName: row.menu_item_name,
        triggerReason: row.trigger_reason,
        triggerDetails: JSON.parse(row.trigger_details || '{}'),
        suggestedAt: new Date(row.suggested_at),
        confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
        confirmedBy: row.confirmed_by,
        rejected: row.rejected
    };
}
