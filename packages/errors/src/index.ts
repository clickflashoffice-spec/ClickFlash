/**
 * @clickflash/errors
 * Standardized error types and error handling utilities for the ClickFlash ecosystem.
 */

// ---------------------------------------------------------------------------
// Error Codes
// ---------------------------------------------------------------------------

export const ErrorCode = {
  // Auth
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',

  // Data
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE: 'DUPLICATE',

  // Sync
  SYNC_CONFLICT: 'SYNC_CONFLICT',
  SYNC_TIMEOUT: 'SYNC_TIMEOUT',
  SYNC_OFFLINE: 'SYNC_OFFLINE',

  // License
  LICENSE_EXPIRED: 'LICENSE_EXPIRED',
  LICENSE_INVALID: 'LICENSE_INVALID',
  LICENSE_REVOKED: 'LICENSE_REVOKED',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  FILESYSTEM_ERROR: 'FILESYSTEM_ERROR',

  // IPC
  IPC_INVALID_CHANNEL: 'IPC_INVALID_CHANNEL',
  IPC_TIMEOUT: 'IPC_TIMEOUT',
  IPC_UNAUTHORIZED: 'IPC_UNAUTHORIZED',
} as const;

/** Union of all error code string values. */
export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

// ---------------------------------------------------------------------------
// Error Code → HTTP Status Mapping
// ---------------------------------------------------------------------------

export const errorCodeToStatus: Record<ErrorCodeType, number> = {
  AUTH_FAILED: 401,
  AUTH_EXPIRED: 401,
  AUTH_FORBIDDEN: 403,
  VALIDATION_FAILED: 422,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  DUPLICATE: 409,
  SYNC_CONFLICT: 409,
  SYNC_TIMEOUT: 504,
  SYNC_OFFLINE: 503,
  LICENSE_EXPIRED: 402,
  LICENSE_INVALID: 403,
  LICENSE_REVOKED: 403,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  NETWORK_ERROR: 502,
  FILESYSTEM_ERROR: 500,
  IPC_INVALID_CHANNEL: 400,
  IPC_TIMEOUT: 504,
  IPC_UNAUTHORIZED: 403,
};

// ---------------------------------------------------------------------------
// AppError Class
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.INTERNAL_ERROR,
    statusCode?: number,
    context?: Record<string, unknown>,
    isOperational: boolean = true,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode ?? errorCodeToStatus[code] ?? 500;
    this.context = context;
    this.isOperational = isOperational;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }

  /** Serialize to a plain JSON-safe object. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      isOperational: this.isOperational,
      cause: this.cause,
      stack: this.stack,
    };
  }

  /** Reconstruct an AppError from a serialized JSON object. */
  static fromJSON(json: Record<string, unknown>): AppError {
    const error = new AppError(
      (json.message as string) || 'Unknown error',
      (json.code as ErrorCodeType) || ErrorCode.INTERNAL_ERROR,
      (json.statusCode as number) || 500,
      json.context as Record<string, unknown> | undefined,
      json.isOperational !== undefined ? (json.isOperational as boolean) : true,
      json.cause
    );
    if (json.stack) {
      error.stack = json.stack as string;
    }
    return error;
  }
}

// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------

/** Create a 404 Not Found error. */
export function notFound(resource: string, id?: string): AppError {
  const message = id
    ? `${resource} with id ${id} not found`
    : `${resource} not found`;
  return new AppError(message, ErrorCode.NOT_FOUND, 404, { resource, id });
}

/** Create a 401 Unauthorized error. */
export function unauthorized(reason?: string): AppError {
  return new AppError(
    reason ?? 'Unauthorized',
    ErrorCode.AUTH_FAILED,
    401,
  );
}

/** Create a 403 Forbidden error. */
export function forbidden(reason?: string): AppError {
  return new AppError(
    reason ?? 'Forbidden',
    ErrorCode.AUTH_FORBIDDEN,
    403,
  );
}

/** Create a 422 Validation error. Accepts a string message or a field→message map. */
export function validationError(
  details: string | Record<string, string>,
): AppError {
  if (typeof details === 'string') {
    return new AppError(details, ErrorCode.VALIDATION_FAILED, 422);
  }
  return new AppError('Validation failed', ErrorCode.VALIDATION_FAILED, 422, details);
}

/** Create a 409 Conflict error. */
export function conflict(reason: string): AppError {
  return new AppError(reason, ErrorCode.CONFLICT, 409);
}

/** Create a 429 Rate Limited error. */
export function rateLimited(retryAfter?: number): AppError {
  return new AppError(
    'Rate limit exceeded',
    ErrorCode.RATE_LIMITED,
    429,
    retryAfter !== undefined ? { retryAfter } : undefined,
  );
}

/** Create a 500 Internal error. Marked non-operational by default. */
export function internal(message: string, cause?: Error): AppError {
  return new AppError(
    message,
    ErrorCode.INTERNAL_ERROR,
    500,
    undefined,
    false,
    cause,
  );
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/** Type-guard: returns true if the value is an AppError instance. */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any thrown value into a safe, JSON-serializable error response.
 * Always returns `{ error: { code, message, statusCode } }`.
 */
export function toErrorResponse(error: unknown): {
  error: { code: string; message: string; statusCode: number; context?: Record<string, unknown> };
} {
  if (isAppError(error)) {
    return {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        context: error.context,
      },
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message,
        statusCode: 500,
      },
    };
  }

  return {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: String(error),
      statusCode: 500,
    },
  };
}

/**
 * Wrap any thrown value into an AppError.
 * If it is already an AppError it is returned as-is.
 */
export function wrapError(
  error: unknown,
  fallbackMessage: string = 'An unexpected error occurred',
): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  return new AppError(
    message,
    ErrorCode.INTERNAL_ERROR,
    500,
    undefined,
    false,
    error,
  );
}
