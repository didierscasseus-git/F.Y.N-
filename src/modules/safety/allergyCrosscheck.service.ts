/**
 * ALLERGY CROSSCHECK SERVICE
 * 
 * Validates menu items against guest allergies to prevent allergic reactions.
 * PRD Section 5 & 8 - Safety & Allergy Management
 */

import { query } from '../../core/connectors/postgres';
import { getGuestAllergies, AllergySeverity } from '../guest/allergies.service';
import { getMenuItemIngredients, getMenuItemsIngredientsBatch, MenuItemIngredient } from '../menu/menu.service';
import { createLogger } from '../../core/logger';

const logger = createLogger('ALLERGY_CROSSCHECK');

export interface AllergyMatch {
    allergen: string;
    severity: AllergySeverity;
    matchedIngredient: string;
    inventoryItemId: string;
}

export interface CrosscheckResult {
    safe: boolean;
    matches: AllergyMatch[];
    highRiskDetected: boolean; // SEVERE or LIFE_THREATENING
}

/**
 * Check if menu item is safe for guest based on allergies
 */
export async function crosscheckMenuItem(
    guestId: string,
    menuItemId: string
): Promise<CrosscheckResult> {
    logger.info('Crosschecking menu item for allergies', { guestId, menuItemId });

    // Get guest allergies
    const allergies = await getGuestAllergies(guestId);

    if (allergies.length === 0) {
        return {
            safe: true,
            matches: [],
            highRiskDetected: false
        };
    }

    // Get menu item ingredients
    const ingredients = await getMenuItemIngredients(menuItemId);

    if (ingredients.length === 0) {
        // No ingredients data available - cannot verify safety
        logger.warn('No ingredients data for menu item', { menuItemId });
        return {
            safe: false,
            matches: [],
            highRiskDetected: false
        };
    }

    // Check for matches
    const matches: AllergyMatch[] = [];

    for (const allergy of allergies) {
        // Use word boundaries for more accurate matching (prevents Egg -> Eggplant)
        const allergenLower = allergy.allergen.toLowerCase();
        const allergenRegex = new RegExp(`\\b${allergenLower}\\b`, 'i');

        for (const ingredient of ingredients) {
            const ingredientNameLower = ingredient.inventoryItemName.toLowerCase();

            if (allergenRegex.test(ingredientNameLower) || ingredientNameLower.includes(allergenLower)) {
                matches.push({
                    allergen: allergy.allergen,
                    severity: allergy.severity,
                    matchedIngredient: ingredient.inventoryItemName,
                    inventoryItemId: ingredient.inventoryItemId
                });
            }
        }
    }

    const highRiskDetected = matches.some(
        m => m.severity === 'SEVERE' || m.severity === 'LIFE_THREATENING'
    );

    if (matches.length > 0) {
        logger.warn('Allergy matches detected', {
            guestId,
            menuItemId,
            matchCount: matches.length,
            highRisk: highRiskDetected
        });
    }

    return {
        safe: matches.length === 0,
        matches,
        highRiskDetected
    };
}

/**
 * Batch crosscheck multiple menu items for a guest
 */
export async function crosscheckMenuItems(
    guestId: string,
    menuItemIds: string[]
): Promise<Map<string, CrosscheckResult>> {
    const results = new Map<string, CrosscheckResult>();

    // Get guest allergies once
    const allergies = await getGuestAllergies(guestId);

    if (allergies.length === 0) {
        for (const id of menuItemIds) {
            results.set(id, { safe: true, matches: [], highRiskDetected: false });
        }
        return results;
    }

    // Get ALL ingredients for ALL menu items in one query (N+1 Fix)
    const ingredientsMap = await getMenuItemsIngredientsBatch(menuItemIds);

    for (const menuItemId of menuItemIds) {
        const ingredients = ingredientsMap.get(menuItemId) || [];

        if (ingredients.length === 0) {
            results.set(menuItemId, { safe: false, matches: [], highRiskDetected: false });
            continue;
        }

        const matches: AllergyMatch[] = [];
        for (const allergy of allergies) {
            const allergenLower = allergy.allergen.toLowerCase();
            const allergenRegex = new RegExp(`\\b${allergenLower}\\b`, 'i');

            for (const ingredient of ingredients) {
                const ingredientNameLower = ingredient.inventoryItemName.toLowerCase();
                if (allergenRegex.test(ingredientNameLower) || ingredientNameLower.includes(allergenLower)) {
                    matches.push({
                        allergen: allergy.allergen,
                        severity: allergy.severity,
                        matchedIngredient: ingredient.inventoryItemName,
                        inventoryItemId: ingredient.inventoryItemId
                    });
                }
            }
        }

        const highRiskDetected = matches.some(
            m => m.severity === 'SEVERE' || m.severity === 'LIFE_THREATENING'
        );

        results.set(menuItemId, {
            safe: matches.length === 0,
            matches,
            highRiskDetected
        });
    }

    return results;
}

/**
 * Get safe menu items for guest (no allergy matches)
 */
export async function getSafeMenuItems(guestId: string): Promise<string[]> {
    // Get all menu items
    const menuResult = await query(`
    SELECT id FROM menu_items WHERE status = 'AVAILABLE'
  `);

    const menuItemIds = menuResult.rows.map(row => row.id);
    const results = await crosscheckMenuItems(guestId, menuItemIds);

    const safeItems: string[] = [];
    for (const [menuItemId, result] of results.entries()) {
        if (result.safe) {
            safeItems.push(menuItemId);
        }
    }

    return safeItems;
}
