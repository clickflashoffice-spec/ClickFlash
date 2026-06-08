// backend/rateLimiter.js
// Simple in-memory rate limiter (fixed window)
// Limits requests per IP per minute (default 100). Adjust via env vars.

const DEFAULT_LIMIT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
const WINDOW_MS = 60 * 1000; // 1 minute

// Store request counts per IP
const ipCounters = new Map();

// Optional: Audit logger (will be set by server.js if available)
let auditLogger = null;

function setAuditLogger(logger) {
    auditLogger = logger;
}

// Endpoints that should be excluded from rate limiting
// These are typically health checks, file serving, or controlled refresh operations
const EXCLUDED_PATHS = [
    '/api/health',
    '/api/data/refresh', // Refresh endpoint is a controlled operation
    '/api/files/', // File serving endpoints
];

/**
 * Check if a path should be excluded from rate limiting
 * @param {string} pathname - The request pathname
 * @returns {boolean} true if path should be excluded
 */
function isExcludedPath(pathname) {
    if (!pathname) return false;
    return EXCLUDED_PATHS.some(excluded => pathname.startsWith(excluded));
}

function resetCounters() {
    const now = Date.now();
    for (const [ip, info] of ipCounters.entries()) {
        if (now - info.startTime >= WINDOW_MS) {
            ipCounters.delete(ip);
        }
    }
}

// Periodically clean up old entries
setInterval(resetCounters, WINDOW_MS);

/**
 * Rate limiting middleware compatible with the existing server implementation.
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {Function} next - callback to continue processing
 * @returns {boolean} true if request is allowed, false if rate limit exceeded (response sent)
 */
function rateLimiter(req, res, next) {
    // Check if this path should be excluded from rate limiting
    const pathname = req.url?.split('?')[0]; // Remove query string
    if (isExcludedPath(pathname)) {
        // Skip rate limiting for excluded paths
        next();
        return true;
    }

    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let record = ipCounters.get(ip);
    if (!record) {
        record = { count: 1, startTime: now };
        ipCounters.set(ip, record);
    } else {
        // If window expired, reset
        if (now - record.startTime >= WINDOW_MS) {
            record.count = 1;
            record.startTime = now;
        } else {
            record.count += 1;
        }
    }

    if (record.count > DEFAULT_LIMIT) {
        if (auditLogger) {
            auditLogger.logRateLimitExceeded(ip, req.url);
        }
        const errorHandler = require('./errorHandler');
        errorHandler.sendRateLimitError(res, `Rate limit exceeded. Maximum ${DEFAULT_LIMIT} requests per minute allowed. Please try again later.`);
        return false;
    }

    // Allowed
    next();
    return true;
}

module.exports = rateLimiter;
module.exports.setAuditLogger = setAuditLogger;
