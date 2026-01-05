/**
 * ALLERGY CROSSCHECK ROUTES
 * 
 * API for allergy validation against menu items.
 * Staff-only (Server/Kitchen/Manager/Admin)
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    crosscheckMenuItem,
    crosscheckMenuItems,
    getSafeMenuItems
} from './allergyCrosscheck.service';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * POST /api/v1/safety/crosscheck
 * Check if menu item is safe for guest
 */
router.post('/crosscheck',
    requireAuth,
    requirePermission(Permission.VIEW_GUEST_ALLERGIES),
    async (req: Request, res: Response) => {
        try {
            const { guestId, menuItemId } = req.body;

            if (!guestId || !menuItemId) {
                const err = Errors.validation('guestId and menuItemId are required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const result = await crosscheckMenuItem(guestId, menuItemId);

            res.json(result);
        } catch (error) {
            const err = Errors.internal('Crosscheck failed');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/safety/crosscheck/batch
 * Check multiple menu items for guest
 */
router.post('/crosscheck/batch',
    requireAuth,
    requirePermission(Permission.VIEW_GUEST_ALLERGIES),
    async (req: Request, res: Response) => {
        try {
            const { guestId, menuItemIds } = req.body;

            if (!guestId || !Array.isArray(menuItemIds)) {
                const err = Errors.validation('guestId and menuItemIds array are required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const results = await crosscheckMenuItems(guestId, menuItemIds);

            // Convert Map to object for JSON response
            const resultsObj: Record<string, any> = {};
            results.forEach((value, key) => {
                resultsObj[key] = value;
            });

            res.json(resultsObj);
        } catch (error) {
            const err = Errors.internal('Batch crosscheck failed');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/safety/safe-menu/:guestId
 * Get all safe menu items for guest
 */
router.get('/safe-menu/:guestId',
    requireAuth,
    requirePermission(Permission.VIEW_GUEST_ALLERGIES),
    async (req: Request, res: Response) => {
        try {
            const safeItems = await getSafeMenuItems(req.params.guestId);

            res.json({
                guestId: req.params.guestId,
                safeMenuItemIds: safeItems,
                count: safeItems.length
            });
        } catch (error) {
            const err = Errors.internal('Failed to get safe menu items');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

export { router as safetyRoutes };
