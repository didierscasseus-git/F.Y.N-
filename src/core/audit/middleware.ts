/**
 * AUDIT LOG MIDDLEWARE
 * 
 * Automatic audit logging middleware for Express routes.
 */

import { Request, Response, NextFunction } from 'express';
import { createAuditLog, AuditAction, AuditSource } from './auditLog';

/**
 * Middleware to log access to sensitive endpoints
 */
export function auditAccess(entityType: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (user) {
            try {
                await createAuditLog({
                    actorId: user.staffId || user.uid,
                    role: user.role,
                    action: AuditAction.ACCESS,
                    source: AuditSource.MANUAL,
                    targetEntity: entityType,
                    targetId: req.params.id,
                    sourceIp: req.ip,
                    userAgent: req.get('user-agent')
                });
            } catch (error) {
                // Log but don't block request
                console.error('Audit logging failed:', error);
            }
        }

        next();
    };
}

/**
 * Helper to extract IP address
 */
export function getClientIp(req: Request): string | undefined {
    return req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress;
}
