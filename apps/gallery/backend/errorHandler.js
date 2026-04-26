// backend/errorHandler.js
// Centralized error handling utility for consistent error responses

/**
 * Standard error response format
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error type/category
 * @property {string} message - Human-readable error message
 * @property {string} [code] - Error code for programmatic handling
 * @property {Object} [details] - Additional error details (development only)
 */

/**
 * Error codes for different error types
 */
const ERROR_CODES = {
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
};

/**
 * Send error response with consistent format
 * @param {http.ServerResponse} res - HTTP response object
 * @param {number} statusCode - HTTP status code
 * @param {string} errorType - Error type/category
 * @param {string} message - Human-readable error message
 * @param {string} [code] - Error code
 * @param {Object} [details] - Additional details (only in development)
 */
function sendError(res, statusCode, errorType, message, code = null, details = null) {
    const response = {
        error: errorType,
        message: message
    };

    if (code) {
        response.code = code;
    }

    // Include details in development mode
    if (details && process.env.NODE_ENV === 'development') {
        response.details = details;
    }

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
}

/**
 * Send validation error response
 */
function sendValidationError(res, message, details = null) {
    sendError(res, 400, 'Validation Error', message, ERROR_CODES.VALIDATION_ERROR, details);
}

/**
 * Send authentication error response
 */
function sendAuthError(res, message = 'Authentication required') {
    sendError(res, 401, 'Authentication Error', message, ERROR_CODES.AUTHENTICATION_ERROR);
}

/**
 * Send authorization error response
 */
function sendAuthorizationError(res, message = 'Insufficient permissions') {
    sendError(res, 403, 'Authorization Error', message, ERROR_CODES.AUTHORIZATION_ERROR);
}

/**
 * Send not found error response
 */
function sendNotFoundError(res, resource = 'Resource') {
    sendError(res, 404, 'Not Found', `${resource} not found`, ERROR_CODES.NOT_FOUND);
}

/**
 * Send conflict error response (e.g., duplicate entry)
 */
function sendConflictError(res, message) {
    sendError(res, 409, 'Conflict', message, ERROR_CODES.CONFLICT);
}

/**
 * Send rate limit error response
 */
function sendRateLimitError(res, message = 'Too many requests. Please try again later.') {
    sendError(res, 429, 'Rate Limit Exceeded', message, ERROR_CODES.RATE_LIMIT_EXCEEDED);
}

/**
 * Send internal server error response
 */
function sendInternalError(res, error, context = null) {
    const isDev = process.env.NODE_ENV === 'development';
    
    // In production, mask the actual error message
    const message = isDev 
        ? `Internal server error: ${error.message}`
        : 'An unexpected internal error occurred. Please contact support.';

    const details = isDev 
        ? { 
            message: error.message, 
            stack: error.stack,
            context: context 
        }
        : null;

    sendError(res, 500, 'Internal Server Error', message, ERROR_CODES.INTERNAL_ERROR, details);
}

/**
 * Send database error response
 */
function sendDatabaseError(res, error, operation = 'database operation') {
    const isDev = process.env.NODE_ENV === 'development';
    
    // Production: Generic message, hide operation and raw error
    const message = isDev
        ? `Database error during ${operation}: ${error.message}`
        : 'A database error occurred while processing your request.';

    sendError(res, 500, 'Database Error', message, ERROR_CODES.DATABASE_ERROR, 
        isDev ? { error: error.message, operation } : null);
}

/**
 * Send file error response
 */
function sendFileError(res, message, code = ERROR_CODES.FILE_ERROR) {
    // Filesystem errors can leak paths, sanitize
    const isDev = process.env.NODE_ENV === 'development';
    const sanitizedMessage = isDev ? message : 'File processing error occurred.';
    sendError(res, 400, 'File Error', sanitizedMessage, code);
}

/**
 * Send invalid input error response
 */
function sendInvalidInputError(res, message, details = null) {
    // Input validation errors are generally safe to show as they usually reflect user input
    sendError(res, 400, 'Invalid Input', message, ERROR_CODES.INVALID_INPUT, details);
}

module.exports = {
    sendError,
    sendValidationError,
    sendAuthError,
    sendAuthorizationError,
    sendNotFoundError,
    sendConflictError,
    sendRateLimitError,
    sendInternalError,
    sendDatabaseError,
    sendFileError,
    sendInvalidInputError,
    ERROR_CODES
};

