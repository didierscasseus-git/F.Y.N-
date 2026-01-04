import { AuditLog, AuditLogSchema } from '../schema';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ErrorCodes } from '../errors/AppError';

export class AuditService {
    private static instance: AuditService;

    private constructor() { }

    public static getInstance(): AuditService {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }

    public log(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
        const logEntry: AuditLog = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            ...entry
        };

        // Validate Schema
        const validation = AuditLogSchema.safeParse(logEntry);
        if (!validation.success) {
            console.error('[AuditService] Schema Validation Failed:', validation.error);
            // We do not throw here to prevent crashing the main flow, but we log the error
            return;
        }

        // In a real implementation, this would write to DB
        // For V1 MVP local dev, we write to Console
        console.log(`[AUDIT] [${logEntry.timestamp}] [${logEntry.role}] ${logEntry.action} on ${logEntry.entity} (${logEntry.entityId}):`, logEntry.reasonCode || '');
    }
}
