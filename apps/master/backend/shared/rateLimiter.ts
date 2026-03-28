// backend/shared/rateLimiter.ts
import { Request, Response, NextFunction } from 'express';
import * as errorHandler from './errorHandler';
import AuditLogger from './auditLogger';

const DEFAULT_LIMIT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
const STRICT_LIMIT = 5;
const WINDOW_MS = 60 * 1000;

interface RateLimitRecord {
    count: number;
    startTime: number;
}

let auditLogger: AuditLogger | null = null;

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
    setInterval(cleanup, windowMs);

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
