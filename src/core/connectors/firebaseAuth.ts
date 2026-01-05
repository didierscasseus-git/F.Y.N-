/**
 * FIREBASE AUTH CONNECTOR
 * 
 * Token verification middleware for Firebase Authentication.
 * STACK LOCK: FIREBASE_AUTH
 */

import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config';
import { createLogger } from '../logger';
import { Errors } from '../errors/StandardError';

const logger = createLogger('FIREBASE_AUTH');

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export function initFirebase(): admin.app.App {
    if (firebaseApp) {
        return firebaseApp;
    }

    const config = getConfig();

    try {
        // Parse service account JSON
        const serviceAccount = config.firebase.serviceAccountJson
            ? JSON.parse(config.firebase.serviceAccountJson)
            : undefined;

        firebaseApp = admin.initializeApp({
            credential: serviceAccount
                ? admin.credential.cert(serviceAccount)
                : admin.credential.applicationDefault(),
            projectId: config.firebase.projectId
        });

        logger.info('Firebase Admin SDK initialized', {
            projectId: config.firebase.projectId
        });

        return firebaseApp;
    } catch (error) {
        logger.error('Failed to initialize Firebase', error as Error);
        throw Errors.internal('Firebase initialization failed');
    }
}

/**
 * Get Firebase app instance
 */
export function getFirebaseApp(): admin.app.App {
    if (!firebaseApp) {
        return initFirebase();
    }
    return firebaseApp;
}

/**
 * Verify Firebase ID token
 */
export async function verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    const app = getFirebaseApp();

    try {
        const decodedToken = await app.auth().verifyIdToken(token);
        logger.debug('Token verified', {
            uid: decodedToken.uid,
            email: decodedToken.email
        });
        return decodedToken;
    } catch (error) {
        logger.warn('Token verification failed', {
            error: (error as Error).message
        });
        throw Errors.unauthorized('Invalid authentication token');
    }
}

/**
 * Express middleware for Firebase Auth
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = Errors.unauthorized('No authentication token provided');
        res.status(error.statusCode).json(error.toJSON());
        return;
    }

    const token = authHeader.split('Bearer ')[1];

    verifyToken(token)
        .then((decodedToken) => {
            // Attach user info to request
            (req as any).user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: decodedToken.role || 'Guest'
            };
            next();
        })
        .catch((error) => {
            res.status(error.statusCode).json(error.toJSON());
        });
}

/**
 * Middleware for role-based access control
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = (req as any).user;

        if (!user) {
            const error = Errors.unauthorized('Authentication required');
            res.status(error.statusCode).json(error.toJSON());
            return;
        }

        if (!allowedRoles.includes(user.role)) {
            const error = Errors.forbidden(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
            res.status(error.statusCode).json(error.toJSON());
            return;
        }

        next();
    };
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
        const app = getFirebaseApp();
        // Simple check: verify app is initialized
        const projectId = app.options.projectId;
        return { healthy: true };
    } catch (error) {
        return {
            healthy: false,
            error: (error as Error).message
        };
    }
}
