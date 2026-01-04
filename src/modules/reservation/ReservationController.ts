import { Request, Response, NextFunction } from 'express';
import { ReservationService } from './ReservationService';

const reservationService = new ReservationService();

export class ReservationController {

    static async getOne(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = req.user!;
            const item = await reservationService.get(id, user.role, user.id);
            res.json({ data: item });
        } catch (err) { next(err); }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const item = await reservationService.create(req.body, user.role, user.id);
            res.status(201).json({ data: item });
        } catch (err) { next(err); }
    }

    static async checkIn(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = req.user!;
            const item = await reservationService.checkIn(id, user.role, user.id);
            res.json({ data: item });
        } catch (err) { next(err); }
    }
}
