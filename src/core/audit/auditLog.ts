/**
 * AUDIT LOG SERVICE
 * 
 * Comprehensive audit logging for all system mutations.
 * Append-only, immutable audit trail.
 */

import { query } from '../connectors/postgres';
import { createLogger } from '../logger';
import { Role } from '../auth/rbac';

const logger = createLogger('AUDIT_LOG');

export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    EXPORT = 'EXPORT',
    ACCESS = 'ACCESS'
}

export enum AuditSource {
    MANUAL = 'MANUAL',
    POS = 'POS',
    AI_SUGGESTED = 'AI_SUGGESTED',
    AI_AUTO = 'AI_AUTO',
    SYSTEM = 'SYSTEM'
}

export interface AuditLogEntry {
    actorId?: string;
    role: Role;
    action: AuditAction;
    source: AuditSource;
    targetEntity: string;
    targetId?: string;
    fieldChanges?: Record<string, { old: any; new: any }>;
    reasonCode?: string;
    meta?: Record<string, any>;
    sourceIp?: string;
    userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<string> {
    try {
        const result = await query(`
      INSERT INTO audit_logs (
        actor_id,
        role,
        action,
        target_entity,
        target_id,
        field_changes,
        reason_code,
        meta,
        source_ip,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
            entry.actorId || null,
            entry.role,
            entry.action,
            entry.targetEntity,
            entry.targetId || null,
            entry.fieldChanges ? JSON.stringify(entry.fieldChanges) : null,
            entry.reasonCode || null,
            entry.meta ? JSON.stringify(entry.meta) : null,
            entry.sourceIp || null,
            entry.userAgent || null
        ]);

        const logId = result.rows[0]?.id;

        logger.debug('Audit log created', {
            logId,
            actor: entry.actorId,
            action: entry.action,
            entity: entry.targetEntity
        });

        return logId;
    } catch (error) {
        logger.error('Failed to create audit log', error as Error, {
            entry
        });
        throw error;
    }
}

/**
 * Log a mutation with before/after state
 */
export async function logMutation(
    actorId: string | undefined,
    role: Role,
    source: AuditSource,
    action: AuditAction.CREATE | AuditAction.UPDATE | AuditAction.DELETE,
    entityType: string,
    entityId: string,
    beforeState?: Record<string, any>,
    afterState?: Record<string, any>,
    reasonCode?: string,
    meta?: Record<string, any>
): Promise<string> {
    const fieldChanges: Record<string, { old: any; new: any }> = {};

    // Compute field changes for UPDATE actions
    if (action === AuditAction.UPDATE && beforeState && afterState) {
        for (const key of Object.keys(afterState)) {
            if (JSON.stringify(beforeState[key]) !== JSON.stringify(afterState[key])) {
                fieldChanges[key] = {
                    old: beforeState[key],
                    new: afterState[key]
                };
            }
        }
    }

    return createAuditLog({
        actorId,
        role,
        action,
        source,
        targetEntity: entityType,
        targetId: entityId,
        fieldChanges: Object.keys(fieldChanges).length > 0 ? fieldChanges : undefined,
        reasonCode,
        meta
    });
}

/**
 * Query audit logs (Manager/Admin only)
 */
export interface AuditLogQuery {
    actorId?: string;
    targetEntity?: string;
    targetId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export async function queryAuditLogs(filters: AuditLogQuery) {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.actorId) {
        conditions.push(`actor_id = $${paramIndex}`);
        params.push(filters.actorId);
        paramIndex++;
    }

    if (filters.targetEntity) {
        conditions.push(`target_entity = $${paramIndex}`);
        params.push(filters.targetEntity);
        paramIndex++;
    }

    if (filters.targetId) {
        conditions.push(`target_id = $${paramIndex}`);
        params.push(filters.targetId);
        paramIndex++;
    }

    if (filters.action) {
        conditions.push(`action = $${paramIndex}`);
        params.push(filters.action);
        paramIndex++;
    }

    if (filters.startDate) {
        conditions.push(`timestamp >= $${paramIndex}`);
        params.push(filters.startDate.toISOString());
        paramIndex++;
    }

    if (filters.endDate) {
        conditions.push(`timestamp <= $${paramIndex}`);
        params.push(filters.endDate.toISOString());
        paramIndex++;
    }

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const sql = `
    SELECT 
      id,
      timestamp,
      actor_id,
      role,
      action,
      target_entity,
      target_id,
      field_changes,
      reason_code,
      meta,
      source_ip,
      user_agent
    FROM audit_logs
    WHERE ${conditions.join(' AND ')}
    ORDER BY timestamp DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

    params.push(limit, offset);

    const result = await query(sql, params);

    logger.info('Audit logs queried', {
        filters,
        resultCount: result.rows.length
    });

    return result.rows;
}

/**
 * Get audit log count
 */
export async function getAuditLogCount(filters: AuditLogQuery): Promise<number> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.actorId) {
        conditions.push(`actor_id = $${paramIndex}`);
        params.push(filters.actorId);
        paramIndex++;
    }

    if (filters.targetEntity) {
        conditions.push(`target_entity = $${paramIndex}`);
        params.push(filters.targetEntity);
        paramIndex++;
    }

    if (filters.targetId) {
        conditions.push(`target_id = $${paramIndex}`);
        params.push(filters.targetId);
        paramIndex++;
    }

    const result = await query(`
    SELECT COUNT(*) as count
    FROM audit_logs
    WHERE ${conditions.join(' AND ')}
  `, params);

    return parseInt(result.rows[0]?.count || '0', 10);
}
