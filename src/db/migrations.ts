/**
 * MIGRATION RUNNER
 * 
 * Executes SQL migrations in order.
 * STACK LOCK: POSTGRESQL
 */

import * as fs from 'fs';
import * as path from 'path';
import { query, transaction, getClient } from '../core/connectors/postgres';
import { createLogger } from '../core/logger';

const logger = createLogger('MIGRATIONS');

/**
 * Create migrations tracking table
 */
async function createMigrationsTable(): Promise<void> {
    await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
    logger.info('Migrations table ready');
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(): Promise<Set<string>> {
    const result = await query(`
    SELECT migration_name FROM schema_migrations ORDER BY id
  `);

    return new Set(result.rows.map(r => r.migration_name));
}

/**
 * Get pending migrations from filesystem
 */
function getPendingMigrations(executedMigrations: Set<string>): string[] {
    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
        logger.warn('Migrations directory not found', { path: migrationsDir });
        return [];
    }

    const allMigrations = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

    return allMigrations.filter(m => !executedMigrations.has(m));
}

/**
 * Execute a single migration
 */
async function executeMigration(migrationName: string): Promise<void> {
    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    const migrationPath = path.join(migrationsDir, migrationName);

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    logger.info('Executing migration', { migration: migrationName });

    await transaction(async (client) => {
        // Execute migration SQL
        await client.query(sql);

        // Record migration
        await client.query(
            'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
            [migrationName]
        );
    });

    logger.info('Migration completed', { migration: migrationName });
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
    logger.info('Starting migration process');

    await createMigrationsTable();

    const executedMigrations = await getExecutedMigrations();
    const pendingMigrations = getPendingMigrations(executedMigrations);

    if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
    }

    logger.info(`Found ${pendingMigrations.length} pending migrations`, {
        migrations: pendingMigrations
    });

    for (const migration of pendingMigrations) {
        try {
            await executeMigration(migration);
        } catch (error) {
            logger.error('Migration failed', error as Error, {
                migration,
                pendingCount: pendingMigrations.length
            });
            throw error;
        }
    }

    logger.info('All migrations completed successfully', {
        count: pendingMigrations.length
    });
}

/**
 * CLI entry point
 */
if (require.main === module) {
    runMigrations()
        .then(() => {
            logger.info('Migration process complete');
            process.exit(0);
        })
        .catch((error) => {
            logger.fatal('Migration process failed', error);
            process.exit(1);
        });
}
