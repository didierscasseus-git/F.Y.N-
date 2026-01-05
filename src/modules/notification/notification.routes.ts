import { Router } from 'express';
import { requireAuth } from '../../core/connectors/firebaseAuth';
import * as NotificationService from './notification.service';
import { Errors } from '../../core/errors/StandardError';
import { createLogger } from '../../core/logger';

const router = Router();
const logger = createLogger('NOTIFICATION_ROUTES');

// Get notifications (for authenticated user)
router.get('/', requireAuth, async (req, res, next) => {
    try {
        const { unread } = req.query;
        // User from auth middleware
        const user = (req as any).user;

        const notifications = await NotificationService.getNotifications(
            user.role,
            user.uid,
            unread === 'true'
        );

        res.json(notifications);
    } catch (error) {
        next(error);
    }
});

// Mark as read
router.post('/:id/read', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        await NotificationService.markAsRead(id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export const notificationRoutes = router;
export const initNotificationService = NotificationService.initNotificationService; // Export for server.ts
