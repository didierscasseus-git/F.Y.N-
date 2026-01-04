import { Request, Response, NextFunction } from 'express';
import { WaitlistService } from './WaitlistService';
import { AppError } from '../../core/errors/AppError';

const waitlistService = new WaitlistService();

export const addToWaitlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const role = req.headers['x-role'] as any;

        const entry = await waitlistService.addToWaitlist(req.body, role, userId);
        res.status(201).json({ status: 'success', data: entry });
    } catch (error) {
        next(error);
    }
};

export const getWaitlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Optional Status Filter
        const status = req.query.status as string;
        const entries = await waitlistService.getWaitlist(status);
        res.status(200).json({ status: 'success', data: entries });
    } catch (error) {
        next(error);
    }
};

export const notifyGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'] as string;
        const role = req.headers['x-role'] as any;

        const entry = await waitlistService.notifyGuest(id, role, userId);
        res.status(200).json({ status: 'success', data: entry });
    } catch (error) {
        next(error);
    }
};

export const removeFromWaitlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.headers['x-user-id'] as string;
        const role = req.headers['x-role'] as any;

        const entry = await waitlistService.removeFromWaitlist(id, reason || 'MANUAL_REMOVE', role, userId);
        res.status(200).json({ status: 'success', data: entry });
    } catch (error) {
        next(error);
    }
};
