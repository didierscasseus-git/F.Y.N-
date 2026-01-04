import { Router } from 'express';
import * as OrderController from './OrderController';
import { requireAuth } from '../../core/auth/AuthMiddleware';

const router = Router();

// Create Order (Server/Manager/Admin)
router.post('/', requireAuth(['SERVER', 'MANAGER', 'ADMIN']), OrderController.createOrder); // Host? maybe.

// Add Item
router.post('/:id/items', requireAuth(['SERVER', 'MANAGER', 'ADMIN']), OrderController.addItem);

// Fire Order
router.post('/:id/fire', requireAuth(['SERVER', 'MANAGER', 'ADMIN']), OrderController.fireOrder);

// Get Order
router.get('/:id', requireAuth(['SERVER', 'MANAGER', 'ADMIN', 'KITCHEN', 'EXPO']), OrderController.getOrder);

export const orderRoutes = router;
