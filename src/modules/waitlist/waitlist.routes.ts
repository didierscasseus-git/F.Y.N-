/**
 * WAITLIST ROUTES
 * 
 * REST API for waitlist management
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    addToWaitlist,
    getWaitlistEntryById,
    getCurrentWaitlist,
    getGuestWaitlistEntries,
    updateWaitlistEntry,
    notifyGuest,
    seatGuest,
    cancelWaitlistEntry
} from './waitlist.service';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * POST /api/v1/waitlist
 * Add guest to waitlist
 */
router.post('/',
    requireAuth,
    requirePermission(Permission.MANAGE_WAITLIST),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const entry = await addToWaitlist(req.body, user.staffId || user.uid, user.role);

            res.status(201).json(entry);
        } catch (error) {
            const err = Errors.internal('Failed to add to waitlist');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/waitlist
 * Get current waitlist
 */
router.get('/',
    requireAuth,
    requirePermission(Permission.VIEW_WAITLIST),
    async (req: Request, res: Response) => {
        try {
            const entries = await getCurrentWaitlist();

            res.json({ entries, count: entries.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve waitlist');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/waitlist/:id
 * Get waitlist entry by ID
 */
router.get('/:id',
    requireAuth,
    requirePermission(Permission.VIEW_WAITLIST),
    async (req: Request, res: Response) => {
        try {
            const entry = await getWaitlistEntryById(req.params.id);

            if (!entry) {
                const err = Errors.notFound('WaitlistEntry', req.params.id);
                return res.status(err.statusCode).json(err.toJSON());
            }

            res.json(entry);
        } catch (error) {
            const err = Errors.internal('Failed to retrieve waitlist entry');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/waitlist/guest/:guestId
 * Get waitlist entries for a guest
 */
router.get('/guest/:guestId',
    requireAuth,
    requirePermission(Permission.VIEW_WAITLIST),
    async (req: Request, res: Response) => {
        try {
            const entries = await getGuestWaitlistEntries(req.params.guestId);

            res.json({ entries, count: entries.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve guest waitlist entries');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * PUT /api/v1/waitlist/:id
 * Update waitlist entry
 */
router.put('/:id',
    requireAuth,
    requirePermission(Permission.MANAGE_WAITLIST),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const entry = await updateWaitlistEntry(
                req.params.id,
                req.body,
                user.staffId || user.uid,
                user.role
            );

            res.json(entry);
        } catch (error) {
            if (error instanceof Error && 'statusCode' in error) {
                const err = error as any;
                return res.status(err.statusCode).json(err.toJSON());
            }
            const err = Errors.internal('Failed to update waitlist entry');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/waitlist/:id/notify
 * Notify guest (text/call ready)
 */
router.post('/:id/notify',
    requireAuth,
    requirePermission(Permission.MANAGE_WAITLIST),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const entry = await notifyGuest(req.params.id, user.staffId || user.uid, user.role);

            res.json(entry);
        } catch (error) {
            const err = error as any;
            res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: 'Failed to notify guest' });
        }
    }
);

/**
 * POST /api/v1/waitlist/:id/seat
 * Mark guest as seated
 */
router.post('/:id/seat',
    requireAuth,
    requirePermission(Permission.MANAGE_WAITLIST),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const entry = await seatGuest(req.params.id, user.staffId || user.uid, user.role);

            res.json(entry);
        } catch (error) {
            const err = error as any;
            res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: 'Failed to seat guest' });
        }
    }
);

/**
 * POST /api/v1/waitlist/:id/cancel
 * Cancel waitlist entry
 */
router.post('/:id/cancel',
    requireAuth,
    requirePermission(Permission.MANAGE_WAITLIST),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const entry = await cancelWaitlistEntry(req.params.id, user.staffId || user.uid, user.role);

            res.json(entry);
        } catch (error) {
            const err = error as any;
            res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: 'Failed to cancel waitlist entry' });
        }
    }
);

export { router as waitlistRoutes };
