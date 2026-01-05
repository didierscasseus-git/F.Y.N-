/**
 * AI SUGGESTION ROUTES
 * 
 * REST API for AI-powered table state suggestions
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    generateSuggestion,
    getPendingSuggestions,
    reviewSuggestion
} from './suggestionEngine.service';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * POST /api/v1/ai/suggestions/generate/:tableId
 * Generate suggestion for a table
 */
router.post('/suggestions/generate/:tableId',
    requireAuth,
    requirePermission(Permission.VIEW_TABLES),
    async (req: Request, res: Response) => {
        try {
            const suggestion = await generateSuggestion(req.params.tableId);

            if (!suggestion) {
                return res.json({ message: 'No suggestion generated', suggestion: null });
            }

            res.json(suggestion);
        } catch (error) {
            const err = Errors.internal('Failed to generate suggestion');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/ai/suggestions/pending
 * Get all pending suggestions for review
 */
router.get('/suggestions/pending',
    requireAuth,
    requirePermission(Permission.UPDATE_TABLE_STATE),
    async (req: Request, res: Response) => {
        try {
            const suggestions = await getPendingSuggestions();

            res.json({ suggestions, count: suggestions.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve pending suggestions');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/ai/suggestions/:id/review
 * Review suggestion (accept/reject)
 */
router.post('/suggestions/:id/review',
    requireAuth,
    requirePermission(Permission.UPDATE_TABLE_STATE),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { accepted } = req.body;

            if (typeof accepted !== 'boolean') {
                const err = Errors.validation('accepted (boolean) is required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const suggestion = await reviewSuggestion(
                req.params.id,
                accepted,
                user.staffId || user.uid
            );

            res.json(suggestion);
        } catch (error) {
            const err = Errors.internal('Failed to review suggestion');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

export { router as aiRoutes };
