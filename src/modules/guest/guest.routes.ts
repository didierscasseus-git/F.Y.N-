/**
 * GUEST ROUTES
 * 
 * REST API for guest profile management
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    createGuest,
    getGuestById,
    searchGuests,
    updateGuest,
    deleteGuest
} from './guest.service';
import {
    getGuestPreferences,
    addGuestPreference,
    deleteGuestPreference
} from './preferences.service';
import {
    getGuestAllergies,
    addGuestAllergy,
    updateGuestAllergy,
    deleteGuestAllergy
} from './allergies.service';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * POST /api/v1/guests
 * Create a new guest profile
 */
router.post('/',
    requireAuth,
    requirePermission(Permission.CREATE_GUEST_PROFILE),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const guest = await createGuest(req.body, user.staffId || user.uid, user.role);
            res.status(201).json(guest);
        } catch (error) {
            const err = error instanceof Error ? Errors.internal((error as Error).message) : Errors.internal('Failed to create guest');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/guests/search
 * Search for guests
 */
router.get('/search',
    requireAuth,
    requirePermission(Permission.VIEW_GUEST_PROFILE),
    async (req: Request, res: Response) => {
        try {
            const { q, limit } = req.query;

            if (!q) {
                const err = Errors.validation('Search query required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const guests = await searchGuests(
                q as string,
                limit ? parseInt(limit as string, 10) : 50
            );

            res.json({ guests, count: guests.length });
        } catch (error) {
            const err = Errors.internal('Search failed');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/guests/:id
 * Get guest by ID
 */
router.get('/:id',
    requireAuth,
    requirePermission(Permission.VIEW_GUEST_PROFILE),
    async (req: Request, res: Response) => {
        try {
            const guest = await getGuestById(req.params.id);

            if (!guest) {
                const err = Errors.notFound('Guest', req.params.id);
                return res.status(err.statusCode).json(err.toJSON());
            }

            res.json(guest);
        } catch (error) {
            const err = Errors.internal('Failed to retrieve guest');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * PUT /api/v1/guests/:id
 * Update guest profile
 */
router.put('/:id',
    requireAuth,
    requirePermission(Permission.UPDATE_GUEST_PROFILE),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const guest = await updateGuest(
                req.params.id,
                req.body,
                user.staffId || user.uid,
                user.role
            );

            res.json(guest);
        } catch (error) {
            if (error instanceof Error && 'statusCode' in error) {
                const err = error as any;
                return res.status(err.statusCode).json(err.toJSON());
            }
            const err = Errors.internal('Failed to update guest');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * DELETE /api/v1/guests/:id
 * Soft delete guest profile (Manager/Admin only)
 */
router.delete('/:id',
    requireAuth,
    requirePermission(Permission.DELETE_GUEST_PROFILE),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            await deleteGuest(req.params.id, user.staffId || user.uid, user.role);

            res.status(204).send();
        } catch (error) {
            if (error instanceof Error && 'statusCode' in error) {
                const err = error as any;
                return res.status(err.statusCode).json(err.toJSON());
            }
            const err = Errors.internal('Failed to delete guest');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

// =====================================================
// PREFERENCES ROUTES
// =====================================================

/**
 * GET /api/v1/guests/:id/preferences
 */
router.get('/:id/preferences',
    requireAuth,
    requirePermission(Permission.VIEW_GUEST_PROFILE),
    async (req: Request, res: Response) => {
        try {
            const preferences = await getGuestPreferences(req.params.id);
            res.json({ preferences });
        } catch (error) {
            const err = Errors.internal('Failed to get preferences');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/guests/:id/preferences
 */
router.post('/:id/preferences',
    requireAuth,
    requirePermission(Permission.UPDATE_GUEST_PROFILE),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const preference = await addGuestPreference(
                req.params.id,
                req.body,
                user.staffId || user.uid,
                user.role
            );
            res.status(201).json(preference);
        } catch (error) {
            const err = Errors.internal('Failed to add preference');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * DELETE /api/v1/guests/:guestId/preferences/:preferenceId
 */
router.delete('/:guestId/preferences/:preferenceId',
    requireAuth,
    requirePermission(Permission.UPDATE_GUEST_PROFILE),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            await deleteGuestPreference(
                req.params.preferenceId,
                user.staffId || user.uid,
                user.role
            );
            res.status(204).send();
        } catch (error) {
            const err = error as any;
            res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: 'Failed to delete preference' });
        }
    }
);

// =====================================================
// ALLERGIES ROUTES
// =====================================================

/**
 * GET /api/v1/guests/:id/allergies
 */
router.get('/:id/allergies',
    requireAuth,
    requirePermission(Permission.VIEW_GUEST_ALLERGIES),
    async (req: Request, res: Response) => {
        try {
            const allergies = await getGuestAllergies(req.params.id);
            res.json({ allergies });
        } catch (error) {
            const err = Errors.internal('Failed to get allergies');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/guests/:id/allergies
 */
router.post('/:id/allergies',
    requireAuth,
    requirePermission(Permission.MANAGE_GUEST_ALLERGIES),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const allergy = await addGuestAllergy(
                req.params.id,
                req.body,
                user.staffId || user.uid,
                user.role
            );
            res.status(201).json(allergy);
        } catch (error) {
            const err = Errors.internal('Failed to add allergy');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * PUT /api/v1/guests/:guestId/allergies/:allergyId
 */
router.put('/:guestId/allergies/:allergyId',
    requireAuth,
    requirePermission(Permission.MANAGE_GUEST_ALLERGIES),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const allergy = await updateGuestAllergy(
                req.params.allergyId,
                req.body.severity,
                user.staffId || user.uid,
                user.role
            );
            res.json(allergy);
        } catch (error) {
            const err = error as any;
            res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: 'Failed to update allergy' });
        }
    }
);

/**
 * DELETE /api/v1/guests/:guestId/allergies/:allergyId
 */
router.delete('/:guestId/allergies/:allergyId',
    requireAuth,
    requirePermission(Permission.MANAGE_GUEST_ALLERGIES),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            await deleteGuestAllergy(
                req.params.allergyId,
                user.staffId || user.uid,
                user.role
            );
            res.status(204).send();
        } catch (error) {
            const err = error as any;
            res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: 'Failed to delete allergy' });
        }
    }
);
export { router as guestRoutes };
