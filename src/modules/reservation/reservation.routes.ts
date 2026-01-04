import { Router } from 'express';
import { ReservationController } from './ReservationController';
import { requireAuth } from '../../core/auth/AuthMiddleware';

const router = Router();

// GET /:id -> Anyone authenticated (RBAC check in service)
router.get('/:id',
    requireAuth(['HOST', 'SERVER', 'MANAGER', 'ADMIN', 'GUEST']),
    ReservationController.getOne
);

// POST / -> Create new reservation
router.post('/',
    requireAuth(['HOST', 'MANAGER', 'GUEST']), // Guest can book self
    ReservationController.create
);

// POST /:id/check-in -> Host check-in
router.post('/:id/check-in',
    requireAuth(['HOST', 'MANAGER', 'ADMIN']),
    ReservationController.checkIn
);

export const reservationRoutes = router;
