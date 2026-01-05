/**
 * TABLE SERVICE
 * 
 * Table management with state tracking and role-based transitions.
 * PRD Section 8 - Table Management
 */

import { query } from '../../core/connectors/postgres';
import { logMutation, AuditAction, AuditSource } from '../../core/audit';
import { Role, getAllowedTableStates } from '../../core/auth/rbac';
import { Errors } from '../../core/errors/StandardError';
import { createLogger } from '../../core/logger';
import { createPublisher } from '../../core/connectors/pubsub';

const logger = createLogger('TABLE_SERVICE');
const publisher = createPublisher('table.events');

export type TableState =
    | 'AVAILABLE'
    | 'RESERVED'
    | 'SEATED'
    | 'ORDERED'
    | 'FOOD_IN_PROGRESS'
    | 'FOOD_SERVED'
    | 'PAYING'
    | 'CLEANING'
    | 'OUT_OF_SERVICE';

export interface Table {
    id: string;
    number: string;
    capacity: number;
    currentState: TableState;
    currentReservationId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TableStateEvent {
    id: string;
    tableId: string;
    fromState?: TableState;
    toState: TableState;
    actorId: string;
    actorRole: Role;
    timestamp: Date;
}

export interface CreateTableInput {
    number: string;
    capacity: number;
}

/**
 * Create table
 */
export async function createTable(
    input: CreateTableInput,
    actorId: string,
    role: Role
): Promise<Table> {
    logger.info('Creating table', { number: input.number, actor: actorId });

    const result = await query(`
    INSERT INTO tables (number, capacity)
    VALUES ($1, $2)
    RETURNING *
  `, [input.number, input.capacity]);

    const table = mapDbToTable(result.rows[0]);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.CREATE,
        'table',
        table.id,
        undefined,
        table as any
    );

    logger.info('Table created', { tableId: table.id });

    // Publish event
    await publisher.publish(table, { eventType: 'TABLE_CREATED' });

    return table;
}

/**
 * Get table by ID
 */
export async function getTableById(id: string): Promise<Table | null> {
    const result = await query(`
    SELECT * FROM tables WHERE id = $1
  `, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    return mapDbToTable(result.rows[0]);
}

/**
 * Get all tables
 */
export async function getAllTables(): Promise<Table[]> {
    const result = await query(`
    SELECT * FROM tables
    ORDER BY number
  `);

    return result.rows.map(mapDbToTable);
}

/**
 * Get tables by state
 */
export async function getTablesByState(state: TableState): Promise<Table[]> {
    const result = await query(`
    SELECT * FROM tables
    WHERE current_state = $1
    ORDER BY number
  `, [state]);

    return result.rows.map(mapDbToTable);
}

/**
 * Update table state with role validation
 */
export async function updateTableState(
    tableId: string,
    newState: TableState,
    actorId: string,
    role: Role,
    reservationId?: string
): Promise<Table> {
    const table = await getTableById(tableId);
    if (!table) {
        throw Errors.notFound('Table', tableId);
    }

    // Check if role can set this state
    const allowedStates = getAllowedTableStates(role);
    if (!allowedStates.includes(newState)) {
        throw Errors.forbidden(`Role ${role} cannot set table state to ${newState}`);
    }

    // State machine validation (P1 Fix)
    const oldState = table.currentState;
    validateStateTransition(oldState, newState);

    // Update table
    const result = await query(`
    UPDATE tables
    SET current_state = $1,
        current_reservation_id = $2
    WHERE id = $3
    RETURNING *
  `, [newState, reservationId || null, tableId]);

    const updated = mapDbToTable(result.rows[0]);

    // Create state event
    await createStateEvent(tableId, oldState, newState, actorId, role);

    // Audit log
    await logMutation(
        actorId,
        role,
        AuditSource.MANUAL,
        AuditAction.UPDATE,
        'table',
        tableId,
        table as any,
        updated as any
    );

    logger.info('Table state updated', {
        tableId,
        fromState: oldState,
        toState: newState,
        actor: actorId
    });

    // Publish event
    await publisher.publish(updated, {
        eventType: 'TABLE_STATE_UPDATED',
        fromState: oldState,
        toState: newState
    });

    return updated;
}

/**
 * Validate table state transitions
 */
function validateStateTransition(from: TableState, to: TableState): void {
    if (from === to) return;

    const transitions: Record<TableState, TableState[]> = {
        'AVAILABLE': ['RESERVED', 'SEATED', 'OUT_OF_SERVICE'],
        'RESERVED': ['AVAILABLE', 'SEATED', 'OUT_OF_SERVICE'],
        'SEATED': ['ORDERED', 'OUT_OF_SERVICE', 'AVAILABLE'], // AVAILABLE if mistake
        'ORDERED': ['FOOD_IN_PROGRESS', 'OUT_OF_SERVICE'],
        'FOOD_IN_PROGRESS': ['FOOD_SERVED', 'OUT_OF_SERVICE'],
        'FOOD_SERVED': ['PAYING', 'OUT_OF_SERVICE'],
        'PAYING': ['CLEANING', 'OUT_OF_SERVICE'],
        'CLEANING': ['AVAILABLE', 'OUT_OF_SERVICE'],
        'OUT_OF_SERVICE': ['CLEANING', 'AVAILABLE']
    };

    const allowed = transitions[from] || [];
    if (!allowed.includes(to)) {
        throw Errors.validation(`Invalid table state transition from ${from} to ${to}`);
    }
}

/**
 * Create table state event
 */
async function createStateEvent(
    tableId: string,
    fromState: TableState | undefined,
    toState: TableState,
    actorId: string,
    actorRole: Role
): Promise<void> {
    await query(`
    INSERT INTO table_state_events (table_id, from_state, to_state, actor_id, actor_role)
    VALUES ($1, $2, $3, $4, $5)
  `, [tableId, fromState || null, toState, actorId, actorRole]);
}

/**
 * Get table state history
 */
export async function getTableStateHistory(tableId: string): Promise<TableStateEvent[]> {
    const result = await query(`
    SELECT * FROM table_state_events
    WHERE table_id = $1
    ORDER BY timestamp DESC
  `, [tableId]);

    return result.rows.map(row => ({
        id: row.id,
        tableId: row.table_id,
        fromState: row.from_state,
        toState: row.to_state,
        actorId: row.actor_id,
        actorRole: row.actor_role,
        timestamp: new Date(row.timestamp)
    }));
}

/**
 * Get available tables for capacity
 */
export async function getAvailableTablesForCapacity(minCapacity: number): Promise<Table[]> {
    const result = await query(`
    SELECT * FROM tables
    WHERE current_state = 'AVAILABLE'
      AND capacity >= $1
    ORDER BY capacity, number
  `, [minCapacity]);

    return result.rows.map(mapDbToTable);
}

function mapDbToTable(row: any): Table {
    return {
        id: row.id,
        number: row.number,
        capacity: row.capacity,
        currentState: row.current_state,
        currentReservationId: row.current_reservation_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
