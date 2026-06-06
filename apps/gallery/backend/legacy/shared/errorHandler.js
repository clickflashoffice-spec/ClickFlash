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
    // Check if headers have already been sent to prevent errors
    if (res.headersSent) {
        // Headers already sent, try to end the response if not already ended
        if (!res.writableEnded) {
            try {
                res.end();
            } catch (e) {
                // Response already ended or connection closed, ignore
            }
        }
        return;
    }

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

    try {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
    } catch (e) {
        // Headers may have been sent between check and writeHead, ignore error
        if (!res.headersSent && !res.writableEnded) {
            try {
                res.end(JSON.stringify(response));
            } catch (e2) {
                // Connection may be closed, ignore
            }
        }
    }
}

/**
 * Send validation error response (400 Bad Request)
 * Used when request data fails validation checks
 * 
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} message - Human-readable error message
 * @param {Array|Object} [details] - Validation error details (field-level errors)
 */
function sendValidationError(res, message, details = null) {
    sendError(res, 400, 'Validation Error', message, ERROR_CODES.VALIDATION_ERROR, details);
}

/**
 * Send authentication error response (401 Unauthorized)
 * Used when user is not authenticated or token is invalid
 * 
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} [message] - Error message (default: 'Authentication required')
 */
function sendAuthError(res, message = 'Authentication required') {
    sendError(res, 401, 'Authentication Error', message, ERROR_CODES.AUTHENTICATION_ERROR);
}

/**
 * Send authorization error response (403 Forbidden)
 * Used when user is authenticated but lacks required permissions
 * 
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} [message] - Error message (default: 'Insufficient permissions')
 */
function sendAuthorizationError(res, message = 'Insufficient permissions') {
    sendError(res, 403, 'Authorization Error', message, ERROR_CODES.AUTHORIZATION_ERROR);
}

/**
 * Send not found error response (404 Not Found)
 * Used when requested resource does not exist
 * 
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} [resource] - Resource name (default: 'Resource')
 */
function sendNotFoundError(res, resource = 'Resource') {
    sendError(res, 404, 'Not Found', `${resource} not found`, ERROR_CODES.NOT_FOUND);
}

/**
 * Send conflict error response (409 Conflict)
 * Used for duplicate entries, optimistic locking conflicts, etc.
 * 
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} message - Error message describing the conflict
 */
function sendConflictError(res, message) {
    sendError(res, 409, 'Conflict', message, ERROR_CODES.CONFLICT);
}

/**
 * Send rate limit error response (429 Too Many Requests)
 * Used when client exceeds rate limit thresholds
 * 
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} [message] - Error message (default: 'Too many requests. Please try again later.')
 */
function sendRateLimitError(res, message = 'Too many requests. Please try again later.') {
    sendError(res, 429, 'Rate Limit Exceeded', message, ERROR_CODES.RATE_LIMIT_EXCEEDED);
}

/**
 * Send internal server error response
 * @param {http.ServerResponse} res - HTTP response object
 * @param {Error} error - Error object
 * @param {string} [context] - Additional context about where the error occurred
 */
function sendInternalError(res, error, context = null) {
    const message = process.env.NODE_ENV === 'development' 
        ? `Internal server error: ${error.message}`
        : 'An internal error occurred. Please try again later.';

    const details = process.env.NODE_ENV === 'development' 
        ? { 
            message: error.message, 
            stack: error.stack,
            context: context 
        }
        : null;

    sendError(res, 500, 'Internal Server Error', message, ERROR_CODES.INTERNAL_ERROR, details);
}

/**
 * Send database error response (500 Internal Server Error)
 * Used for database operation failures (connection, query errors, etc.)
 * 
 * @param {http.ServerResponse} res - HTTP response object
 * @param {Error} error - Error object from database operation
 * @param {string} [operation] - Description of the operation that failed
 */
function sendDatabaseError(res, error, operation = 'database operation') {
    const message = process.env.NODE_ENV === 'development'
        ? `Database error during ${operation}: ${error.message}`
        : `Failed to complete ${operation}. Please try again.`;

    sendError(res, 500, 'Database Error', message, ERROR_CODES.DATABASE_ERROR, 
        process.env.NODE_ENV === 'development' ? { error: error.message } : null);
}

/**
 * Send file error response (400 Bad Request)
 * Used for file upload/download/processing errors
 * 
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} message - Error message
 * @param {string} [code] - Error code (default: ERROR_CODES.FILE_ERROR)
 */
function sendFileError(res, message, code = ERROR_CODES.FILE_ERROR) {
    sendError(res, 400, 'File Error', message, code);
}

/**
 * Send invalid input error response (400 Bad Request)
 * Used for invalid input data that doesn't pass validation
 * 
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} message - Error message
 * @param {Object} [details] - Additional error details
 */
function sendInvalidInputError(res, message, details = null) {
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

