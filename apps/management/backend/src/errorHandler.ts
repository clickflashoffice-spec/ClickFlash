export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT: "RATE_LIMIT",
  DATABASE_ERROR: "DATABASE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  CONFLICT: "CONFLICT",
};

export function createErrorResponse(
  status: number,
  title: string,
  message: string,
  code?: string,
  details?: any,
) {
  return new Response(
    JSON.stringify({
      error: {
        status,
        code: code || ERROR_CODES.INTERNAL_ERROR,
        title,
        message,
        details,
      },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export function sendValidationError(message: string, details?: any) {
  return createErrorResponse(
    400,
    "Validation Error",
    message,
    ERROR_CODES.VALIDATION_ERROR,
    details,
  );
}

export function sendAuthError(message: string) {
  return createErrorResponse(
    401,
    "Unauthorized",
    message,
    ERROR_CODES.AUTH_ERROR,
  );
}

export function sendNotFoundError(
  resource: string = "Resource",
  context: string = "",
) {
  return createErrorResponse(
    404,
    "Not Found",
    `${resource} not found.`,
    ERROR_CODES.NOT_FOUND,
    { context },
  );
}

export function sendDatabaseError(error: Error, operation: string = "") {
  return createErrorResponse(
    500,
    "Database Error",
    `An error occurred ${operation}.`,
    ERROR_CODES.DATABASE_ERROR,
    { message: error.message },
  );
}

export function sendInternalError(error: Error, context: string = "") {
  return createErrorResponse(
    500,
    "Internal Server Error",
    "An unexpected error occurred.",
    ERROR_CODES.INTERNAL_ERROR,
    { message: error.message, context },
  );
}
