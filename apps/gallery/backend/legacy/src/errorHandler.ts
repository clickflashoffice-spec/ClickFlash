import { ServerResponse } from 'http';

/**
 * Standard error response format
 */
export interface ErrorResponse {
    error: string;
    message: string;
    code?: string;
    details?: any;
}

/**
 * Error codes for different error types
 */
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    FILE_ERROR: 'FILE_ERROR',
    INVALID_INPUT: 'INVALID_INPUT'
} as const;

/**
 * Send error response with consistent format
 */
export function sendError(
    res: ServerResponse,
    statusCode: number,
    errorType: string,
    message: string,
    code: string | null = null,
    details: any = null
) {
    const response: ErrorResponse = {
        error: errorType,
        message: message
    };

    if (code) {
        response.code = code;
    }

    if (details && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)) {
        response.details = details;
    }

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
}

export function sendValidationError(res: ServerResponse, message: string, details: any = null) {
    sendError(res, 400, 'Validation Error', message, ERROR_CODES.VALIDATION_ERROR, details);
}

export function sendAuthError(res: ServerResponse, message: string = 'Authentication required') {
    sendError(res, 401, 'Authentication Error', message, ERROR_CODES.AUTHENTICATION_ERROR);
}

export function sendAuthorizationError(res: ServerResponse, message: string = 'Insufficient permissions') {
    sendError(res, 403, 'Authorization Error', message, ERROR_CODES.AUTHORIZATION_ERROR);
}

export function sendNotFoundError(res: ServerResponse, resource: string = 'Resource') {
    sendError(res, 404, 'Not Found', `${resource} not found`, ERROR_CODES.NOT_FOUND);
}

export function sendConflictError(res: ServerResponse, message: string) {
    sendError(res, 409, 'Conflict', message, ERROR_CODES.CONFLICT);
}

export function sendRateLimitError(res: ServerResponse, message: string = 'Too many requests. Please try again later.') {
    sendError(res, 429, 'Rate Limit Exceeded', message, ERROR_CODES.RATE_LIMIT_EXCEEDED);
}

export function sendInternalError(res: ServerResponse, error: Error, context: string | null = null) {
    const message = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)
        ? `Internal server error: ${error.message}`
        : 'An internal error occurred. Please try again later.';

    const details = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)
        ? {
            message: error.message,
            stack: error.stack,
            context: context
        }
        : null;

    sendError(res, 500, 'Internal Server Error', message, ERROR_CODES.INTERNAL_ERROR, details);
}

export function sendDatabaseError(res: ServerResponse, error: Error, operation: string = 'database operation') {
    const message = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)
        ? `Database error during ${operation}: ${error.message}`
        : `Failed to complete ${operation}. Please try again.`;

    sendError(res, 500, 'Database Error', message, ERROR_CODES.DATABASE_ERROR,
        (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? { error: error.message } : null);
}

export function sendFileError(res: ServerResponse, message: string, code: string = ERROR_CODES.FILE_ERROR) {
    sendError(res, 400, 'File Error', message, code);
}

export function sendInvalidInputError(res: ServerResponse, message: string, details: any = null) {
    sendError(res, 400, 'Invalid Input', message, ERROR_CODES.INVALID_INPUT, details);
}
