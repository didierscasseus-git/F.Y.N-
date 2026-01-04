import { GuestProfile, GuestProfileSchema, Role } from '../../core/schema';
import { AuditService } from '../../core/audit/AuditService';
import { AppError, ErrorCodes } from '../../core/errors/AppError';
import { v4 as uuidv4 } from 'uuid';

export class GuestService {
    // In-memory DB for MVP
    private static guests: Map<string, GuestProfile> = new Map();
    private audit = AuditService.getInstance();

    constructor() {
        // Seed if empty
        if (GuestService.guests.size === 0) {
            const gid = '11111111-1111-1111-1111-111111111111';
            GuestService.guests.set(gid, {
                id: gid,
                name: 'Guest One',
                visitCount: 1,
                vipStatus: false,
                optOut: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
    }

    public async getGuest(id: string, actorRole: Role, actorId: string): Promise<GuestProfile> {
        const guest = GuestService.guests.get(id);
        if (!guest) throw new AppError('Guest not found', ErrorCodes.NOT_FOUND, 404);

        // RBAC: Guest can only read OWN profile
        if (actorRole === 'GUEST' && actorId !== id) {
            throw new AppError('Cannot view other guest profiles', ErrorCodes.FORBIDDEN, 403);
        }

        // RBAC: Host/Server/Manager can read all
        // No explicit check needed as AuthMiddleware handles role allowance for the route, 
        // but specific logic for "VIP visibility" might go here.

        this.audit.log({
            actorId, role: actorRole,
            action: 'VIEW', entity: 'GuestProfile', entityId: id,
            source: 'MANUAL',
            reasonCode: 'API_READ'
        });

        return guest;
    }

    public async createGuest(data: any, actorRole: Role, actorId: string): Promise<GuestProfile> {
        // Validate Input
        const cleanData = {
            id: uuidv4(),
            visitCount: 0,
            vipStatus: false,
            optOut: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...data
        };

        const validation = GuestProfileSchema.safeParse(cleanData);
        if (!validation.success) {
            throw new AppError('Invalid Guest Data', ErrorCodes.VALIDATION_ERROR, 400);
        }

        const newGuest = validation.data;
        GuestService.guests.set(newGuest.id, newGuest);

        this.audit.log({
            actorId, role: actorRole,
            action: 'CREATE', entity: 'GuestProfile', entityId: newGuest.id,
            source: 'MANUAL',
            afterState: newGuest
        });

        return newGuest;
    }

    public async updateGuest(id: string, updates: any, actorRole: Role, actorId: string): Promise<GuestProfile> {
        const existing = GuestService.guests.get(id);
        if (!existing) throw new AppError('Guest not found', ErrorCodes.NOT_FOUND, 404);

        // RBAC: Guests can update themselves. Staff can update guests.
        if (actorRole === 'GUEST' && actorId !== id) {
            throw new AppError('Cannot update other guest profiles', ErrorCodes.FORBIDDEN, 403);
        }

        const updatedRaw = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        const validation = GuestProfileSchema.safeParse(updatedRaw); // Full replace validation
        if (!validation.success) {
            throw new AppError('Invalid Update Data', ErrorCodes.VALIDATION_ERROR, 400);
        }

        const finalGuest = validation.data;
        GuestService.guests.set(id, finalGuest);

        this.audit.log({
            actorId, role: actorRole,
            action: 'UPDATE', entity: 'GuestProfile', entityId: id,
            source: 'MANUAL',
            beforeState: existing,
            afterState: finalGuest
        });

        return finalGuest;
    }
}
