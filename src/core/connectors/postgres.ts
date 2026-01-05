/**
 * POSTGRESQL CONNECTOR
 * 
 * Connection pooling and query execution for PostgreSQL.
 * STACK LOCK: POSTGRESQL
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { getConfig } from '../config';
import { createLogger } from '../logger';
import { Errors } from '../errors/StandardError';

const logger = createLogger('POSTGRES');

let pool: Pool | null = null;

/**
 * Initialize PostgreSQL connection pool
 */
export function initPostgres(): Pool {
    if (pool) {
        return pool;
    }

    const config = getConfig();

    pool = new Pool({
        connectionString: config.database.url,
        max: 50,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
        logger.error('Unexpected PostgreSQL pool error', err);
    });

    pool.on('connect', () => {
        logger.debug('New PostgreSQL client connected');
    });

    logger.info('PostgreSQL connection pool initialized', {
        max: 20,
        database: config.database.url.split('@')[1] || 'hidden'
    });

    return pool;
}

/**
 * Get PostgreSQL pool
 */
export function getPool(): Pool {
    if (!pool) {
        return initPostgres();
    }
    return pool;
}

/**
 * Execute a query
 */
export async function query(
    text: string,
    params?: any[]
): Promise<QueryResult> {
    const pool = getPool();
    const start = Date.now();

    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        logger.debug('Query executed', {
            duration,
            rows: result.rowCount,
            query: text.substring(0, 100)
        });

        return result;
    } catch (error) {
        logger.error('Query failed', error as Error, {
            query: text.substring(0, 100),
            params: params ? 'provided' : 'none'
        });
        throw Errors.database('Database query failed', error as Error);
    }
}

/**
 * Get a client from the pool (for transactions)
 */
export async function getClient(): Promise<PoolClient> {
    const pool = getPool();
    try {
        return await pool.connect();
    } catch (error) {
        logger.error('Failed to get database client', error as Error);
        throw Errors.database('Failed to acquire database connection', error as Error);
    }
}

/**
 * Execute within a transaction
 */
export async function transaction<T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await getClient();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        logger.debug('Transaction committed');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.warn('Transaction rolled back', { error: (error as Error).message });
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();

    try {
        await query('SELECT 1');
        const latency = Date.now() - start;
        return { healthy: true, latency };
    } catch (error) {
        return {
            healthy: false,
            error: (error as Error).message
        };
    }
}

/**
 * Close the pool
 */
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('PostgreSQL pool closed');
    }
}
