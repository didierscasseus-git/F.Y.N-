/**
 * PUBSUB CONNECTOR
 * 
 * Publisher and Subscriber abstractions for Google Cloud Pub/Sub.
 * STACK LOCK: PUBSUB
 */

import { PubSub, Topic, Subscription, Message } from '@google-cloud/pubsub';
import { getConfig } from '../config';
import { createLogger } from '../logger';
import { Errors } from '../errors/StandardError';

const logger = createLogger('PUBSUB');

let pubsubClient: PubSub | null = null;

/**
 * Initialize Pub/Sub client
 */
export function initPubSub(): PubSub {
    if (pubsubClient) {
        return pubsubClient;
    }

    const config = getConfig();

    pubsubClient = new PubSub({
        projectId: config.pubsub.projectId
    });

    logger.info('Pub/Sub client initialized', {
        projectId: config.pubsub.projectId
    });

    return pubsubClient;
}

/**
 * Get Pub/Sub client
 */
export function getPubSubClient(): PubSub {
    if (!pubsubClient) {
        return initPubSub();
    }
    return pubsubClient;
}

/**
 * Publisher abstraction
 */
export class Publisher {
    private topic: Topic;
    private topicName: string;

    constructor(topicName: string) {
        this.topicName = topicName;
        const client = getPubSubClient();
        this.topic = client.topic(topicName);
    }

    /**
     * Publish a message
     */
    async publish(data: Record<string, any>, attributes?: Record<string, string>): Promise<string> {
        try {
            const dataBuffer = Buffer.from(JSON.stringify(data));
            const messageId = await this.topic.publishMessage({
                data: dataBuffer,
                attributes
            });

            logger.debug('Message published', {
                topic: this.topicName,
                messageId,
                attributes
            });

            return messageId;
        } catch (error) {
            logger.error('Failed to publish message', error as Error, {
                topic: this.topicName
            });
            throw Errors.internal('Failed to publish message', { topic: this.topicName });
        }
    }

    /**
     * Batch publish messages
     */
    async publishBatch(messages: Array<{ data: Record<string, any>; attributes?: Record<string, string> }>): Promise<string[]> {
        try {
            const publishPromises = messages.map(msg => this.publish(msg.data, msg.attributes));
            const messageIds = await Promise.all(publishPromises);

            logger.info('Batch messages published', {
                topic: this.topicName,
                count: messages.length
            });

            return messageIds;
        } catch (error) {
            logger.error('Failed to publish batch', error as Error, {
                topic: this.topicName,
                count: messages.length
            });
            throw error;
        }
    }
}

/**
 * Subscriber abstraction
 */
export class Subscriber {
    private subscription: Subscription;
    private subscriptionName: string;

    constructor(subscriptionName: string) {
        this.subscriptionName = subscriptionName;
        const client = getPubSubClient();
        this.subscription = client.subscription(subscriptionName);
    }

    /**
     * Subscribe to messages
     */
    subscribe(
        handler: (message: any, attributes?: Record<string, string>) => Promise<void>,
        errorHandler?: (error: Error) => void
    ): void {
        this.subscription.on('message', async (message: Message) => {
            try {
                const data = JSON.parse(message.data.toString());
                await handler(data, message.attributes);
                message.ack();

                logger.debug('Message processed', {
                    subscription: this.subscriptionName,
                    messageId: message.id
                });
            } catch (error) {
                logger.error('Message handling failed', error as Error, {
                    subscription: this.subscriptionName,
                    messageId: message.id
                });
                message.nack();
            }
        });

        this.subscription.on('error', (error: Error) => {
            logger.error('Subscription error', error, {
                subscription: this.subscriptionName
            });
            if (errorHandler) {
                errorHandler(error);
            }
        });

        logger.info('Subscriber started', {
            subscription: this.subscriptionName
        });
    }

    /**
     * Close subscription
     */
    async close(): Promise<void> {
        await this.subscription.close();
        logger.info('Subscription closed', {
            subscription: this.subscriptionName
        });
    }
}

/**
 * Create a publisher for a topic
 */
export function createPublisher(topicName: string): Publisher {
    return new Publisher(topicName);
}

/**
 * Create a subscriber for a subscription
 */
export function createSubscriber(subscriptionName: string): Subscriber {
    return new Subscriber(subscriptionName);
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
        const client = getPubSubClient();
        await client.getTopics();
        return { healthy: true };
    } catch (error) {
        return {
            healthy: false,
            error: (error as Error).message
        };
    }
}
