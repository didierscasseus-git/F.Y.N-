/**
 * 86 ANALYTICS ROUTES
 * 
 * REST API for 86 analytics (Manager/Admin only)
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    get86Metrics,
    get86EventHistory,
    getSuggestionPerformance
} from './eightySixAnalytics.service';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * GET /api/v1/analytics/86/metrics
 * Get 86 metrics for date range (Manager/Admin only)
 */
router.get('/86/metrics',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_ANALYTICS),
    async (req: Request, res: Response) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                const err = Errors.validation('startDate and endDate are required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const metrics = await get86Metrics({
                startDate: new Date(startDate as string),
                endDate: new Date(endDate as string)
            });

            res.json(metrics);
        } catch (error) {
            const err = Errors.internal('Failed to calculate 86 metrics');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/analytics/86/history
 * Get 86 event history (Manager/Admin only)
 */
router.get('/86/history',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_ANALYTICS),
    async (req: Request, res: Response) => {
        try {
            const { startDate, endDate, limit } = req.query;

            if (!startDate || !endDate) {
                const err = Errors.validation('startDate and endDate are required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const events = await get86EventHistory(
                {
                    startDate: new Date(startDate as string),
                    endDate: new Date(endDate as string)
                },
                limit ? parseInt(limit as string, 10) : 50
            );

            res.json({ events, count: events.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve 86 history');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/analytics/86/suggestions
 * Get suggestion performance metrics (Manager/Admin only)
 */
router.get('/86/suggestions',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_ANALYTICS),
    async (req: Request, res: Response) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                const err = Errors.validation('startDate and endDate are required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const performance = await getSuggestionPerformance({
                startDate: new Date(startDate as string),
                endDate: new Date(endDate as string)
            });

            res.json(performance);
        } catch (error) {
            const err = Errors.internal('Failed to retrieve suggestion performance');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

export { router as eightySixAnalyticsRoutes };
