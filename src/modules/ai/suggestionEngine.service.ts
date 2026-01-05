/**
 * TABLE STATUS SUGGESTION ENGINE
 * 
 * AI-powered table state transition suggestions with evidence tracking.
 * MODE: AI_SUGGESTED only (no auto-advance)
 * PRD Section 9 - AI Suggestions
 */

import { query } from '../../core/connectors/postgres';
import { getTableById, TableState } from '../table/table.service';
import { getAllowedTableStates, Role } from '../../core/auth/rbac';
import { AuditSource } from '../../core/audit';
import { createLogger } from '../../core/logger';

const logger = createLogger('SUGGESTION_ENGINE');

export interface TableStateSuggestion {
    id: string;
    tableId: string;
    currentState: TableState;
    suggestedState: TableState;
    confidence: number; // 0-100
    evidence: Evidence[];
    conflictDetected: boolean;
    conflictReason?: string;
    source: AuditSource.AI_SUGGESTED;
    createdAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    accepted: boolean;
}

export interface Evidence {
    type: 'RESERVATION' | 'TIME_THRESHOLD' | 'STAFF_ACTION' | 'POS_EVENT' | 'STATE_HISTORY';
    description: string;
    timestamp: Date;
    weight: number; // 0-100
}

/**
 * Generate table state suggestion
 */
