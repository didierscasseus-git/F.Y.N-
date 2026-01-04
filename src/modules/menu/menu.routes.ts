import { Router } from 'express';
import * as MenuController from './MenuController';
import { requireAuth } from '../../core/auth/AuthMiddleware';

const router = Router();

// Create (Admin/Manager)
router.post('/', requireAuth(['ADMIN', 'MANAGER']), MenuController.createItem);

// Read (Currently Public/All Staff - let's restrict to Staff/Guest later, but strict for now: All Authenticated)
// Actually requirement implies Kitchen/Expo uses it. Let's allow all authenticated roles.
router.get('/', requireAuth(['ADMIN', 'MANAGER', 'HOST', 'SERVER', 'EXPO', 'KITCHEN', 'GUEST']), MenuController.getMenu);

// Update Status (86) - Kitchen, Expo, Manager, Admin
router.patch('/:id/status', requireAuth(['ADMIN', 'MANAGER', 'KITCHEN', 'EXPO']), MenuController.updateStatus);

export const menuRoutes = router;
