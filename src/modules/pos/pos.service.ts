import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logger';
import { Errors } from '../../core/errors/StandardError';
import { query } from '../../core/connectors/postgres';
import { createPublisher } from '../../core/connectors/pubsub';
import { PosEvent, PosEventTypeEnum } from '../../core/schema';
import { PosAdapter } from './interfaces/posAdapter.interface';
import { MockAdapter } from './adapters/mock.adapter';

const logger = createLogger('POS_SERVICE');
const publisher = createPublisher('pos.events');

// Adapter Registry
const adapters: Record<string, PosAdapter> = {
    'mock': new MockAdapter()
};

/**
 * Initialize POS Service (Create table if not exists)
 */
export async function initPosService() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS pos_events (
                id UUID PRIMARY KEY,
                provider VARCHAR(50) NOT NULL,
                external_event_id VARCHAR(255) NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                table_id UUID,
                payload JSONB NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
                processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_pos_events_table_id ON pos_events(table_id);
            CREATE INDEX IF NOT EXISTS idx_pos_events_timestamp ON pos_events(timestamp);
        `);
        logger.info('POS Events table initialized');
    } catch (error) {
        logger.error('Failed to initialize POS events table', error as Error);
        throw error;
    }
}

/**
 * Process incoming webhook
 */
export async function processWebhook(providerName: string, headers: Record<string, any>, body: any): Promise<PosEvent> {
    const adapter = adapters[providerName.toLowerCase()];
    if (!adapter) {
        throw Errors.validation(`Unsupported POS provider: ${providerName}`);
    }

    // Validate signature
    if (!adapter.validateRequest(headers, body)) {
        throw Errors.unauthorized('Invalid webhook signature');
    }

    // Normalize event
    const partialEvent = adapter.normalizeEvent(body);
    if (!partialEvent) {
        logger.warn('Skipping unmapped POS event', { provider: providerName });
        throw Errors.validation('Event type not mapped or supported');
    }

    const event: PosEvent = {
        id: uuidv4(),
        provider: providerName.toUpperCase(),
        externalEventId: partialEvent.externalEventId || uuidv4(),
        eventType: partialEvent.eventType!,
        tableId: partialEvent.tableId,
        payload: partialEvent.payload || body,
        timestamp: partialEvent.timestamp || new Date().toISOString(),
        processedAt: new Date().toISOString()
    };

    // 1. Persist to DB
    await persistPosEvent(event);

    // 2. Publish to Pub/Sub
    await publisher.publish(event, {
        eventType: event.eventType,
        provider: event.provider
    });

    return event;
}

/**
 * Persist event to database
 */
async function persistPosEvent(event: PosEvent): Promise<void> {
    try {
        await query(`
            INSERT INTO pos_events (
                id, provider, external_event_id, event_type, table_id, 
                payload, timestamp, processed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            event.id,
            event.provider,
            event.externalEventId,
            event.eventType,
            event.tableId,
            JSON.stringify(event.payload),
            event.timestamp,
            event.processedAt
        ]);

        logger.debug('POS event persisted', { id: event.id });
    } catch (error) {
        logger.error('Failed to persist POS event', error as Error, { id: event.id });
        // Don't throw, we still want to try publishing if DB fails? 
        // debatable, but for now we throw to ensure data integrity
        throw error;
    }
}
