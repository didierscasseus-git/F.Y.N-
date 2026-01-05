/**
 * AUDIT LOG ROUTES
 * 
 * Manager/Admin query endpoints for audit logs
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import { queryAuditLogs, getAuditLogCount, AuditAction } from '../../core/audit';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * GET /audit
 * Query audit logs (Manager/Admin only)
 */
router.get('/',
    requireAuth,
    requirePermission(Permission.VIEW_AUDIT_LOG),
    async (req: Request, res: Response) => {
        try {
            const {
                actorId,
                targetEntity,
                targetId,
                action,
                startDate,
                endDate,
                limit,
                offset
            } = req.query;

            const filters = {
                actorId: actorId as string | undefined,
                targetEntity: targetEntity as string | undefined,
                targetId: targetId as string | undefined,
                action: action as AuditAction | undefined,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                limit: limit ? parseInt(limit as string, 10) : 100,
                offset: offset ? parseInt(offset as string, 10) : 0
            };

            const [logs, total] = await Promise.all([
                queryAuditLogs(filters),
                getAuditLogCount(filters)
            ]);

            res.json({
                data: logs,
                total,
                limit: filters.limit,
                offset: filters.offset
            });
        } catch (error) {
            const err = Errors.internal('Failed to query audit logs');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /audit/entity/:entityType/:entityId
 * Get audit trail for specific entity
 */
router.get('/entity/:entityType/:entityId',
    requireAuth,
    requirePermission(Permission.VIEW_AUDIT_LOG),
    async (req: Request, res: Response) => {
        try {
            const { entityType, entityId } = req.params;
            const { limit, offset } = req.query;

            const logs = await queryAuditLogs({
                targetEntity: entityType,
                targetId: entityId,
                limit: limit ? parseInt(limit as string, 10) : 100,
                offset: offset ? parseInt(offset as string, 10) : 0
            });

            res.json({
                entityType,
                entityId,
                logs
            });
        } catch (error) {
            const err = Errors.internal('Failed to get entity audit trail');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /audit/actor/:actorId
 * Get audit logs for specific actor
 */
router.get('/actor/:actorId',
    requireAuth,
    requirePermission(Permission.VIEW_AUDIT_LOG),
    async (req: Request, res: Response) => {
        try {
            const { actorId } = req.params;
            const { limit, offset } = req.query;

            const logs = await queryAuditLogs({
                actorId,
                limit: limit ? parseInt(limit as string, 10) : 100,
                offset: offset ? parseInt(offset as string, 10) : 0
            });

            res.json({
                actorId,
                logs
            });
        } catch (error) {
            const err = Errors.internal('Failed to get actor audit trail');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

export { router as auditRoutes };
