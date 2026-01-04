import { Request, Response, NextFunction } from 'express';
import { OrderService } from './OrderService';

const orderService = new OrderService();

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const role = req.headers['x-role'] as any;
        const { tableId, guestId } = req.body;

        const order = await orderService.createOrder(tableId, guestId, role, userId);
        res.status(201).json({ status: 'success', data: order });
    } catch (error) {
        next(error);
    }
};

export const addItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params; // Order ID
        const { menuItemId, quantity, notes } = req.body;
        const userId = req.headers['x-user-id'] as string;
        const role = req.headers['x-role'] as any;

        const order = await orderService.addItem(id, menuItemId, quantity || 1, notes, role, userId);
        res.status(200).json({ status: 'success', data: order });
    } catch (error) {
        next(error);
    }
};

export const fireOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'] as string;
        const role = req.headers['x-role'] as any;

        const order = await orderService.fireOrder(id, role, userId);
        res.status(200).json({ status: 'success', data: order });
    } catch (error) {
        next(error);
    }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const order = await orderService.getOrder(id);
        res.status(200).json({ status: 'success', data: order });
    } catch (error) {
        next(error);
    }
};
