import { Request, Response, NextFunction } from 'express';
import { MenuService } from './MenuService';

const menuService = new MenuService();

export const createItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const role = req.headers['x-role'] as any;

        const item = await menuService.createItem(req.body, role, userId);
        res.status(201).json({ status: 'success', data: item });
    } catch (error) {
        next(error);
    }
};

export const getMenu = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const status = req.query.status as string;
        const items = await menuService.getMenu(status);
        res.status(200).json({ status: 'success', data: items });
    } catch (error) {
        next(error);
    }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const userId = req.headers['x-user-id'] as string;
        const role = req.headers['x-role'] as any;

        const item = await menuService.updateStatus(id, status, reason || 'Manual Update', role, userId);
        res.status(200).json({ status: 'success', data: item });
    } catch (error) {
        next(error);
    }
};
