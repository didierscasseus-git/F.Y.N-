import { Router } from 'express';
import * as TableController from './TableController';
import { requireAuth } from '../../core/auth/AuthMiddleware';

const router = Router();

// Create (Admin/Manager)
router.post('/', requireAuth(['ADMIN', 'MANAGER']), TableController.createTable);

// Read (All Staff)
router.get('/', requireAuth(['ADMIN', 'MANAGER', 'HOST', 'SERVER', 'EXPO', 'KITCHEN']), TableController.getTables);

// Update Status (Host, Server, Manager)
router.patch('/:id/status', requireAuth(['ADMIN', 'MANAGER', 'HOST', 'SERVER']), TableController.updateStatus);

export const tableRoutes = router;
