import { GuestProfile, GuestProfileSchema, Role } from '../../core/schema';
import { AuditService } from '../../core/audit/AuditService';
import { AppError, ErrorCodes } from '../../core/errors/AppError';
import prisma from '../../core/prisma';
import { v4 as uuidv4 } from 'uuid';

export class GuestService {
    private audit = AuditService.getInstance();

    public async getGuest(id: string, actorRole: Role, actorId: string): Promise<GuestProfile> {
        const guestData = await prisma.guestProfile.findUnique({
            where: { id }
        });

        if (!guestData) throw new AppError('Guest not found', ErrorCodes.NOT_FOUND, 404);

        // Map the DB record to GuestProfile schema (Prisma's DateTime -> ISO string if needed)
        const guest: GuestProfile = {
            ...guestData,
            createdAt: guestData.createdAt.toISOString(),
            updatedAt: guestData.updatedAt.toISOString(),
        } as GuestProfile;

        // RBAC: Guest can only read OWN profile
        if (actorRole === 'GUEST' && actorId !== id) {
            throw new AppError('Cannot view other guest profiles', ErrorCodes.FORBIDDEN, 403);
        }

        await this.audit.log({
            actorId, role: actorRole,
            action: 'VIEW', entity: 'GuestProfile', entityId: id,
            source: 'MANUAL',
            reasonCode: 'API_READ'
        });

        return guest;
    }

    public async createGuest(data: any, actorRole: Role, actorId: string): Promise<GuestProfile> {
        // Validate Input
        const now = new Date().toISOString();
        const cleanData = {
            id: uuidv4(),
            visitCount: 0,
            vipStatus: false,
            optOut: false,
            createdAt: now,
            updatedAt: now,
            ...data
        };

        const validation = GuestProfileSchema.safeParse(cleanData);
        if (!validation.success) {
            throw new AppError('Invalid Guest Data', ErrorCodes.VALIDATION_ERROR, 400);
        }

        const newGuestData = await prisma.guestProfile.create({
            data: validation.data
        });

        const newGuest: GuestProfile = {
            ...newGuestData,
            createdAt: newGuestData.createdAt.toISOString(),
            updatedAt: newGuestData.updatedAt.toISOString(),
        } as GuestProfile;

        await this.audit.log({
            actorId, role: actorRole,
            action: 'CREATE', entity: 'GuestProfile', entityId: newGuest.id,
            source: 'MANUAL',
            afterState: newGuest
        });

        return newGuest;
    }

    public async updateGuest(id: string, updates: any, actorRole: Role, actorId: string): Promise<GuestProfile> {
        // Check existence
        const existing = await prisma.guestProfile.findUnique({ where: { id } });
        if (!existing) throw new AppError('Guest not found', ErrorCodes.NOT_FOUND, 404);

        // RBAC: Guests can update themselves. Staff can update guests.
        if (actorRole === 'GUEST' && actorId !== id) {
            throw new AppError('Cannot update other guest profiles', ErrorCodes.FORBIDDEN, 403);
        }

        // We use Prisma to update
        const updatedData = await prisma.guestProfile.update({
            where: { id },
            data: updates
        });

        const finalGuest: GuestProfile = {
            ...updatedData,
            createdAt: updatedData.createdAt.toISOString(),
            updatedAt: updatedData.updatedAt.toISOString(),
        } as GuestProfile;

        await this.audit.log({
            actorId, role: actorRole,
            action: 'UPDATE', entity: 'GuestProfile', entityId: id,
            source: 'MANUAL',
            beforeState: {
                ...existing,
                createdAt: existing.createdAt.toISOString(),
                updatedAt: existing.updatedAt.toISOString(),
            },
            afterState: finalGuest
        });

        return finalGuest;
    }
}

