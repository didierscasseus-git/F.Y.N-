import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../errors/AppError';
import { Role, RoleEnum } from '../schema';

export interface AuthUser {
    id: string;
    role: Role;
    name: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export const requireAuth = (allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // For V1 MVP, we extract from headers "x-user-id" and "x-role"
        // In production, this would verify a JWT
        const uid = req.headers['x-user-id'] as string;
        const roleString = req.headers['x-role'] as string;

        if (!uid || !roleString) {
            return next(new AppError('Missing Auth Headers', ErrorCodes.AUTH_ERROR, 401));
        }

        // Validate Role Enum
        const roleValidation = RoleEnum.safeParse(roleString);
        if (!roleValidation.success) {
            return next(new AppError(`Invalid Role: ${roleString}`, ErrorCodes.AUTH_ERROR, 400));
        }
        const role = roleValidation.data;

        if (!allowedRoles.includes(role)) {
            return next(new AppError(`Role ${role} not authorized`, ErrorCodes.FORBIDDEN, 403));
        }

        req.user = { id: uid, role, name: 'Mock User' };
        next();
    };
};
