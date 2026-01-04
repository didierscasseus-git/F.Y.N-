import { Router } from 'express';
import { GuestController } from './GuestController';
import { requireAuth } from '../../core/auth/AuthMiddleware';

const router = Router();

// GET /:id -> Accessible by GUEST (self), HOST, SERVER, MANAGER, ADMIN
router.get('/:id',
    requireAuth(['GUEST', 'HOST', 'SERVER', 'MANAGER', 'ADMIN']),
    GuestController.getOne
);

// POST / -> Create Guest (HOST, MANAGER, ADMIN, or GUEST signup)
router.post('/',
    requireAuth(['HOST', 'SERVER', 'MANAGER', 'ADMIN', 'GUEST']),
    GuestController.create
);

// PUT /:id -> Update Guest
router.put('/:id',
    requireAuth(['HOST', 'SERVER', 'MANAGER', 'ADMIN', 'GUEST']),
    GuestController.update
);

export const guestRoutes = router;
