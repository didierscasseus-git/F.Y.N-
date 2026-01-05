/**
 * EIGHTY-SIX ENGINE ROUTES
 * 
 * REST API for 86 trigger detection and confirmation
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    scanForTriggers,
    getPending86Suggestions,
    confirm86Suggestion,
    reject86Suggestion,
    canOrderMenuItem
} from './eightySixEngine.service';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * POST /api/v1/inventory/86-engine/scan
 * Scan for 86 triggers (Kitchen/Manager/Admin)
 */
router.post('/86-engine/scan',
    requireAuth,
    requirePermission(Permission.MANAGE_86_EVENTS),
    async (req: Request, res: Response) => {
        try {
            const suggestions = await scanForTriggers();

            res.json({
                message: 'Scan complete',
                suggestions,
                count: suggestions.length
            });
        } catch (error) {
            const err = Errors.internal('Failed to scan for 86 triggers');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/inventory/86-engine/pending
 * Get pending 86 suggestions
 */
router.get('/86-engine/pending',
    requireAuth,
    requirePermission(Permission.MANAGE_86_EVENTS),
    async (req: Request, res: Response) => {
        try {
            const suggestions = await getPending86Suggestions();

            res.json({ suggestions, count: suggestions.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve pending suggestions');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/inventory/86-engine/:id/confirm
 * Confirm 86 suggestion (creates 86 event)
 */
router.post('/86-engine/:id/confirm',
    requireAuth,
    requirePermission(Permission.MANAGE_86_EVENTS),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            await confirm86Suggestion(req.params.id, user.staffId || user.uid, user.role);

            res.json({ message: '86 event created successfully' });
        } catch (error) {
            const err = error instanceof Error
                ? Errors.internal(error.message)
                : Errors.internal('Failed to confirm 86 suggestion');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/inventory/86-engine/:id/reject
 * Reject 86 suggestion
 */
router.post('/86-engine/:id/reject',
    requireAuth,
    requirePermission(Permission.MANAGE_86_EVENTS),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            await reject86Suggestion(req.params.id, user.staffId || user.uid);

            res.json({ message: '86 suggestion rejected' });
        } catch (error) {
            const err = Errors.internal('Failed to reject 86 suggestion');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/inventory/86-engine/can-order/:menuItemId
 * Check if menu item can be ordered (POS integration)
 */
router.get('/86-engine/can-order/:menuItemId',
    requireAuth,
    requirePermission(Permission.VIEW_MENU),
    async (req: Request, res: Response) => {
        try {
            const result = await canOrderMenuItem(req.params.menuItemId);

            res.json(result);
        } catch (error) {
            const err = Errors.internal('Failed to check order availability');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

export { router as eightySixEngineRoutes };
