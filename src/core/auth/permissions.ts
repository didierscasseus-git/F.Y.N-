/**
 * PERMISSION MIDDLEWARE
 * 
 * Express middleware for permission checking.
 */

import { Request, Response, NextFunction } from 'express';
import { Role, Permission, hasPermission } from './rbac';
import { Errors } from '../errors/StandardError';
import { createLogger } from '../logger';

const logger = createLogger('PERMISSIONS');

/**
 * Extended request with authenticated user
 */
export interface AuthenticatedRequest {
    user: {
        uid: string;
        email?: string;
        role: Role;
        staffId?: string;
    };
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(...permissions: Permission[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const authReq = req as any;

        if (!authReq.user) {
            const error = Errors.unauthorized('Authentication required');
            res.status(error.statusCode).json(error.toJSON());
            return;
        }

        const userRole = authReq.user.role;
        const hasRequired = permissions.some(p => hasPermission(userRole, p));

        if (!hasRequired) {
            logger.warn('Permission denied', {
                uid: authReq.user.uid,
                role: userRole,
                requiredPermissions: permissions
            });

            const error = Errors.forbidden(`Missing required permission: ${permissions.join(' or ')}`);
            res.status(error.statusCode).json(error.toJSON());
            return;
        }

        next();
    };
}

/**
 * Middleware to restrict access to self or admin
 */
export function requireSelfOrAdmin(getUserIdFromRequest: (req: Request) => string) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const authReq = req as any;

        if (!authReq.user) {
            const error = Errors.unauthorized('Authentication required');
            res.status(error.statusCode).json(error.toJSON());
            return;
        }

        const targetUserId = getUserIdFromRequest(req);
        const isAdmin = [Role.ADMIN, Role.MANAGER].includes(authReq.user.role);
        const isSelf = authReq.user.staffId === targetUserId || authReq.user.uid === targetUserId;

        if (!isAdmin && !isSelf) {
            const error = Errors.forbidden('You can only access your own data');
            res.status(error.statusCode).json(error.toJSON());
            return;
        }

        next();
    };
}

/**
 * Filter response fields based on role permissions
 */
export function filterFields<T extends Record<string, any>>(
    role: Role,
    entity: string,
    data: T
): Partial<T> {
    const filtered: any = {};

    for (const [key, value] of Object.entries(data)) {
        // Always include id
        if (key === 'id') {
            filtered[key] = value;
            continue;
        }

        // Check field-level permissions
        if (canAccessFieldCheck(role, entity, key)) {
            filtered[key] = value;
        }
    }

    return filtered;
}

/**
 * Internal field access check
 */
function canAccessFieldCheck(role: Role, entity: string, field: string): boolean {
    // Import here to avoid circular dependency
    const { canAccessField } = require('./rbac');
    return canAccessField(role, entity, field);
}