export async function generateSuggestion(tableId: string): Promise<TableStateSuggestion | null> {
    logger.info('Generating state suggestion', { tableId });

    const table = await getTableById(tableId);
    if (!table) {
        logger.warn('Table not found', { tableId });
        return null;
    }

    const currentState = table.currentState;

    // Collect evidence
    const evidence: Evidence[] = [];

    // Check reservation status
    const reservationEvidence = await checkReservationEvidence(tableId);
    if (reservationEvidence) evidence.push(reservationEvidence);

    // Check time thresholds
    const timeEvidence = await checkTimeThresholds(tableId, currentState);
    if (timeEvidence) evidence.push(timeEvidence);

    // Check staff actions
    const staffEvidence = await checkStaffActions(tableId);
    if (staffEvidence) evidence.push(staffEvidence);

    // Check state history patterns
    const historyEvidence = await checkStateHistory(tableId);
    if (historyEvidence) evidence.push(historyEvidence);

    // Check POS evidence
    try {
        const posEvidence = await checkPosEvidence(tableId);
        if (posEvidence) evidence.push(posEvidence);
    } catch (error) {
        logger.error('Failed to check POS evidence', error as Error, { tableId });
    }

    if (evidence.length === 0) {
        logger.debug('No evidence for suggestion', { tableId });
        return null;
    }

    // Determine suggested state based on evidence
    const suggestedState = determineSuggestedState(currentState, evidence);
    if (!suggestedState || suggestedState === currentState) {
        return null;
    }

    // Calculate confidence
    const confidence = calculateConfidence(evidence);

    // Detect conflicts
    const { conflictDetected, conflictReason } = await detectConflicts(tableId, suggestedState);

    // Store suggestion
    const result = await query(`
    INSERT INTO table_state_suggestions (
      table_id, current_state, suggested_state, confidence, 
      evidence, conflict_detected, conflict_reason, source
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
        tableId,
        currentState,
        suggestedState,
        confidence,
        JSON.stringify(evidence),
        conflictDetected,
        conflictReason || null,
        AuditSource.AI_SUGGESTED
    ]);

    const suggestion = mapDbToSuggestion(result.rows[0]);

    logger.info('Suggestion generated', {
        tableId,
        suggestionId: suggestion.id,
        suggestedState,
        confidence,
        conflictDetected
    });

    return suggestion;
}

/**
 * Check reservation evidence
 */
async function checkReservationEvidence(tableId: string): Promise<Evidence | null> {
    const result = await query(`
    SELECT r.*, t.current_reservation_id
    FROM tables t
    LEFT JOIN reservations r ON t.current_reservation_id = r.id
    WHERE t.id = $1
  `, [tableId]);

    if (result.rows.length === 0 || !result.rows[0].current_reservation_id) {
        return null;
    }

    const reservation = result.rows[0];
    const reservationTime = new Date(reservation.reservation_time);
    const now = new Date();

    if (reservation.status === 'ARRIVED' && Math.abs(now.getTime() - reservationTime.getTime()) < 10 * 60 * 1000) {
        return {
            type: 'RESERVATION',
            description: 'Guest arrived for reservation within 10 minutes of reservation time',
            timestamp: now,
            weight: 90
        };
    }

    return null;
}

/**
 * Check time thresholds
 */
async function checkTimeThresholds(tableId: string, currentState: TableState): Promise<Evidence | null> {
    const result = await query(`
    SELECT timestamp, to_state
    FROM table_state_events
    WHERE table_id = $1 AND to_state = $2
    ORDER BY timestamp DESC
    LIMIT 1
  `, [tableId, currentState]);

    if (result.rows.length === 0) {
        return null;
    }

    const stateEntryTime = new Date(result.rows[0].timestamp);
    const now = new Date();
    const minutesInState = (now.getTime() - stateEntryTime.getTime()) / (1000 * 60);

    // Suggest CLEANING after PAYING for 5+ minutes
    if (currentState === 'PAYING' && minutesInState >= 5) {
        return {
            type: 'TIME_THRESHOLD',
            description: `Table has been in PAYING state for ${Math.round(minutesInState)} minutes`,
            timestamp: now,
            weight: 70
        };
    }

    // Suggest AVAILABLE after CLEANING for 10+ minutes
    if (currentState === 'CLEANING' && minutesInState >= 10) {
        return {
            type: 'TIME_THRESHOLD',
            description: `Table has been in CLEANING state for ${Math.round(minutesInState)} minutes`,
            timestamp: now,
            weight: 80
        };
    }

    return null;
}

/**
 * Check staff actions
 */
async function checkStaffActions(tableId: string): Promise<Evidence | null> {
    const result = await query(`
    SELECT action, timestamp
    FROM table_state_events
    WHERE table_id = $1
    ORDER BY timestamp DESC
    LIMIT 5
  `, [tableId]);

    // Pattern analysis would go here
    return null;
}

/**
 * Check POS evidence
 */
async function checkPosEvidence(tableId: string): Promise<Evidence | null> {
    const result = await query(`
    SELECT event_type, timestamp
    FROM pos_events
    WHERE table_id = $1
      AND timestamp > NOW() - INTERVAL '30 minutes'
    ORDER BY timestamp DESC
    LIMIT 1
  `, [tableId]);

    if (result.rows.length === 0) {
        return null;
    }

    const lastEvent = result.rows[0];
    const eventTime = new Date(lastEvent.timestamp);
    const now = new Date();

    if (lastEvent.event_type === 'CHECK_PRINTED') {
        return {
            type: 'POS_EVENT',
            description: 'Check printed in POS',
            timestamp: eventTime,
            weight: 85
        };
    }

    if (lastEvent.event_type === 'CHECK_PAID') {
        return {
            type: 'POS_EVENT',
            description: 'Check paid in POS',
            timestamp: eventTime,
            weight: 95
        };
    }

    if (lastEvent.event_type === 'CHECK_OPENED') {
        return {
            type: 'POS_EVENT',
            description: 'Check opened in POS',
            timestamp: eventTime,
            weight: 80
        };
    }

    return null;
}

/**
 * Check state history patterns
 */
async function checkStateHistory(tableId: string): Promise<Evidence | null> {
    const result = await query(`
    SELECT to_state, timestamp
    FROM table_state_events
    WHERE table_id = $1
    ORDER BY timestamp DESC
    LIMIT 10
  `, [tableId]);

    // Pattern analysis would go here
    return null;
}

/**
 * Determine suggested state based on evidence
 */
function determineSuggestedState(currentState: TableState, evidence: Evidence[]): TableState | null {
    const stateTransitions: Record<TableState, TableState[]> = {
        AVAILABLE: ['RESERVED'],
        RESERVED: ['SEATED'],
        SEATED: ['ORDERED'],
        ORDERED: ['FOOD_IN_PROGRESS'],
        FOOD_IN_PROGRESS: ['FOOD_SERVED'],
        FOOD_SERVED: ['PAYING'],
        PAYING: ['CLEANING'],
        CLEANING: ['AVAILABLE'],
        OUT_OF_SERVICE: []
    };

    const possibleNextStates = stateTransitions[currentState] || [];
    if (possibleNextStates.length === 0) return null;

    // Simple logic: return first valid transition if evidence is strong
    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    if (totalWeight >= 70 && possibleNextStates.length > 0) {
        return possibleNextStates[0];
    }

    return null;
}

/**
 * Calculate confidence score
 */
function calculateConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;

    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    const avgWeight = totalWeight / evidence.length;

    // Boost confidence if multiple evidence sources agree
    const confidenceBoost = Math.min(evidence.length * 10, 30);

    return Math.min(Math.round(avgWeight + confidenceBoost), 100);
}

/**
 * Detect conflicts that would block auto-advance
 */
async function detectConflicts(
    tableId: string,
    suggestedState: TableState
): Promise<{ conflictDetected: boolean; conflictReason?: string }> {
    // Check for recent manual state changes (within 2 minutes)
    const recentManual = await query(`
    SELECT timestamp, actor_role
    FROM table_state_events
    WHERE table_id = $1
      AND timestamp > NOW() - INTERVAL '2 minutes'
    ORDER BY timestamp DESC
    LIMIT 1
  `, [tableId]);

    if (recentManual.rows.length > 0) {
        return {
            conflictDetected: true,
            conflictReason: 'Recent manual state change detected'
        };
    }

    // Check for pending suggestions
    const pendingSuggestions = await query(`
    SELECT id FROM table_state_suggestions
    WHERE table_id = $1
      AND reviewed_at IS NULL
      AND created_at > NOW() - INTERVAL '5 minutes'
  `, [tableId]);

    if (pendingSuggestions.rows.length > 0) {
        return {
            conflictDetected: true,
            conflictReason: 'Pending suggestion already exists'
        };
    }

    return { conflictDetected: false };
}

/**
 * Get pending suggestions for review
 */
export async function getPendingSuggestions(): Promise<TableStateSuggestion[]> {
    const result = await query(`
    SELECT * FROM table_state_suggestions
    WHERE reviewed_at IS NULL
      AND conflict_detected = FALSE
    ORDER BY confidence DESC, created_at ASC
    LIMIT 50
  `);

    return result.rows.map(mapDbToSuggestion);
}

/**
 * Review suggestion (accept/reject)
 */
export async function reviewSuggestion(
    suggestionId: string,
    accepted: boolean,
    reviewerId: string
): Promise<TableStateSuggestion> {
    const result = await query(`
    UPDATE table_state_suggestions
    SET reviewed_at = CURRENT_TIMESTAMP,
        reviewed_by = $1,
        accepted = $2
    WHERE id = $3
    RETURNING *
  `, [reviewerId, accepted, suggestionId]);

    return mapDbToSuggestion(result.rows[0]);
}

function mapDbToSuggestion(row: any): TableStateSuggestion {
    return {
        id: row.id,
        tableId: row.table_id,
        currentState: row.current_state,
        suggestedState: row.suggested_state,
        confidence: row.confidence,
        evidence: JSON.parse(row.evidence || '[]'),
        conflictDetected: row.conflict_detected,
        conflictReason: row.conflict_reason,
        source: row.source,
        createdAt: new Date(row.created_at),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
        reviewedBy: row.reviewed_by,
        accepted: row.accepted
    };
}
