/**
 * MENU SERVICE
 * 
 * Menu item management with ingredient tracking.
 * PRD Section 5 - Ingredients are staff-only
 */

import { query } from '../../core/connectors/postgres';
import { logMutation, AuditAction, AuditSource } from '../../core/audit';
import { Role } from '../../core/auth/rbac';
import { Errors } from '../../core/errors/StandardError';
import { createLogger } from '../../core/logger';

const logger = createLogger('MENU_SERVICE');

export interface MenuItem {
    id: string;
    name: string;
    category?: string;
    price: number;
    prepTimeEstimate?: number; // Minutes
    status: 'AVAILABLE' | 'EIGHTY_SIXED';
    isTaxable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface MenuItemWithIngredients extends MenuItem {
    ingredients?: MenuItemIngredient[];
}

export interface MenuItemIngredient {
    id: string;
    menuItemId: string;
    inventoryItemId: string;
    inventoryItemName: string;
    quantityRequired: number;
    unit: string;
    isOptional: boolean;
}

export interface CreateMenuItemInput {
    name: string;
    category?: string;
    price: number;
    prepTimeEstimate?: number;
    isTaxable?: boolean;
}

export interface UpdateMenuItemInput {
    name?: string;
    category?: string;
    price?: number;
    prepTimeEstimate?: number;
    status?: 'AVAILABLE' | 'EIGHTY_SIXED';
    isTaxable?: boolean;
}

/**
 * Get all menu items
 */
export async function getAllMenuItems(includeIngredients: boolean = false): Promise<MenuItem[] | MenuItemWithIngredients[]> {
    const result = await query(`
    SELECT * FROM menu_items
    ORDER BY category, name
  `);

    const items = result.rows.map(mapDbToMenuItem);

    if (includeIngredients) {
        const itemsWithIngredients = await Promise.all(
            items.map(async (item) => ({
                ...item,
                ingredients: await getMenuItemIngredients(item.id)
            }))
        );
        return itemsWithIngredients;
    }

    return items;
}

/**
 * Get menu item by ID
 */
export async function getMenuItemById(id: string, includeIngredients: boolean = false): Promise<MenuItem | MenuItemWithIngredients | null> {
    const result = await query(`
    SELECT * FROM menu_items WHERE id = $1
  `, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    const item = mapDbToMenuItem(result.rows[0]);

    if (includeIngredients) {
        const ingredients = await getMenuItemIngredients(id);
        return { ...item, ingredients };
    }

    return item;
}

/**
 * Create menu item
 */
export async function createMenuItem(
    input: CreateMenuItemInput,
    actorId: string,
    role: Role
): Promise<MenuItem> {
    logger.info('Creating menu item', { name: input.name, actor: actorId });

    const result = await query(`
    INSERT INTO menu_items (name, category, price, prep_time_estimate, is_taxable)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
        input.name,
        input.category || null,
        input.price,
        input.prepTimeEstimate || null,
        input.isTaxable !== false
    ]);

    const item = mapDbToMenuItem(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'menu_item',
        item.id,
        undefined,
        item as any
    );

    logger.info('Menu item created', { itemId: item.id });

    return item;
}

/**
 * Update menu item
 */
export async function updateMenuItem(
    id: string,
    input: UpdateMenuItemInput,
    actorId: string,
    role: Role
): Promise<MenuItem> {
    const current = await getMenuItemById(id);
    if (!current) {
        throw Errors.notFound('MenuItem', id);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
    }

    if (input.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(input.category);
    }

    if (input.price !== undefined) {
        updates.push(`price = $${paramIndex++}`);
        values.push(input.price);
    }

    if (input.prepTimeEstimate !== undefined) {
        updates.push(`prep_time_estimate = $${paramIndex++}`);
        values.push(input.prepTimeEstimate);
    }

    if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(input.status);
    }

    if (input.isTaxable !== undefined) {
        updates.push(`is_taxable = $${paramIndex++}`);
        values.push(input.isTaxable);
    }

    if (updates.length === 0) {
        return current;
    }

    values.push(id);

    const result = await query(`
    UPDATE menu_items
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values);

    const updated = mapDbToMenuItem(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.UPDATE,
        'menu_item',
        id,
        current as any,
        updated as any
    );

    logger.info('Menu item updated', { itemId: id });

    return updated;
}

/**
 * Get menu item ingredients (staff-only)
 */
export async function getMenuItemIngredients(menuItemId: string): Promise<MenuItemIngredient[]> {
    const result = await query(`
    SELECT 
      mii.id,
      mii.menu_item_id,
      mii.inventory_item_id,
      ii.name as inventory_item_name,
      mii.quantity_required,
      mii.unit,
      mii.is_optional
    FROM menu_item_ingredients mii
    JOIN inventory_items ii ON mii.inventory_item_id = ii.id
    WHERE mii.menu_item_id = $1
    ORDER BY mii.is_optional, ii.name
  `, [menuItemId]);

    return result.rows.map(row => ({
        id: row.id,
        menuItemId: row.menu_item_id,
        inventoryItemId: row.inventory_item_id,
        inventoryItemName: row.inventory_item_name,
        quantityRequired: parseFloat(row.quantity_required),
        unit: row.unit,
        isOptional: row.is_optional
    }));
}

/**
 * Get ingredients for multiple menu items (Batch)
 */
export async function getMenuItemsIngredientsBatch(menuItemIds: string[]): Promise<Map<string, MenuItemIngredient[]>> {
    const result = await query(`
    SELECT 
      mii.id,
      mii.menu_item_id,
      mii.inventory_item_id,
      ii.name as inventory_item_name,
      mii.quantity_required,
      mii.unit,
      mii.is_optional
    FROM menu_item_ingredients mii
    JOIN inventory_items ii ON mii.inventory_item_id = ii.id
    WHERE mii.menu_item_id = ANY($1)
    ORDER BY mii.menu_item_id, mii.is_optional, ii.name
  `, [menuItemIds]);

    const results = new Map<string, MenuItemIngredient[]>();

    // Group by menuItemId
    for (const row of result.rows) {
        const menuItemId = row.menu_item_id;
        const ingredients = results.get(menuItemId) || [];
        ingredients.push({
            id: row.id,
            menuItemId: row.menu_item_id,
            inventoryItemId: row.inventory_item_id,
            inventoryItemName: row.inventory_item_name,
            quantityRequired: parseFloat(row.quantity_required),
            unit: row.unit,
            isOptional: row.is_optional
        });
        results.set(menuItemId, ingredients);
    }

    return results;
}

/**
 * Add ingredient to menu item (staff-only)
 */
export async function addMenuItemIngredient(
    menuItemId: string,
    inventoryItemId: string,
    quantityRequired: number,
    unit: string,
    isOptional: boolean,
    actorId: string,
    role: Role
): Promise<MenuItemIngredient> {
    const result = await query(`
    INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_required, unit, is_optional)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [menuItemId, inventoryItemId, quantityRequired, unit, isOptional]);

    const ingredient = {
        id: result.rows[0].id,
        menuItemId: result.rows[0].menu_item_id,
        inventoryItemId: result.rows[0].inventory_item_id,
        inventoryItemName: '', // Will be populated by getMenuItemIngredients
        quantityRequired: parseFloat(result.rows[0].quantity_required),
        unit: result.rows[0].unit,
        isOptional: result.rows[0].is_optional
    };

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'menu_item_ingredient',
        ingredient.id,
        undefined,
        ingredient as any
    );

    return ingredient;
}

/**
 * Remove ingredient from menu item (staff-only)
 */
export async function removeMenuItemIngredient(
    ingredientId: string,
    actorId: string,
    role: Role
): Promise<void> {
    const result = await query(`
    DELETE FROM menu_item_ingredients
    WHERE id = $1
    RETURNING *
  `, [ingredientId]);

    if (result.rows.length === 0) {
        throw Errors.notFound('MenuItemIngredient', ingredientId);
    }

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.DELETE,
        'menu_item_ingredient',
        ingredientId,
        result.rows[0] as any,
        undefined
    );
}

function mapDbToMenuItem(row: any): MenuItem {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        price: parseFloat(row.price),
        prepTimeEstimate: row.prep_time_estimate,
        status: row.status,
        isTaxable: row.is_taxable,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
