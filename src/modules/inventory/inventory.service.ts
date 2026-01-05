/**
 * INVENTORY SERVICE
 * 
 * Inventory item and stock management with adjustment tracking.
 * PRD Section 10 - Inventory Management
 */

import { query } from '../../core/connectors/postgres';
import { logMutation, AuditAction, AuditSource } from '../../core/audit';
import { Role } from '../../core/auth/rbac';
import { Errors } from '../../core/errors/StandardError';
import { createLogger } from '../../core/logger';
import { createPublisher } from '../../core/connectors/pubsub';

const logger = createLogger('INVENTORY_SERVICE');
const publisher = createPublisher('inventory.events');

export interface InventoryItem {
    id: string;
    name: string;
    category?: string;
    unit: string;
    currentQuantity: number;
    reorderLevel: number;
    reorderQuantity: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface InventoryAdjustment {
    id: string;
    inventoryItemId: string;
    quantityChange: number;
    reason: string;
    actorId: string;
    timestamp: Date;
}

export interface EightySixEvent {
    id: string;
    menuItemId: string;
    reason: string;
    startedAt: Date;
    resolvedAt?: Date;
    createdBy: string;
}

export interface CreateInventoryItemInput {
    name: string;
    category?: string;
    unit: string;
    currentQuantity: number;
    reorderLevel: number;
    reorderQuantity: number;
}

export interface AdjustmentInput {
    quantityChange: number;
    reason: string;
}

/**
 * Create inventory item
 */
export async function createInventoryItem(
    input: CreateInventoryItemInput,
    actorId: string,
    role: Role
): Promise<InventoryItem> {
    logger.info('Creating inventory item', { name: input.name, actor: actorId });

    const result = await query(`
    INSERT INTO inventory_items (
      name, category, unit, current_quantity, reorder_level, reorder_quantity
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
        input.name,
        input.category || null,
        input.unit,
        input.currentQuantity,
        input.reorderLevel,
        input.reorderQuantity
    ]);

    const item = mapDbToInventoryItem(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'inventory_item',
        item.id,
        undefined,
        item as any
    );

    logger.info('Inventory item created', { itemId: item.id });

    return item;
}

/**
 * Get inventory item by ID
 */
export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
    const result = await query(`
    SELECT * FROM inventory_items WHERE id = $1
  `, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    return mapDbToInventoryItem(result.rows[0]);
}

/**
 * Get all inventory items
 */
export async function getAllInventoryItems(): Promise<InventoryItem[]> {
    const result = await query(`
    SELECT * FROM inventory_items
    ORDER BY name
  `);

    return result.rows.map(mapDbToInventoryItem);
}

/**
 * Get low stock items (below reorder level)
 */
export async function getLowStockItems(): Promise<InventoryItem[]> {
    const result = await query(`
    SELECT * FROM inventory_items
    WHERE current_quantity <= reorder_level
    ORDER BY current_quantity ASC
  `);

    return result.rows.map(mapDbToInventoryItem);
}

/**
 * Adjust inventory quantity
 */
export async function adjustInventory(
    itemId: string,
    adjustment: AdjustmentInput,
    actorId: string,
    role: Role
): Promise<InventoryItem> {
    const item = await getInventoryItemById(itemId);
    if (!item) {
        throw Errors.notFound('InventoryItem', itemId);
    }

    const newQuantity = item.currentQuantity + adjustment.quantityChange;

    if (newQuantity < 0) {
        throw Errors.validation('Adjustment would result in negative inventory');
    }

    // Update inventory
    const result = await query(`
    UPDATE inventory_items
    SET current_quantity = $1
    WHERE id = $2
    RETURNING *
  `, [newQuantity, itemId]);

    const updated = mapDbToInventoryItem(result.rows[0]);

    // Record adjustment
    await query(`
    INSERT INTO inventory_adjustments (inventory_item_id, quantity_change, reason, actor_id)
    VALUES ($1, $2, $3, $4)
  `, [itemId, adjustment.quantityChange, adjustment.reason, actorId]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.UPDATE,
        'inventory_item',
        itemId,
        item as any,
        updated as any
    );

    logger.info('Inventory adjusted', {
        itemId,
        change: adjustment.quantityChange,
        newQuantity
    });

    // Publish update
    await publisher.publish(updated, { eventType: 'INVENTORY_UPDATED' });

    // Check low stock
    if (newQuantity <= item.reorderLevel) {
        await publisher.publish(updated, { eventType: 'INVENTORY_LOW_STOCK', quantity: String(newQuantity) });
    }

    return updated;
}

/**
 * Get adjustment history for item
 */
export async function getAdjustmentHistory(itemId: string): Promise<InventoryAdjustment[]> {
    const result = await query(`
    SELECT * FROM inventory_adjustments
    WHERE inventory_item_id = $1
    ORDER BY timestamp DESC
  `, [itemId]);

    return result.rows.map(row => ({
        id: row.id,
        inventoryItemId: row.inventory_item_id,
        quantityChange: parseFloat(row.quantity_change),
        reason: row.reason,
        actorId: row.actor_id,
        timestamp: new Date(row.timestamp)
    }));
}

/**
 * Create 86 event (item unavailable)
 */
export async function create86Event(
    menuItemId: string,
    reason: string,
    actorId: string,
    role: Role
): Promise<EightySixEvent> {
    logger.info('Creating 86 event', { menuItemId, actor: actorId });

    const result = await query(`
    INSERT INTO eighty_six_events (menu_item_id, reason, created_by)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [menuItemId, reason, actorId]);

    const event = mapDbTo86Event(result.rows[0]);

    // Update menu item status
    await query(`
    UPDATE menu_items
    SET status = 'EIGHTY_SIXED'
    WHERE id = $1
  `, [menuItemId]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'eighty_six_event',
        event.id,
        undefined,
        event as any
    );

    logger.info('86 event created', { eventId: event.id });

    await publisher.publish(event, { eventType: 'EIGHTY_SIX_CREATED' });

    return event;
}

/**
 * Resolve 86 event
 */
export async function resolve86Event(
    eventId: string,
    actorId: string,
    role: Role
): Promise<EightySixEvent> {
    const result = await query(`
    UPDATE eighty_six_events
    SET resolved_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND resolved_at IS NULL
    RETURNING *
  `, [eventId]);

    if (result.rows.length === 0) {
        throw Errors.notFound('EightySixEvent', eventId);
    }

    const event = mapDbTo86Event(result.rows[0]);

    // Update menu item status back to available
    await query(`
    UPDATE menu_items
    SET status = 'AVAILABLE'
    WHERE id = $1
  `, [event.menuItemId]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.UPDATE,
        'eighty_six_event',
        eventId,
        undefined,
        event as any
    );

    logger.info('86 event resolved', { eventId });

    await publisher.publish(event, { eventType: 'EIGHTY_SIX_RESOLVED' });

    return event;
}

/**
 * Get active 86 events
 */
export async function getActive86Events(): Promise<EightySixEvent[]> {
    const result = await query(`
    SELECT * FROM eighty_six_events
    WHERE resolved_at IS NULL
    ORDER BY started_at DESC
  `);

    return result.rows.map(mapDbTo86Event);
}

function mapDbToInventoryItem(row: any): InventoryItem {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        unit: row.unit,
        currentQuantity: parseFloat(row.current_quantity),
        reorderLevel: parseFloat(row.reorder_level),
        reorderQuantity: parseFloat(row.reorder_quantity),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}

function mapDbTo86Event(row: any): EightySixEvent {
    return {
        id: row.id,
        menuItemId: row.menu_item_id,
        reason: row.reason,
        startedAt: new Date(row.started_at),
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
        createdBy: row.created_by
    };
}
