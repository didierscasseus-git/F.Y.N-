/**
 * STRUCTURED LOGGING FORMAT
 * 
 * All logs must follow this structured format.
 * Supports multiple log levels and contextual data.
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    FATAL = 'FATAL'
}

export interface LogEntry {
    level: LogLevel;
    timestamp: string;
    message: string;
    module?: string;
    context?: Record<string, any>;
    error?: {
        code?: string;
        message: string;
        stack?: string;
    };
    requestId?: string;
    userId?: string;
    duration?: number;
}

/**
 * Structured Logger
 */
export class Logger {
    private module: string;

    constructor(module: string) {
        this.module = module;
    }

    /**
     * Format and output log entry
     */
    private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
        const entry: LogEntry = {
            level,
            timestamp: new Date().toISOString(),
            message,
            module: this.module,
            ...(context && { context }),
            ...(error && {
                error: {
                    message: error.message,
                    stack: error.stack,
                    ...(error instanceof Error && 'code' in error && { code: (error as any).code })
                }
            })
        };

        // Output as JSON for production, pretty for dev
        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify(entry));
        } else {
            const prefix = `[${entry.level}] [${entry.module}] ${entry.timestamp}`;
            console.log(prefix, message, context || '');
            if (error) {
                console.error(error);
            }
        }
    }

    debug(message: string, context?: Record<string, any>) {
        this.log(LogLevel.DEBUG, message, context);
    }

    info(message: string, context?: Record<string, any>) {
        this.log(LogLevel.INFO, message, context);
    }

    warn(message: string, context?: Record<string, any>) {
        this.log(LogLevel.WARN, message, context);
    }

    error(message: string, error?: Error, context?: Record<string, any>) {
        this.log(LogLevel.ERROR, message, context, error);
    }

    fatal(message: string, error?: Error, context?: Record<string, any>) {
        this.log(LogLevel.FATAL, message, context, error);
    }
}

/**
 * Create logger for module
 */
export function createLogger(module: string): Logger {
    return new Logger(module);
}

/**
 * Default system logger
 */
export const systemLogger = new Logger('SYSTEM');
