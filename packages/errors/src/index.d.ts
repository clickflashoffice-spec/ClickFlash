/**
 * @clickflash/errors
 * Standardized error types and error handling utilities for the ClickFlash ecosystem.
 */
export declare const ErrorCode: {
    readonly AUTH_FAILED: "AUTH_FAILED";
    readonly AUTH_EXPIRED: "AUTH_EXPIRED";
    readonly AUTH_FORBIDDEN: "AUTH_FORBIDDEN";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly CONFLICT: "CONFLICT";
    readonly DUPLICATE: "DUPLICATE";
    readonly SYNC_CONFLICT: "SYNC_CONFLICT";
    readonly SYNC_TIMEOUT: "SYNC_TIMEOUT";
    readonly SYNC_OFFLINE: "SYNC_OFFLINE";
    readonly LICENSE_EXPIRED: "LICENSE_EXPIRED";
    readonly LICENSE_INVALID: "LICENSE_INVALID";
    readonly LICENSE_REVOKED: "LICENSE_REVOKED";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly FILESYSTEM_ERROR: "FILESYSTEM_ERROR";
    readonly IPC_INVALID_CHANNEL: "IPC_INVALID_CHANNEL";
    readonly IPC_TIMEOUT: "IPC_TIMEOUT";
    readonly IPC_UNAUTHORIZED: "IPC_UNAUTHORIZED";
};
/** Union of all error code string values. */
export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];
export declare const errorCodeToStatus: Record<ErrorCodeType, number>;
export declare class AppError extends Error {
    readonly code: ErrorCodeType;
    readonly statusCode: number;
    readonly context?: Record<string, unknown>;
    readonly isOperational: boolean;
    readonly cause?: unknown;
    constructor(message: string, code?: ErrorCodeType, statusCode?: number, context?: Record<string, unknown>, isOperational?: boolean, cause?: unknown);
    /** Serialize to a plain JSON-safe object. */
    toJSON(): Record<string, unknown>;
    /** Reconstruct an AppError from a serialized JSON object. */
    static fromJSON(json: Record<string, unknown>): AppError;
}
/** Create a 404 Not Found error. */
export declare function notFound(resource: string, id?: string): AppError;
/** Create a 401 Unauthorized error. */
export declare function unauthorized(reason?: string): AppError;
/** Create a 403 Forbidden error. */
export declare function forbidden(reason?: string): AppError;
/** Create a 422 Validation error. Accepts a string message or a field→message map. */
export declare function validationError(details: string | Record<string, string>): AppError;
/** Create a 409 Conflict error. */
export declare function conflict(reason: string): AppError;
/** Create a 429 Rate Limited error. */
export declare function rateLimited(retryAfter?: number): AppError;
/** Create a 500 Internal error. Marked non-operational by default. */
export declare function internal(message: string, cause?: Error): AppError;
/** Type-guard: returns true if the value is an AppError instance. */
export declare function isAppError(error: unknown): error is AppError;
/**
 * Convert any thrown value into a safe, JSON-serializable error response.
 * Always returns `{ error: { code, message, statusCode } }`.
 */
export declare function toErrorResponse(error: unknown): {
    error: {
        code: string;
        message: string;
        statusCode: number;
        context?: Record<string, unknown>;
    };
};
/**
 * Wrap any thrown value into an AppError.
 * If it is already an AppError it is returned as-is.
 */
export declare function wrapError(error: unknown, fallbackMessage?: string): AppError;
