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
  headers?: Record<string, string>,
) {
  const responseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (headers) {
    Object.assign(responseHeaders, headers);
  }

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
      headers: responseHeaders,
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
  // Sanitize: never leak error internals in production (Task 2.4)
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";
  console.error(`[DatabaseError] [${operation}]`, error);
  
  return createErrorResponse(
    500,
    "Database Error",
    isDev ? `Database error during ${operation}: ${error.message}` : "A database error occurred while processing your request.",
    ERROR_CODES.DATABASE_ERROR,
    isDev ? { message: error.message, operation } : undefined,
  );
}

export function sendInternalError(error: Error, context: string = "") {
  // Sanitize: never leak error internals in production (Task 2.4)
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";
  console.error(`[InternalError] [${context}]`, error);
  
  return createErrorResponse(
    500,
    "Internal Server Error",
    isDev ? `Internal error: ${error.message}` : "An unexpected service error occurred. Please try again later.",
    ERROR_CODES.INTERNAL_ERROR,
    isDev ? { message: error.message, stack: error.stack, context } : undefined,
  );
}
