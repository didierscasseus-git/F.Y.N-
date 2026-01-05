/**
 * RESERVATION ROUTES
 * 
 * REST API for reservation management
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    createReservation,
    getReservationById,
    getGuestReservations,
    getReservationsByDateRange,
    updateReservation,
    cancelReservation,
    markArrived,
    markSeated
} from './reservation.service';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * POST /api/v1/reservations
 * Create a new reservation
 */
router.post('/',
    requireAuth,
    requirePermission(Permission.CREATE_RESERVATION),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const reservation = await createReservation(req.body, user.staffId || user.uid, user.role);

            res.status(201).json(reservation);
        } catch (error) {
            const err = Errors.internal('Failed to create reservation');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/reservations/:id
 * Get reservation by ID
 */
router.get('/:id',
    requireAuth,
    requirePermission(Permission.VIEW_RESERVATIONS),
    async (req: Request, res: Response) => {
        try {
            const reservation = await getReservationById(req.params.id);

            if (!reservation) {
                const err = Errors.notFound('Reservation', req.params.id);
                return res.status(err.statusCode).json(err.toJSON());
            }

            res.json(reservation);
        } catch (error) {
            const err = Errors.internal('Failed to retrieve reservation');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/reservations/guest/:guestId
 * Get reservations for a guest
 */
router.get('/guest/:guestId',
    requireAuth,
    requirePermission(Permission.VIEW_RESERVATIONS),
    async (req: Request, res: Response) => {
        try {
            const reservations = await getGuestReservations(req.params.guestId);
            res.json({ reservations, count: reservations.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve guest reservations');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/reservations
 * Get reservations by date range
 */
router.get('/',
    requireAuth,
    requirePermission(Permission.VIEW_RESERVATIONS),
    async (req: Request, res: Response) => {
        try {
            const { startDate, endDate, status } = req.query;

            if (!startDate || !endDate) {
                const err = Errors.validation('startDate and endDate are required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const reservations = await getReservationsByDateRange(
                new Date(startDate as string),
                new Date(endDate as string),
                status as any
            );

            res.json({ reservations, count: reservations.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve reservations');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * PUT /api/v1/reservations/:id
 * Update reservation
 */
router.put('/:id',
    requireAuth,
    requirePermission(Permission.UPDATE_RESERVATION),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const reservation = await updateReservation(
                req.params.id,
                req.body,
                user.staffId || user.uid,
                user.role
            );

            res.json(reservation);
        } catch (error) {
            if (error instanceof Error && 'statusCode' in error) {
                const err = error as any;
                return res.status(err.statusCode).json(err.toJSON());
            }
            const err = Errors.internal('Failed to update reservation');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/reservations/:id/cancel
 * Cancel reservation
 */
router.post('/:id/cancel',
    requireAuth,
    requirePermission(Permission.CANCEL_RESERVATION),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const reservation = await cancelReservation(
                req.params.id,
                user.staffId || user.uid,
                user.role
            );

            res.json(reservation);
        } catch (error) {
            if (error instanceof Error && 'statusCode' in error) {
                const err = error as any;
                return res.status(err.statusCode).json(err.toJSON());
            }
            const err = Errors.internal('Failed to cancel reservation');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/reservations/:id/arrived
 * Mark reservation as arrived (Host)
 */
router.post('/:id/arrived',
    requireAuth,
    requirePermission(Permission.UPDATE_RESERVATION),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const reservation = await markArrived(
                req.params.id,
                user.staffId || user.uid,
                user.role
            );

            res.json(reservation);
        } catch (error) {
            const err = error as any;
            res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: 'Failed to mark arrived' });
        }
    }
);

/**
 * POST /api/v1/reservations/:id/seated
 * Mark reservation as seated (Host)
 */
router.post('/:id/seated',
    requireAuth,
    requirePermission(Permission.UPDATE_RESERVATION),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const reservation = await markSeated(
                req.params.id,
                user.staffId || user.uid,
                user.role
            );

            res.json(reservation);
        } catch (error) {
            const err = error as any;
            res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: 'Failed to mark seated' });
        }
    }
);

export { router as reservationRoutes };
