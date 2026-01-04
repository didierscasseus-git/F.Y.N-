import { Router } from 'express';
import * as WaitlistController from './WaitlistController';
import { requireAuth } from '../../core/auth/AuthMiddleware';

const router = Router();

// Apply Auth globally or per route
router.post('/', requireAuth(['HOST', 'MANAGER', 'ADMIN']), WaitlistController.addToWaitlist);
router.get('/', requireAuth(['HOST', 'MANAGER', 'ADMIN']), WaitlistController.getWaitlist);
router.post('/:id/notify', requireAuth(['HOST', 'MANAGER', 'ADMIN']), WaitlistController.notifyGuest);
router.post('/:id/leave', requireAuth(['HOST', 'MANAGER', 'ADMIN']), WaitlistController.removeFromWaitlist);

export const waitlistRoutes = router;
