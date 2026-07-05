/**
 * apiError.ts — typed, throwable error class for Express routes.
 *
 * Usage (Pattern C → produces same response shape as sendError):
 *   throw new ApiError(400, 'Email is required', 'VALIDATION_ERROR');
 *   throw new ApiError(404, 'Order not found', 'NOT_FOUND');
 *   throw new ApiError(409, 'Duplicate entry', 'CONFLICT');
 *
 * The global error middleware in server.ts detects ApiError instances
 * and formats them using the same StandardResponse shape as errorHandler.ts.
 * Non-ApiError throws fall through to the existing 500 handler.
 *
 * Import in routes:
 *   import { ApiError } from '../utils/apiError';
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from './logger';
import { ERROR_CODES } from './errorHandler';

export type ErrorCode = keyof typeof ERROR_CODES;

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code: ErrorCode = 'INTERNAL_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = ERROR_CODES[code];
    this.details = details;

    // Maintains proper prototype chain in transpiled ES5
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** Convenience factories matching the most common patterns */
  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, 'VALIDATION_ERROR', details);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, message, 'AUTHENTICATION_ERROR');
  }

  static forbidden(message = 'Insufficient permissions'): ApiError {
    return new ApiError(403, message, 'AUTHORIZATION_ERROR');
  }

  static notFound(resource = 'Resource'): ApiError {
    return new ApiError(404, `${resource} not found`, 'NOT_FOUND');
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message, 'CONFLICT');
  }
}

/**
 * Express error middleware — wire this AFTER all routes in server.ts.
 * Replaces the anonymous `(err, req, res, next)` handler so that ApiError
 * instances get a clean JSON response with the correct status code, while
 * all other unhandled errors still get a generic 500.
 *
 * @param appLogger - the Logger instance already created in server.ts
 */
export function createErrorMiddleware(appLogger: Logger) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof ApiError) {
      // Intentional, structured error — log at warn level (not error)
      appLogger.warn('[ApiError]', {
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
        url: req.url,
        method: req.method,
      });

      if (res.headersSent) return;

      const body: Record<string, unknown> = {
        error: err.name,
        message: err.message,
        code: err.code,
      };
      if (err.details && process.env.NODE_ENV === 'development') {
        body.details = err.details;
      }
      res.status(err.statusCode).json(body);
      return;
    }

    // Unhandled / unexpected error — existing 500 behaviour
    const error = err instanceof Error ? err : new Error(String(err));
    appLogger.error('Unhandled Server Error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });

    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
}
