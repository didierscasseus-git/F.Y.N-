/**
 * TABLE ROUTES
 * 
 * REST API for table management with role-based state control
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { Permission } from '../../core/auth/rbac';
import { requirePermission } from '../../core/auth/permissions';
import {
    createTable,
    getTableById,
    getAllTables,
    getTablesByState,
    updateTableState,
    getTableStateHistory,
    getAvailableTablesForCapacity,
    TableState
} from './table.service';
import { Errors } from '../../core/errors/StandardError';

const router = express.Router();

/**
 * POST /api/v1/tables
 * Create table (Manager/Admin only)
 */
router.post('/',
    requireAuth,
    requirePermission(Permission.OVERRIDE_TABLE_STATE),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const table = await createTable(req.body, user.staffId || user.uid, user.role);

            res.status(201).json(table);
        } catch (error) {
            const err = Errors.internal('Failed to create table');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/tables
 * Get all tables or filter by state
 */
router.get('/',
    requireAuth,
    requirePermission(Permission.VIEW_TABLES),
    async (req: Request, res: Response) => {
        try {
            const { state, minCapacity } = req.query;

            let tables;
            if (state) {
                tables = await getTablesByState(state as TableState);
            } else if (minCapacity) {
                tables = await getAvailableTablesForCapacity(parseInt(minCapacity as string, 10));
            } else {
                tables = await getAllTables();
            }

            res.json({ tables, count: tables.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve tables');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/tables/:id
 * Get table by ID
 */
router.get('/:id',
    requireAuth,
    requirePermission(Permission.VIEW_TABLES),
    async (req: Request, res: Response) => {
        try {
            const table = await getTableById(req.params.id);

            if (!table) {
                const err = Errors.notFound('Table', req.params.id);
                return res.status(err.statusCode).json(err.toJSON());
            }

            res.json(table);
        } catch (error) {
            const err = Errors.internal('Failed to retrieve table');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * PUT /api/v1/tables/:id/state
 * Update table state (role-based)
 */
router.put('/:id/state',
    requireAuth,
    requirePermission(Permission.UPDATE_TABLE_STATE),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { state, reservationId } = req.body;

            if (!state) {
                const err = Errors.validation('state is required');
                return res.status(err.statusCode).json(err.toJSON());
            }

            const table = await updateTableState(
                req.params.id,
                state,
                user.staffId || user.uid,
                user.role,
                reservationId
            );

            res.json(table);
        } catch (error) {
            if (error instanceof Error && 'statusCode' in error) {
                const err = error as any;
                return res.status(err.statusCode).json(err.toJSON());
            }
            const err = Errors.internal('Failed to update table state');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

/**
 * GET /api/v1/tables/:id/history
 * Get table state history
 */
router.get('/:id/history',
    requireAuth,
    requirePermission(Permission.VIEW_TABLES),
    async (req: Request, res: Response) => {
        try {
            const events = await getTableStateHistory(req.params.id);

            res.json({ events, count: events.length });
        } catch (error) {
            const err = Errors.internal('Failed to retrieve table history');
            res.status(err.statusCode).json(err.toJSON());
        }
    }
);

export { router as tableRoutes };
