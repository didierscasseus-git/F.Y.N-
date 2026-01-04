import { Reservation, ReservationSchema, Role, ReservationStatusEnum } from '../../core/schema';
import { AuditService } from '../../core/audit/AuditService';
import { AppError, ErrorCodes } from '../../core/errors/AppError';
import { v4 as uuidv4 } from 'uuid';

export class ReservationService {
    private static reservations: Map<string, Reservation> = new Map();
    private audit = AuditService.getInstance();

    constructor() {
        // Seed
        if (ReservationService.reservations.size === 0) {
            const id = '22222222-2222-2222-2222-222222222222';
            ReservationService.reservations.set(id, {
                id,
                guestId: '11111111-1111-1111-1111-111111111111',
                partySize: 2,
                reservationTime: new Date().toISOString(),
                duration: 'STD_90',
                status: 'BOOKED',
                source: 'WEB',
                tags: []
            });
        }
    }

    public async get(id: string, actorRole: Role, actorId: string): Promise<Reservation> {
        const res = ReservationService.reservations.get(id);
        if (!res) throw new AppError('Reservation not found', ErrorCodes.NOT_FOUND, 404);

        // RBAC: Guest can view own reservation using GuestID linkage?
        // Not implemented in V1 yet fully, assuming ID access for now.

        return res;
    }

    public async create(data: any, actorRole: Role, actorId: string): Promise<Reservation> {
        const cleanData = {
            id: uuidv4(),
            status: 'BOOKED', // Default
            tags: [],
            ...data
        };

        const validation = ReservationSchema.safeParse(cleanData);
        if (!validation.success) {
            throw new AppError('Invalid Reservation Data', ErrorCodes.VALIDATION_ERROR, 400);
        }
        const newRes = validation.data;

        // Strict Linkage Check (Mocked for V1 - Assume Guest exists)
        // In V2, check GuestService.get(newRes.guestId)

        ReservationService.reservations.set(newRes.id, newRes);

        this.audit.log({
            actorId, role: actorRole,
            action: 'CREATE', entity: 'Reservation', entityId: newRes.id,
            source: 'MANUAL',
            afterState: newRes
        });

        return newRes;
    }

    // State Transitions
    public async checkIn(id: string, actorRole: Role, actorId: string): Promise<Reservation> {
        // Only Host/Staff
        if (!['HOST', 'SERVER', 'MANAGER', 'ADMIN'].includes(actorRole)) {
            throw new AppError('Only staff can check in guests', ErrorCodes.FORBIDDEN, 403);
        }

        const res = await this.get(id, actorRole, actorId);
        if (res.status !== 'BOOKED') {
            throw new AppError(`Cannot check-in from state ${res.status}`, ErrorCodes.CONFLICT, 409);
        }

        const updated = { ...res, status: 'ARRIVED' as const };
        ReservationService.reservations.set(id, updated);

        this.audit.log({
            actorId, role: actorRole,
            action: 'UPDATE', entity: 'Reservation', entityId: id,
            source: 'MANUAL',
            beforeState: res, afterState: updated,
            reasonCode: 'CHECK_IN'
        });

        return updated;
    }
}
