/**
 * STANDARD ERROR FORMAT
 * 
 * All errors must use this format.
 * NO SILENT FAILURES.
 */

export enum ErrorCode {
    // Auth & Permission
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',

    // Validation
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',

    // Resource
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    CONFLICT = 'CONFLICT',

    // Business Logic
    INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
    DEPENDENCY_NOT_SATISFIED = 'DEPENDENCY_NOT_SATISFIED',
    OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

    // External Services
    DATABASE_ERROR = 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
    PUBSUB_ERROR = 'PUBSUB_ERROR',
    FIREBASE_ERROR = 'FIREBASE_ERROR',
    BIGQUERY_ERROR = 'BIGQUERY_ERROR',

    // Internal
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    NOT_IMPLEMENTED = 'NOT_IMPLEMENTED'
}

/**
 * Standard Application Error
 */
export class StandardError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly context?: Record<string, any>;
    public readonly timestamp: string;

    constructor(
        code: ErrorCode,
        message: string,
        statusCode: number = 500,
        context?: Record<string, any>
    ) {
        super(message);
        this.name = 'StandardError';
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.timestamp = new Date().toISOString();

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert to JSON response format
     */
    toJSON() {
        return {
            status: 'error',
            code: this.code,
            message: this.message,
            timestamp: this.timestamp,
            ...(this.context && { context: this.context })
        };
    }
}

/**
 * Error factory functions
 */
export class Errors {
    static unauthorized(message: string = 'Unauthorized', context?: Record<string, any>) {
        return new StandardError(ErrorCode.UNAUTHORIZED, message, 401, context);
    }

    static forbidden(message: string = 'Forbidden', context?: Record<string, any>) {
        return new StandardError(ErrorCode.FORBIDDEN, message, 403, context);
    }

    static notFound(resource: string, id?: string) {
        return new StandardError(
            ErrorCode.NOT_FOUND,
            `${resource}${id ? ` with id ${id}` : ''} not found`,
            404,
            { resource, id }
        );
    }

    static validation(message: string, fields?: Record<string, string>) {
        return new StandardError(
            ErrorCode.VALIDATION_ERROR,
            message,
            400,
            { fields }
        );
    }

    static conflict(message: string, context?: Record<string, any>) {
        return new StandardError(ErrorCode.CONFLICT, message, 409, context);
    }

    static invalidStateTransition(from: string, to: string) {
        return new StandardError(
            ErrorCode.INVALID_STATE_TRANSITION,
            `Invalid state transition from ${from} to ${to}`,
            400,
            { from, to }
        );
    }

    static operationNotAllowed(operation: string, reason: string) {
        return new StandardError(
            ErrorCode.OPERATION_NOT_ALLOWED,
            `Operation ${operation} not allowed: ${reason}`,
            403,
            { operation, reason }
        );
    }

    static database(message: string, originalError?: Error) {
        return new StandardError(
            ErrorCode.DATABASE_ERROR,
            message,
            500,
            { originalError: originalError?.message }
        );
    }

    static internal(message: string = 'Internal server error', context?: Record<string, any>) {
        return new StandardError(ErrorCode.INTERNAL_ERROR, message, 500, context);
    }

    static notImplemented(feature: string) {
        return new StandardError(
            ErrorCode.NOT_IMPLEMENTED,
            `Feature not implemented: ${feature}`,
            501,
            { feature }
        );
    }
}

/**
 * Error handler middleware type
 */
export type ErrorHandler = (error: Error) => void;
