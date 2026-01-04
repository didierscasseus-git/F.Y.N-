import { Request, Response, NextFunction } from 'express';
import { GuestService } from './GuestService';
import { Role } from '../../core/schema';

const guestService = new GuestService();

export class GuestController {

    static async getOne(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = req.user!; // Guaranteed by requireAuth

            const guest = await guestService.getGuest(id, user.role, user.id);
            res.json({ data: guest });
        } catch (err) {
            next(err);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const newGuest = await guestService.createGuest(req.body, user.role, user.id);
            res.status(201).json({ data: newGuest });
        } catch (err) {
            next(err);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = req.user!;
            const updated = await guestService.updateGuest(id, req.body, user.role, user.id);
            res.json({ data: updated });
        } catch (err) {
            next(err);
        }
    }
}
