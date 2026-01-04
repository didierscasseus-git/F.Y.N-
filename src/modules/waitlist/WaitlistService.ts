import { WaitlistEntry, WaitlistEntrySchema, WaitlistStatusEnum, Role } from '../../core/schema';
import { AuditService } from '../../core/audit/AuditService';
import { AppError, ErrorCodes } from '../../core/errors/AppError';
import prisma from '../../core/prisma';
import { v4 as uuidv4 } from 'uuid';

export class WaitlistService {
    private audit = AuditService.getInstance();

    public async addToWaitlist(data: any, actorRole: Role, actorId: string): Promise<WaitlistEntry> {
        // Validation
        const cleanData = {
            id: uuidv4(),
            checkInTime: new Date().toISOString(),
            status: 'WAITING',
            estimatedWaitMinutes: 0,
            ...data
        };

        const validation = WaitlistEntrySchema.safeParse(cleanData);
        if (!validation.success) {
            throw new AppError('Invalid Waitlist Data', ErrorCodes.VALIDATION_ERROR, 400);
        }
        const validEntry = validation.data;

        // Check if guest exists
        const guest = await prisma.guestProfile.findUnique({ where: { id: validEntry.guestId } });
        if (!guest) throw new AppError('Guest not found', ErrorCodes.NOT_FOUND, 404);

        // Create
        const newEntryData = await prisma.waitlistEntry.create({
            data: {
                ...validEntry,
                checkInTime: new Date(validEntry.checkInTime),
                createdAt: validEntry.createdAt ? new Date(validEntry.createdAt) : undefined,
                updatedAt: validEntry.updatedAt ? new Date(validEntry.updatedAt) : undefined
            }
        });

        // Convert Dates back to ISO for parsed type
        const newEntry: WaitlistEntry = {
            ...newEntryData,
            checkInTime: newEntryData.checkInTime.toISOString(),
            createdAt: newEntryData.createdAt.toISOString(),
            updatedAt: newEntryData.updatedAt.toISOString(),
        } as WaitlistEntry;

        await this.audit.log({
            actorId, role: actorRole,
            action: 'CREATE', entity: 'WaitlistEntry', entityId: newEntry.id,
            source: 'MANUAL',
            afterState: newEntry
        });

        return newEntry;
    }

    public async getWaitlist(status?: string): Promise<WaitlistEntry[]> {
        const where = status ? { status } : {};
        const entries = await prisma.waitlistEntry.findMany({
            where,
            orderBy: { checkInTime: 'asc' },
            include: { guest: true }
        });

        return entries.map(e => ({
            ...e,
            checkInTime: e.checkInTime.toISOString(),
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
        } as unknown as WaitlistEntry));
    }

    public async notifyGuest(id: string, actorRole: Role, actorId: string): Promise<WaitlistEntry> {
        if (!['HOST', 'MANAGER', 'ADMIN'].includes(actorRole)) {
            throw new AppError('Permission Denied', ErrorCodes.FORBIDDEN, 403);
        }

        const entry = await prisma.waitlistEntry.findUnique({ where: { id }, include: { guest: true } });
        if (!entry) throw new AppError('Entry not found', ErrorCodes.NOT_FOUND, 404);

        // Update Status
        const updatedData = await prisma.waitlistEntry.update({
            where: { id },
            data: { status: 'NOTIFIED' }
        });

        const updatedEntry = {
            ...updatedData,
            checkInTime: updatedData.checkInTime.toISOString(),
            createdAt: updatedData.createdAt.toISOString(),
            updatedAt: updatedData.updatedAt.toISOString(),
        } as WaitlistEntry;

        // Stub Notification
        console.log(`[SMS STUB] Sending SMS to ${entry.guest.phoneNumber || 'Unknown Number'}: "Your table is ready!"`);

        await this.audit.log({
            actorId, role: actorRole,
            action: 'UPDATE', entity: 'WaitlistEntry', entityId: id,
            source: 'MANUAL',
            beforeState: entry,
            afterState: updatedEntry,
            reasonCode: 'GUEST_NOTIFIED'
        });

        return updatedEntry;
    }

    public async removeFromWaitlist(id: string, reason: string, actorRole: Role, actorId: string): Promise<WaitlistEntry> {
        if (!['HOST', 'MANAGER', 'ADMIN'].includes(actorRole)) {
            throw new AppError('Permission Denied', ErrorCodes.FORBIDDEN, 403);
        }

        const entry = await prisma.waitlistEntry.findUnique({ where: { id } });
        if (!entry) throw new AppError('Entry not found', ErrorCodes.NOT_FOUND, 404);

        const updatedData = await prisma.waitlistEntry.update({
            where: { id },
            data: { status: 'CANCELLED' } // Soft Delete / Status Change
        });

        const updatedEntry = {
            ...updatedData,
            checkInTime: updatedData.checkInTime.toISOString(),
            createdAt: updatedData.createdAt.toISOString(),
            updatedAt: updatedData.updatedAt.toISOString(),
        } as WaitlistEntry;

        await this.audit.log({
            actorId, role: actorRole,
            action: 'UPDATE', entity: 'WaitlistEntry', entityId: id,
            source: 'MANUAL',
            beforeState: entry,
            afterState: updatedEntry,
            reasonCode: reason
        });

        return updatedEntry;
    }
}
