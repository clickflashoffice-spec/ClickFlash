// backend/middleware/rateLimiting.ts
// Rate Limiting Middleware

import { Request, Response, NextFunction } from 'express';
import rateLimiter from '../middleware/rateLimiter';

/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse by limiting request frequency.
 * Uses the shared rateLimiter service with configurable limits.
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): boolean | void {
    const clientIp = req.socket.remoteAddress || 'unknown';

    // Check rate limit
    // Bypass for localhost ONLY in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === 'localhost' || clientIp === '::ffff:127.0.0.1')) {
        if (next) next();
        return true;
    }

    // Check limit
    // rateLimiter exported from shared is the middleware function.
    // Wait, shared/rateLimiter.ts exports a middleware function `rateLimiter(req, res, next)`.
    // It does NOT export `checkLimit`. The logic is inside the middleware.
    // The original `rateLimiting.js` seemed to use `rateLimiter.checkLimit(clientIp)`.
    // Let's check shared/rateLimiter.ts again.
    // It has `ipCounters` but `rateLimiter` function does the check AND sends response.

    // If I use the shared rateLimiter middleware directly, I don't need this wrapper middleware unless I want custom logging/bypassing logic that shared doesn't provided.
    // However, shared `rateLimiter.ts` ALREADY has localhost bypass and checks.
    // The only difference is logging `logger.warn` if provided. Shared `rateLimiter.ts` takes `auditLogger`.

    // The original code:
    /*
    if (!rateLimiter.checkLimit(clientIp)) {
        if (logger) { logger.warn... }
        sendRateLimitError(res);
        return false;
    }
    */

    // Since `shared/rateLimiter.ts` is now a middleware function, I should probably just use it or export `checkLimit` if I want to keep this wrapper structure.
    // Or I can just call the middleware.

    return rateLimiter(req, res, next);
}

/**
 * Initialize rate limiter with configuration
 */
export function initRateLimiter(): boolean {
    // Rate limiter is already initialized in shared/rateLimiter
    // This function exists for future configuration needs
    return true;
}
