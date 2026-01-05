/**
 * CONNECTORS INDEX
 * 
 * Exports all connector modules and provides unified health check.
 */

export * as postgres from './postgres';
export * as pubsub from './pubsub';
export * as firebaseAuth from './firebaseAuth';
export * as bigquery from './bigquery';

import * as postgres from './postgres';
import * as pubsub from './pubsub';
import * as firebaseAuth from './firebaseAuth';
import * as bigquery from './bigquery';

/**
 * Health check for all connectors
 */
export async function healthCheckAll(): Promise<{
    postgres: { healthy: boolean; latency?: number; error?: string };
    pubsub: { healthy: boolean; error?: string };
    firebaseAuth: { healthy: boolean; error?: string };
    bigquery: { healthy: boolean; error?: string };
}> {
    const [postgresHealth, pubsubHealth, firebaseHealth, bigqueryHealth] = await Promise.all([
        postgres.healthCheck(),
        pubsub.healthCheck(),
        firebaseAuth.healthCheck(),
        bigquery.healthCheck()
    ]);

    return {
        postgres: postgresHealth,
        pubsub: pubsubHealth,
        firebaseAuth: firebaseHealth,
        bigquery: bigqueryHealth
    };
}
