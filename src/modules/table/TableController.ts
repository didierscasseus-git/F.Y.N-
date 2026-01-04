import { Request, Response, NextFunction } from 'express';
import { TableService } from './TableService';

const tableService = new TableService();

export const createTable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const role = req.headers['x-role'] as any;

        const table = await tableService.createTable(req.body, role, userId);
        res.status(201).json({ status: 'success', data: table });
    } catch (error) {
        next(error);
    }
};

export const getTables = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tables = await tableService.getTables();
        res.status(200).json({ status: 'success', data: tables });
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

        const table = await tableService.updateStatus(id, status, role, userId, reason);
        res.status(200).json({ status: 'success', data: table });
    } catch (error) {
        next(error);
    }
};
