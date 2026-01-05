import { Router } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import { requirePermission } from '../../core/auth/permissions';
import { Permission } from '../../core/auth/rbac';
import * as ArService from './ar.service';

const router = Router();

// =====================================================
// ANCHORS (Mapping Tables to World)
// =====================================================

// Create/Update Anchor
router.post('/anchors',
    requireAuth,
    requirePermission(Permission.MANAGE_AR),
    async (req, res, next) => {
        try {
            const user = (req as any).user;
            const anchor = await ArService.createAnchor(
                req.body,
                user.staffId || user.uid,
                user.role
            );
            res.status(201).json(anchor);
        } catch (e) { next(e); }
    }
);

// Get Anchors
router.get('/anchors',
    requireAuth,
    async (req, res, next) => {
        try {
            const { tableId } = req.query;
            if (tableId) {
                res.json(await ArService.getAnchorsByTable(tableId as string));
            } else {
                res.json(await ArService.getAnchors());
            }
        } catch (e) { next(e); }
    });

// =====================================================
// MODELS (3D Assets)
// =====================================================

// Upload Model Metadata
router.post('/models',
    requireAuth,
    requirePermission(Permission.MANAGE_AR),
    async (req, res, next) => {
        try {
            const user = (req as any).user;
            const model = await ArService.saveModel(
                req.body,
                user.staffId || user.uid,
                user.role
            );
            res.status(201).json(model);
        } catch (e) { next(e); }
    }
);

// List Models
router.get('/models',
    requireAuth,
    requirePermission(Permission.VIEW_AR_MODELS),
    async (req, res, next) => {
        try {
            res.json(await ArService.getModels());
        } catch (e) { next(e); }
    }
);

export const arRoutes = router;
export const initArService = ArService.initArService;
