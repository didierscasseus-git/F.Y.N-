import { AuditLog, AuditLogSchema } from '../schema';
import prisma from '../prisma';
import { systemLogger } from '../logger';

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
            systemLogger.debug(`Audit log persisted`, { action: entry.action, entity: entry.entity });
        } catch (error) {
            systemLogger.error('Failed to persist audit log', error as Error);
        }
    }
}

