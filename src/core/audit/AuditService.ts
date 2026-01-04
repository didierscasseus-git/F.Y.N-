import { AuditLog, AuditLogSchema } from '../schema';
import prisma from '../prisma';

export class AuditService {
    private static instance: AuditService;

    private constructor() { }

    public static getInstance(): AuditService {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }

    public async log(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
        // We use Prisma's auto-generation for IDs and Timestamps if possible, 
        // but our schema has id as String and timestamp as DateTime.

        const logEntryData = {
            ...entry,
            beforeState: entry.beforeState ? JSON.stringify(entry.beforeState) : null,
            afterState: entry.afterState ? JSON.stringify(entry.afterState) : null
        };

        try {
            await prisma.auditLog.create({
                data: logEntryData
            });
            console.log(`[AUDIT] logged ${entry.action} on ${entry.entity} (${entry.entityId})`);
        } catch (error) {
            console.error('[AuditService] Failed to persist log:', error);
        }
    }
}

