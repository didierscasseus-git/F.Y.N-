/**
 * MENU ROUTES
 * 
 * REST API for menu and ingredients management.
 * PRD Section 5 - Ingredients are staff-only
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission, Role } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    getAllMenuItems,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    getMenuItemIngredients,
    addMenuItemIngredient,
    removeMenuItemIngredient
} from './menu.service';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * GET /api/v1/menu
 * Get all menu items
 */
router.get('/',
    requireAuth,
    requirePermission(Permission.VIEW_MENU),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { includeIngredients } = req.query;

            // Only staff can request ingredients
            const canViewIngredients = [Role.SERVER, Role.KITCHEN, Role.MANAGER, Role.ADMIN].includes(user.role);
            const shouldIncludeIngredients = includeIngredients === 'true' && canViewIngredients;

            const items = await getAllMenuItems(shouldIncludeIngredients);

            res.json({ items, count: items.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve menu');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/menu
 * Create menu item (Manager/Admin only)
 */
router.post('/',
    requireAuth,
    requirePermission(Permission.MANAGE_MENU),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const item = await createMenuItem(req.body, user.staffId || user.uid, user.role);

            res.status(201).json(item);
        } catch (error) {
            const err = Errors.internal('Failed to create menu item');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/menu/:id
 * Get menu item by ID
 */
router.get('/:id',
    requireAuth,
    requirePermission(Permission.VIEW_MENU),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { includeIngredients } = req.query;

            // Only staff can request ingredients
            const canViewIngredients = [Role.SERVER, Role.KITCHEN, Role.MANAGER, Role.ADMIN].includes(user.role);
            const shouldIncludeIngredients = includeIngredients === 'true' && canViewIngredients;

            const item = await getMenuItemById(req.params.id, shouldIncludeIngredients);

            if (!item) {
                const err = Errors.notFound('MenuItem', req.params.id);
                return res.status(err.statusCode).json(err.toJSON());
            }

            res.json(item);
        } catch (error) {
            const err = Errors.internal('Failed to retrieve menu item');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * PUT /api/v1/menu/:id
 * Update menu item (Manager/Admin only)
 */
router.put('/:id',
    requireAuth,
    requirePermission(Permission.MANAGE_MENU),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const item = await updateMenuItem(req.params.id, req.body, user.staffId || user.uid, user.role);

            res.json(item);
        } catch (error) {
            if (error instanceof Error && 'statusCode' in error) {
                const err = error as any;
                return res.status(err.statusCode).json(err.toJSON());
            }
            const err = Errors.internal('Failed to update menu item');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

// =====================================================
// INGREDIENTS ROUTES (STAFF-ONLY)
// =====================================================

/**
 * GET /api/v1/menu/:id/ingredients
 * Get ingredients for menu item (staff-only)
 */
router.get('/:id/ingredients',
    requireAuth,
    requirePermission(Permission.VIEW_MENU_INGREDIENTS),
    async (req: Request, res: Response) => {
        try {
            const ingredients = await getMenuItemIngredients(req.params.id);
            res.json({ ingredients });
        } catch (error) {
            const err = Errors.internal('Failed to get ingredients');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * POST /api/v1/menu/:id/ingredients
 * Add ingredient to menu item (staff-only, Manager/Admin)
 */
router.post('/:id/ingredients',
    requireAuth,
    requirePermission(Permission.MANAGE_MENU),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { inventoryItemId, quantityRequired, unit, isOptional } = req.body;

            const ingredient = await addMenuItemIngredient(
                req.params.id,
                inventoryItemId,
                quantityRequired,
                unit,
                isOptional || false,
                user.staffId || user.uid,
                user.role
            );

            res.status(201).json(ingredient);
        } catch (error) {
            const err = Errors.internal('Failed to add ingredient');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * DELETE /api/v1/menu/:menuId/ingredients/:ingredientId
 * Remove ingredient from menu item (staff-only, Manager/Admin)
 */
router.delete('/:menuId/ingredients/:ingredientId',
    requireAuth,
    requirePermission(Permission.MANAGE_MENU),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            await removeMenuItemIngredient(req.params.ingredientId, user.staffId || user.uid, user.role);

            res.status(204).send();
        } catch (error) {
            const err = error as any;
            res.status(err.statusCode || 500).json(err.toJSON ? err.toJSON() : { error: 'Failed to remove ingredient' });
        }
    }
);

export { router as menuRoutes };
