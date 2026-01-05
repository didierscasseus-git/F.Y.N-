/**
 * INVENTORY ROUTES
 * 
 * REST API for inventory and 86 event management
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    createInventoryItem,
    getInventoryItemById,
    getAllInventoryItems,
    getLowStockItems,
    adjustInventory,
    getAdjustmentHistory,
    create86Event,
    resolve86Event,
    getActive86Events
} from './inventory.service';
import { eightySixEngineRoutes } from './eightySixEngine.routes';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

// Mount 86 engine routes
router.use('/', eightySixEngineRoutes);

// =====================================================
// INVENTORY ITEMS
// =====================================================

/**
 * POST /api/v1/inventory
 * Create inventory item (Manager/Admin)
 */
router.post('/',
    requireAuth,
    requirePermission(Permission.MANAGE_INVENTORY),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const item = await createInventoryItem(req.body, user.staffId || user.uid, user.role);

            res.status(201).json(item);
        } catch (error) {
            const err = Errors.internal('Failed to create inventory item');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/inventory
 * Get all inventory items or filter low stock
 */
router.get('/',
    requireAuth,
    requirePermission(Permission.MANAGE_INVENTORY),
    async (req: Request, res: Response) => {
        try {
            const { lowStock } = req.query;

            const items = lowStock === 'true'
                ? await getLowStockItems()
                : await getAllInventoryItems();

            res.json({ items, count: items.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve inventory');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/inventory/:id
 * Get inventory item by ID
 */
router.get('/:id',
    requireAuth,
    requirePermission(Permission.MANAGE_INVENTORY),
    async (req: Request, res: Response) => {
        try {
            const item = await getInventoryItemById(req.params.id);

            if (!item) {
                const err = Errors.notFound('InventoryItem', req.params.id);
                return res.status(err.statusCode).json(err.toJSON());
            }

            res.json(item);
        } catch (error) {
            const err = Errors.internal('Failed to retrieve inventory item');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/inventory/:id/adjust
 * Adjust inventory quantity
 */
router.post('/:id/adjust',
    requireAuth,
    requirePermission(Permission.MANAGE_INVENTORY),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const item = await adjustInventory(
                req.params.id,
                req.body,
                user.staffId || user.uid,
                user.role
            );

            res.json(item);
        } catch (error) {
            if (error instanceof Error && 'statusCode' in error) {
                const err = error as any;
                return res.status(err.statusCode).json(err.toJSON());
            }
            const err = Errors.internal('Failed to adjust inventory');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/inventory/:id/history
 * Get adjustment history
 */
router.get('/:id/history',
    requireAuth,
    requirePermission(Permission.MANAGE_INVENTORY),
    async (req: Request, res: Response) => {
        try {
            const adjustments = await getAdjustmentHistory(req.params.id);

            res.json({ adjustments, count: adjustments.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve adjustment history');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

// =====================================================
// 86 EVENTS
// =====================================================

/**
 * POST /api/v1/inventory/86
 * Create 86 event (Kitchen/Manager/Admin)
 */
router.post('/86',
    requireAuth,
    requirePermission(Permission.MANAGE_86_EVENTS),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { menuItemId, reason } = req.body;

            if (!menuItemId || !reason) {
                const err = Errors.validation('menuItemId and reason are required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const event = await create86Event(
                menuItemId,
                reason,
                user.staffId || user.uid,
                user.role
            );

            res.status(201).json(event);
        } catch (error) {
            const err = Errors.internal('Failed to create 86 event');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/inventory/86/active
 * Get active 86 events
 */
router.get('/86/active',
    requireAuth,
    requirePermission(Permission.VIEW_MENU),
    async (req: Request, res: Response) => {
        try {
            const events = await getActive86Events();

            res.json({ events, count: events.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve 86 events');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/inventory/86/:id/resolve
 * Resolve 86 event
 */
router.post('/86/:id/resolve',
    requireAuth,
    requirePermission(Permission.MANAGE_86_EVENTS),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const event = await resolve86Event(req.params.id, user.staffId || user.uid, user.role);

            res.json(event);
        } catch (error) {
            if (error instanceof Error && 'statusCode' in error) {
                const err = error as any;
                return res.status(err.statusCode).json(err.toJSON());
            }
            const err = Errors.internal('Failed to resolve 86 event');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

export { router as inventoryRoutes };
