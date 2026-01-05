/**
 * BIGQUERY CONNECTOR
 * 
 * Batch and streaming writer abstractions for BigQuery.
 * STACK LOCK: BIGQUERY
 */

import { BigQuery, Table, InsertRowsOptions } from '@google-cloud/bigquery';
import { getConfig } from '../config';
import { createLogger } from '../logger';
import { Errors } from '../errors/StandardError';

const logger = createLogger('BIGQUERY');

let bigqueryClient: BigQuery | null = null;

/**
 * Initialize BigQuery client
 */
export function initBigQuery(): BigQuery {
    if (bigqueryClient) {
        return bigqueryClient;
    }

    const config = getConfig();

    bigqueryClient = new BigQuery({
        projectId: config.bigquery.projectId
    });

    logger.info('BigQuery client initialized', {
        projectId: config.bigquery.projectId,
        dataset: config.bigquery.dataset
    });

    return bigqueryClient;
}

/**
 * Get BigQuery client
 */
export function getBigQueryClient(): BigQuery {
    if (!bigqueryClient) {
        return initBigQuery();
    }
    return bigqueryClient;
}

/**
 * Get table reference
 */
function getTable(tableName: string): Table {
    const client = getBigQueryClient();
    const config = getConfig();
    return client.dataset(config.bigquery.dataset).table(tableName);
}

/**
 * Batch Writer - for larger, less frequent writes
 */
export class BatchWriter {
    private tableName: string;
    private table: Table;

    constructor(tableName: string) {
        this.tableName = tableName;
        this.table = getTable(tableName);
    }

    /**
     * Insert rows in batch
     */
    async insert(rows: Record<string, any>[]): Promise<void> {
        if (rows.length === 0) {
            logger.warn('Attempted to insert empty batch', { table: this.tableName });
            return;
        }

        try {
            await this.table.insert(rows);

            logger.info('Batch insert completed', {
                table: this.tableName,
                rows: rows.length
            });
        } catch (error) {
            logger.error('Batch insert failed', error as Error, {
                table: this.tableName,
                rows: rows.length
            });
            throw Errors.internal('BigQuery batch insert failed', {
                table: this.tableName,
                error: (error as Error).message
            });
        }
    }
}

/**
 * Streaming Writer - for real-time, continuous writes
 */
export class StreamingWriter {
    private tableName: string;
    private table: Table;
    private buffer: Record<string, any>[];
    private bufferSize: number;
    private flushInterval: number;
    private timer: NodeJS.Timeout | null = null;

    constructor(tableName: string, bufferSize = 100, flushIntervalMs = 5000) {
        this.tableName = tableName;
        this.table = getTable(tableName);
        this.buffer = [];
        this.bufferSize = bufferSize;
        this.flushInterval = flushIntervalMs;

        // Start auto-flush timer
        this.startAutoFlush();
    }

    /**
     * Add row to streaming buffer
     */
    async write(row: Record<string, any>): Promise<void> {
        this.buffer.push(row);

        if (this.buffer.length >= this.bufferSize) {
            await this.flush();
        }
    }

    /**
     * Flush buffer to BigQuery
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) {
            return;
        }

        const rowsToInsert = [...this.buffer];
        this.buffer = [];

        try {
            await this.table.insert(rowsToInsert, {
                raw: true  // Streaming insert
            } as InsertRowsOptions);

            logger.debug('Streaming insert completed', {
                table: this.tableName,
                rows: rowsToInsert.length
            });
        } catch (error) {
            logger.error('Streaming insert failed', error as Error, {
                table: this.tableName,
                rows: rowsToInsert.length
            });
            // Re-add failed rows to buffer for retry
            this.buffer.unshift(...rowsToInsert);
        }
    }

    /**
     * Start auto-flush timer
     */
    private startAutoFlush(): void {
        this.timer = setInterval(() => {
            this.flush().catch((error) => {
                logger.error('Auto-flush failed', error);
            });
        }, this.flushInterval);
    }

    /**
     * Stop auto-flush and flush remaining data
     */
    async close(): Promise<void> {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        await this.flush();

        logger.info('Streaming writer closed', {
            table: this.tableName
        });
    }
}

/**
 * Create a batch writer
 */
export function createBatchWriter(tableName: string): BatchWriter {
    return new BatchWriter(tableName);
}

/**
 * Create a streaming writer
 */
export function createStreamingWriter(
    tableName: string,
    bufferSize?: number,
    flushIntervalMs?: number
): StreamingWriter {
    return new StreamingWriter(tableName, bufferSize, flushIntervalMs);
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
        const client = getBigQueryClient();
        const config = getConfig();
        await client.dataset(config.bigquery.dataset).get();
        return { healthy: true };
    } catch (error) {
        return {
            healthy: false,
            error: (error as Error).message
        };
    }
}
