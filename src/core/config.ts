/**
 * ENVIRONMENT CONFIGURATION LOADER
 * 
 * Loads environment-specific configuration from:
 * - Environment variables
 * - Secret Manager (production)
 * - Local .env files (development)
 */

export type Environment = 'dev' | 'staging' | 'prod';

export interface EnvironmentConfig {
    environment: Environment;
    port: number;
    database: {
        url: string;
        user: string;
        password: string;
    };
    firebase: {
        projectId: string;
        serviceAccountJson: string;
    };
    pubsub: {
        projectId: string;
    };
    bigquery: {
        projectId: string;
        dataset: string;
    };
}

/**
 * Get current environment
 */
export function getCurrentEnvironment(): Environment {
    const env = process.env.NODE_ENV || process.env.ENVIRONMENT || 'dev';

    if (env === 'production' || env === 'prod') return 'prod';
    if (env === 'staging') return 'staging';
    return 'dev';
}

/**
 * Load environment configuration
 * In production, this would load from Secret Manager
 * For now, loads from environment variables
 */
export function loadConfig(): EnvironmentConfig {
    const environment = getCurrentEnvironment();

    // Validate required variables
    const required = [
        'DATABASE_URL',
        'FIREBASE_PROJECT_ID',
        'PUBSUB_PROJECT_ID',
        'BIGQUERY_PROJECT_ID',
        'BIGQUERY_DATASET'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0 && environment !== 'dev') { // Allow missing in dev/test if mocks are used
        // In prod/staging, we must have these
        if (environment === 'prod' || environment === 'staging') {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    return {
        environment,
        port: parseInt(process.env.PORT || '3000', 10),
        database: {
            url: process.env.DATABASE_URL || 'postgres://localhost:5432/fyn_dev',
            user: process.env.DB_USER || 'fyn_user',
            password: process.env.DB_PASS || 'fyn_pass'
        },
        firebase: {
            projectId: process.env.FIREBASE_PROJECT_ID || 'fyn-os-dev',
            serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ''
        },
        pubsub: {
            projectId: process.env.PUBSUB_PROJECT_ID || 'fyn-os-dev'
        },
        bigquery: {
            projectId: process.env.BIGQUERY_PROJECT_ID || 'fyn-os-dev',
            dataset: process.env.BIGQUERY_DATASET || 'fyn_analytics'
        }
    };
}

/**
 * Singleton config instance
 */
let configInstance: EnvironmentConfig | null = null;

/**
 * Get configuration (cached)
 */
export function getConfig(): EnvironmentConfig {
    if (!configInstance) {
        configInstance = loadConfig();
    }
    return configInstance;
}

/**
 * Reset configuration (for testing)
 */
export function resetConfig(): void {
    configInstance = null;
}
