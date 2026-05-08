// backend/shared/errorHandler.ts
import { Response } from 'express';

interface StandardResponse {
    error: string;
    message: string;
    code?: string;
    details?: any;
}

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

export function sendError(res: Response, statusCode: number, errorType: string, message: string, code: string | null = null, details: any = null): void {
    console.error(`[API ERROR] ${statusCode} ${errorType}: ${message}`, details ? { code, details } : { code });
    if (res.headersSent) {
        if (!res.writableEnded) {
            try { 
                res.end(); 
            } catch (e) { 
                console.error('[ErrorHandler] Failed to end response:', e instanceof Error ? e.message : String(e));
            }
        }
        return;
    }

    const response: StandardResponse = {
        error: errorType,
        message: message
    };

    if (code) response.code = code;
    if (details && process.env.NODE_ENV === 'development') response.details = details;

    try {
        res.status(statusCode).json(response);
    } catch (e) {
        if (!res.headersSent && !res.writableEnded) {
            try { 
                res.end(JSON.stringify(response)); 
            } catch (e2) { 
                console.error('[ErrorHandler] Failed to send error response:', e2 instanceof Error ? e2.message : String(e2));
            }
        }
    }
}

export function sendValidationError(res: Response, message: string, details: any = null): void {
    sendError(res, 400, 'Validation Error', message, ERROR_CODES.VALIDATION_ERROR, details);
}

export function sendAuthError(res: Response, message: string = 'Authentication required'): void {
    sendError(res, 401, 'Authentication Error', message, ERROR_CODES.AUTHENTICATION_ERROR);
}

export function sendAuthorizationError(res: Response, message: string = 'Insufficient permissions'): void {
    sendError(res, 403, 'Authorization Error', message, ERROR_CODES.AUTHORIZATION_ERROR);
}

export function sendNotFoundError(res: Response, resource: string = 'Resource'): void {
    sendError(res, 404, 'Not Found', `${resource} not found`, ERROR_CODES.NOT_FOUND);
}

export function sendConflictError(res: Response, message: string): void {
    sendError(res, 409, 'Conflict', message, ERROR_CODES.CONFLICT);
}

export function sendRateLimitError(res: Response, message: string = 'Too many requests. Please try again later.'): void {
    sendError(res, 429, 'Rate Limit Exceeded', message, ERROR_CODES.RATE_LIMIT_EXCEEDED);
}

export function sendInternalError(res: Response, error: any, context: any = null): void {
    const message = process.env.NODE_ENV === 'development'
        ? `Internal server error: ${error.message}`
        : 'An internal error occurred. Please try again later.';

    const details = process.env.NODE_ENV === 'development'
        ? { message: error.message, stack: error.stack, context: context }
        : null;

    sendError(res, 500, 'Internal Server Error', message, ERROR_CODES.INTERNAL_ERROR, details);
}

export function sendDatabaseError(res: Response, error: any, operation: string = 'database operation'): void {
    let message;
    if (process.env.NODE_ENV === 'development') {
        message = `Database error during ${operation}: ${error.message}`;
    } else {
        const errorMsg = error && error.message ? error.message : 'Unknown database error';
        if (errorMsg.includes('no such table') || errorMsg.includes('does not exist')) {
            message = `Database table error: ${errorMsg}. Please contact support or restart the server.`;
        } else {
            message = `Failed to complete ${operation}. ${errorMsg}`;
        }
    }

    sendError(res, 500, 'Database Error', message, ERROR_CODES.DATABASE_ERROR,
        process.env.NODE_ENV === 'development' ? { error: error.message, stack: error.stack } : null);
}

export function sendFileError(res: Response, message: string, code: string = ERROR_CODES.FILE_ERROR): void {
    sendError(res, 400, 'File Error', message, code);
}

export function sendInvalidInputError(res: Response, message: string, details: any = null): void {
    sendError(res, 400, 'Invalid Input', message, ERROR_CODES.INVALID_INPUT, details);
}
