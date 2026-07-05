// backend/shared/rateLimiter.ts
import { Request, Response, NextFunction } from 'express';
import * as errorHandler from '../utils/errorHandler';
import AuditLogger from '../utils/auditLogger';

const DEFAULT_LIMIT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
const STRICT_LIMIT = 5;
const WINDOW_MS = 60 * 1000;

interface RateLimitRecord {
    count: number;
    startTime: number;
}

let auditLogger: AuditLogger | null = null;
const activeTimers: NodeJS.Timeout[] = [];

export function stopAllRateLimiterTimers(): void {
    for (const timer of activeTimers) {
        clearInterval(timer);
    }
    activeTimers.length = 0;
}

export function setAuditLogger(logger: AuditLogger): void {
    auditLogger = logger;
}

const EXCLUDED_PATHS = [
    '/api/health',
    '/api/data/refresh',
    '/api/files/',
];

function isExcludedPath(pathname: string | undefined): boolean {
    if (!pathname) return false;
    return EXCLUDED_PATHS.some(excluded => pathname.startsWith(excluded));
}

function createRateLimiter(limit: number, windowMs: number, type: 'DEFAULT' | 'STRICT') {
    const ipCounters = new Map<string, RateLimitRecord>();

    // Cleanup interval
    const cleanup = () => {
        const now = Date.now();
        for (const [ip, info] of ipCounters.entries()) {
            if (now - info.startTime >= windowMs) {
                ipCounters.delete(ip);
            }
        }
    };
    const timer = setInterval(cleanup, windowMs);
    if (timer.unref) {
        timer.unref();
    }
    activeTimers.push(timer);

    return function limitMiddleware(req: Request, res: Response, next: NextFunction): boolean | void {
        const pathname = req.url?.split('?')[0];
        if (isExcludedPath(pathname)) {
            next();
            return true;
        }

        const ip = req.socket.remoteAddress || 'unknown';
        const isLocal = ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === '::ffff:127.0.0.1';

        // Only bypass rate limiting for localhost in development or test mode
        if (isLocal && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
            next();
            return true;
        }

        const now = Date.now();
        let record = ipCounters.get(ip);
        if (!record) {
            record = { count: 1, startTime: now };
            ipCounters.set(ip, record);
        } else {
            if (now - record.startTime >= windowMs) {
                record.count = 1;
                record.startTime = now;
            } else {
                record.count += 1;
            }
        }

        if (record.count > limit) {
            if (auditLogger) {
                auditLogger.logRateLimitExceeded(ip, `${type}:${req.url || 'unknown'}`);
            }
            errorHandler.sendRateLimitError(res, `Rate limit exceeded. Maximum ${limit} requests per minute allowed.`);
            return false;
        }

        next();
        return true;
    };
}

const rateLimiter = createRateLimiter(DEFAULT_LIMIT, WINDOW_MS, 'DEFAULT');
export const strictRateLimiter = createRateLimiter(STRICT_LIMIT, WINDOW_MS, 'STRICT');

(rateLimiter as any).setAuditLogger = setAuditLogger;

export default rateLimiter;

function createUserRateLimiter(limit: number, windowMs: number) {
    const userCounters = new Map<string, RateLimitRecord>();

    // Cleanup interval — same pattern as IP-based limiters
    const cleanup = () => {
        const now = Date.now();
        for (const [key, info] of userCounters.entries()) {
            if (now - info.startTime >= windowMs) {
                userCounters.delete(key);
            }
        }
    };
    const timer = setInterval(cleanup, windowMs);
    if (timer.unref) {
        timer.unref();
    }
    activeTimers.push(timer);

    return function userLimitMiddleware(req: Request, res: Response, next: NextFunction): boolean | void {
        const pathname = req.url?.split('?')[0];
        if (isExcludedPath(pathname)) {
            next();
            return true;
        }

        const ip = req.socket.remoteAddress || 'unknown';
        const isLocal = ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === '::ffff:127.0.0.1';

        // Localhost bypass for dev/test — same as IP-based limiters
        if (isLocal && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
            next();
            return true;
        }

        // Key by authenticated user id or email; fall back to IP for unauthenticated requests
        const user = (req as any).user as { id?: string; email?: string } | undefined;
        const key: string = user?.id ?? user?.email ?? ip;

        const now = Date.now();
        let record = userCounters.get(key);
        if (!record) {
            record = { count: 1, startTime: now };
            userCounters.set(key, record);
        } else {
            if (now - record.startTime >= windowMs) {
                record.count = 1;
                record.startTime = now;
            } else {
                record.count += 1;
            }
        }

        if (record.count > limit) {
            if (auditLogger) {
                auditLogger.logRateLimitExceeded(key, `USER:${req.url || 'unknown'}`);
            }
            errorHandler.sendRateLimitError(res, `Rate limit exceeded. Maximum ${limit} requests per minute allowed.`);
            return false;
        }

        next();
        return true;
    };
}

export const userRateLimiter = createUserRateLimiter(200, WINDOW_MS);
