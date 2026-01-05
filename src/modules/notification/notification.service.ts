import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logger';
import { Errors } from '../../core/errors/StandardError';
import { query } from '../../core/connectors/postgres';
import { getPubSubClient, createSubscriber, createPublisher } from '../../core/connectors/pubsub';
import { Notification, NotificationTypeEnum, NotificationPriorityEnum, Role } from '../../core/schema';
import { getHandlerForEvent } from './strategies/registry';

const logger = createLogger('NOTIFICATION_SERVICE');
const publisher = createPublisher('notification.events');

// Topics to subscribe to
const SUBSCRIPTIONS = {
    'pos.events': 'notification-pos-sub',
    'inventory.events': 'notification-inventory-sub',
    'table.events': 'notification-table-sub',
    'reservation.events': 'notification-reservation-sub',
    'ar.events': 'notification-ar-sub'
};

/**
 * Initialize Notification Service
 */
export async function initNotificationService() {
    try {
        // 1. Create DB Table
        await query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                priority VARCHAR(50) NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                recipient_role VARCHAR(50),
                recipient_id UUID,
                read BOOLEAN DEFAULT FALSE,
                data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(recipient_role);
            CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
        `);

        // 2. Ensure Subscriptions Exist and Subscribe
        await setupSubscriptions();

        logger.info('Notification service initialized');
    } catch (error) {
        logger.error('Failed to initialize Notification service', error as Error);
        throw error;
    }
}

/**
 * Setup Pub/Sub subscriptions
 */
async function setupSubscriptions() {
    const client = getPubSubClient();

    for (const [topicName, subName] of Object.entries(SUBSCRIPTIONS)) {
        try {
            // Ensure topic exists
            const topic = client.topic(topicName);
            const [topicExists] = await topic.exists();
            if (!topicExists) {
                await topic.create();
                logger.info(`Created topic: ${topicName}`);
            }

            // Ensure subscription exists
            const subscription = topic.subscription(subName);
            const [subExists] = await subscription.exists();
            if (!subExists) {
                await subscription.create();
                logger.info(`Created subscription: ${subName}`);
            }

            // Attach subscriber
            const subscriber = createSubscriber(subName);
            subscriber.subscribe(async (msg, attributes) => {
                try {
                    await handleIncomingEvent(topicName, msg, attributes);
                } catch (error) {
                    logger.error(`Error processing message from ${topicName}`, error as Error, {
                        attributes,
                        payload: msg
                    });
                    // Note: Monitoring will detect these errors from logs.
                    // Message is effectively "ignored" to prevent infinite retry loops 
                    // if it's a poison pill, or you could throw to retry.
                }
            });
        } catch (error) {
            logger.error(`Failed to setup subscription for ${topicName}`, error as Error);
        }
    }
}

/**
 * Handle incoming events from Pub/Sub
 */
async function handleIncomingEvent(topic: string, payload: any, attributes?: Record<string, string>) {
    try {
        const eventType = attributes?.eventType || payload.eventType || 'UNKNOWN';
        logger.debug('Received event', { topic, type: eventType });

        const strategy = await getHandlerForEvent(topic, eventType);

        if (strategy) {
            const notificationInput = await strategy.handle(payload, attributes);
            if (notificationInput) {
                await createNotification(notificationInput);
            }
        } else if (topic === 'ar.events') {
            // AR events logged but no specific notification strategy yet
            logger.info('AR Event recorded', { payload });
        }

    } catch (error) {
        logger.error('Error processing event', error as Error, { topic });
    }
}

export interface CreateNotificationInput {
    type: 'SYSTEM' | 'ALERT' | 'REMINDER' | 'MESSAGE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    message: string;
    recipientRole?: Role;
    recipientId?: string;
    data?: any;
}

/**
 * Create a notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
    const id = uuidv4();

    // Persist
    await query(`
        INSERT INTO notifications (
            id, type, priority, title, message, recipient_role, recipient_id, data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
        id, input.type, input.priority, input.title, input.message,
        input.recipientRole || null, input.recipientId || null,
        input.data ? JSON.stringify(input.data) : null
    ]);

    const notification: Notification = {
        id,
        type: input.type as any,
        priority: input.priority as any,
        title: input.title,
        message: input.message,
        recipientRole: input.recipientRole || undefined,
        recipientId: input.recipientId || undefined,
        read: false,
        data: input.data,
        createdAt: new Date().toISOString()
    };

    // Publish to notification stream (for realtime clients)
    await publisher.publish(notification, { type: 'NOTIFICATION_CREATED' });

    logger.info('Notification created', { id });
    return notification;
}

/**
 * Get notifications
 */
export async function getNotifications(
    role?: Role,
    userId?: string,
    unreadOnly: boolean = false
): Promise<Notification[]> {
    let sql = `SELECT * FROM notifications WHERE 1=1`;
    const params: any[] = [];
    let pIdx = 1;

    if (role || userId) {
        sql += ` AND (`;
        const conditions = [];
        if (role) {
            conditions.push(`recipient_role = $${pIdx++}`);
            params.push(role);
        }
        if (userId) {
            conditions.push(`recipient_id = $${pIdx++}`);
            params.push(userId);
        }
        // Also include broadcast
        if (!role) {
            // If no role specified, user sees their ID + maybe broadcast? 
            // Usually filters are permissive. If calling as user, we pass both.
        }
        sql += conditions.join(' OR ');
        sql += `)`;
    }

    if (unreadOnly) {
        sql += ` AND read = FALSE`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await query(sql, params);
    return result.rows.map(mapDbToNotification);
}

/**
 * Mark as read
 */
export async function markAsRead(id: string): Promise<void> {
    await query(`UPDATE notifications SET read = TRUE WHERE id = $1`, [id]);
}

function mapDbToNotification(row: any): Notification {
    return {
        id: row.id,
        type: row.type,
        priority: row.priority,
        title: row.title,
        message: row.message,
        recipientRole: row.recipient_role,
        recipientId: row.recipient_id,
        read: row.read,
        data: row.data,
        createdAt: new Date(row.created_at).toISOString()
    };
}
