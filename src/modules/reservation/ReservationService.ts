import { Reservation, ReservationSchema, Role } from '../../core/schema';
import { AuditService } from '../../core/audit/AuditService';
import { AppError, ErrorCodes } from '../../core/errors/AppError';
import prisma from '../../core/prisma';
import { v4 as uuidv4 } from 'uuid';

export class ReservationService {
    private audit = AuditService.getInstance();

    public async get(id: string, actorRole: Role, actorId: string): Promise<Reservation> {
        const resData = await prisma.reservation.findUnique({
            where: { id }
        });

        if (!resData) throw new AppError('Reservation not found', ErrorCodes.NOT_FOUND, 404);

        // Map DB record to Reservation schema
        const res: Reservation = {
            ...resData,
            reservationTime: resData.reservationTime.toISOString(),
            createdAt: resData.createdAt.toISOString(),
            updatedAt: resData.updatedAt.toISOString(),
            tags: JSON.parse(resData.tags)
        } as Reservation;

        return res;
    }

    public async create(data: any, actorRole: Role, actorId: string): Promise<Reservation> {
        const validation = ReservationSchema.safeParse({
            id: uuidv4(),
            status: 'BOOKED',
            tags: data.tags || [],
            ...data
        });

        if (!validation.success) {
            throw new AppError('Invalid Reservation Data', ErrorCodes.VALIDATION_ERROR, 400);
        }

        const validRes = validation.data;

        const newResData = await prisma.reservation.create({
            data: {
                ...validRes,
                reservationTime: new Date(validRes.reservationTime),
                tags: JSON.stringify(validRes.tags)
            }
        });

        const newRes: Reservation = {
            ...newResData,
            reservationTime: newResData.reservationTime.toISOString(),
            createdAt: newResData.createdAt.toISOString(),
            updatedAt: newResData.updatedAt.toISOString(),
            tags: JSON.parse(newResData.tags)
        } as Reservation;

        await this.audit.log({
            actorId, role: actorRole,
            action: 'CREATE', entity: 'Reservation', entityId: newRes.id,
            source: 'MANUAL',
            afterState: newRes
        });

        return newRes;
    }

    public async checkIn(id: string, actorRole: Role, actorId: string): Promise<Reservation> {
        // Only Host/Staff
        if (!['HOST', 'SERVER', 'MANAGER', 'ADMIN'].includes(actorRole)) {
            throw new AppError('Only staff can check in guests', ErrorCodes.FORBIDDEN, 403);
        }

        const current = await this.get(id, actorRole, actorId);
        if (current.status !== 'BOOKED') {
            throw new AppError(`Cannot check-in from state ${current.status}`, ErrorCodes.CONFLICT, 409);
        }

        const updatedData = await prisma.reservation.update({
            where: { id },
            data: { status: 'ARRIVED' }
        });

        const updated: Reservation = {
            ...updatedData,
            reservationTime: updatedData.reservationTime.toISOString(),
            createdAt: updatedData.createdAt.toISOString(),
            updatedAt: updatedData.updatedAt.toISOString(),
            tags: JSON.parse(updatedData.tags)
        } as Reservation;

        await this.audit.log({
            actorId, role: actorRole,
            action: 'UPDATE', entity: 'Reservation', entityId: id,
            source: 'MANUAL',
            beforeState: current,
            afterState: updated,
            reasonCode: 'CHECK_IN'
        });

        return updated;
    }
}

