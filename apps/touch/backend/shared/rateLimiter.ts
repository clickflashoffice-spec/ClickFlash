// backend/shared/rateLimiter.ts
import { Request, Response, NextFunction } from 'express';
import * as errorHandler from './errorHandler';
import AuditLogger from './auditLogger';

const DEFAULT_LIMIT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
const WINDOW_MS = 60 * 1000;

interface RateLimitRecord {
    count: number;
    startTime: number;
    blocked: boolean;
}

const ipCounters = new Map<string, RateLimitRecord>();
let auditLogger: AuditLogger | null = null;

// Progressive blocking: block IP entirely after repeated violations
const BLOCK_THRESHOLD = 3; // Block after 3 rate limit hits
const BLOCK_DURATION_MS = 5 * 60 * 1000; // Block for 5 minutes
const blockedIPs = new Map<string, number>();

const STRICT_LIMIT = 5;
const strictIpCounters = new Map<string, RateLimitRecord>();
const strictBlockedIPs = new Map<string, number>();

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

function cleanupExpiredRecords(): void {
    const now = Date.now();
    for (const [ip, info] of ipCounters.entries()) {
        if (now - info.startTime >= WINDOW_MS) {
            ipCounters.delete(ip);
        }
    }
    // Clean up blocked IPs
    for (const [ip, blockedUntil] of blockedIPs.entries()) {
        if (now >= blockedUntil) {
            blockedIPs.delete(ip);
        }
    }
}

const intervalId = setInterval(cleanupExpiredRecords, WINDOW_MS);

export function rateLimiter(req: Request, res: Response, next: NextFunction): boolean | void {
    const pathname = req.url?.split('?')[0];
    if (isExcludedPath(pathname)) {
        next();
        return true;
    }

    const ip = req.socket.remoteAddress || 'unknown';
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === '::ffff:127.0.0.1') {
        next();
        return true;
    }

    // Check if IP is blocked
    const blockedUntil = blockedIPs.get(ip);
    if (blockedUntil && Date.now() < blockedUntil) {
        errorHandler.sendRateLimitError(res, 'IP temporarily blocked due to repeated violations.');
        return false;
    }

    const now = Date.now();
    let record = ipCounters.get(ip);
    if (!record) {
        record = { count: 1, startTime: now, blocked: false };
        ipCounters.set(ip, record);
    } else {
        if (now - record.startTime >= WINDOW_MS) {
            record.count = 1;
            record.startTime = now;
            record.blocked = false;
        } else {
            record.count += 1;
        }
    }

    if (record.count > DEFAULT_LIMIT) {
        if (auditLogger) {
            auditLogger.logRateLimitExceeded(ip, req.url || 'unknown');
        }
        
        // Track violations for progressive blocking
        if (!record.blocked) {
            const existingViolations = Math.floor((record.count - DEFAULT_LIMIT) / DEFAULT_LIMIT);
            if (existingViolations >= BLOCK_THRESHOLD) {
                blockedIPs.set(ip, Date.now() + BLOCK_DURATION_MS);
                record.blocked = true;
                if (auditLogger) {
                    auditLogger.logUnauthorizedAccess(req.url || 'unknown', ip, 'IP_BLOCKED_RATE_LIMIT');
                }
                errorHandler.sendRateLimitError(res, `IP temporarily blocked for ${BLOCK_DURATION_MS / 1000} seconds.`);
                return false;
            }
        }
        
        errorHandler.sendRateLimitError(res, `Rate limit exceeded. Maximum ${DEFAULT_LIMIT} requests per minute allowed.`);
        return false;
    }

    next();
    return true;
}

export function strictRateLimiter(req: Request, res: Response, next: NextFunction): boolean | void {
    const ip = req.socket.remoteAddress || 'unknown';
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === '::ffff:127.0.0.1') {
        next();
        return true;
    }

    const blockedUntil = strictBlockedIPs.get(ip);
    if (blockedUntil && Date.now() < blockedUntil) {
        errorHandler.sendRateLimitError(res, 'IP temporarily blocked due to repeated violations.');
        return false;
    }

    const now = Date.now();
    let record = strictIpCounters.get(ip);
    if (!record) {
        record = { count: 1, startTime: now, blocked: false };
        strictIpCounters.set(ip, record);
    } else {
        if (now - record.startTime >= WINDOW_MS) {
            record.count = 1;
            record.startTime = now;
            record.blocked = false;
        } else {
            record.count += 1;
        }
    }

    if (record.count > STRICT_LIMIT) {
        if (auditLogger) {
            auditLogger.logRateLimitExceeded(ip, req.url || 'unknown');
        }

        if (!record.blocked) {
            const existingViolations = Math.floor((record.count - STRICT_LIMIT) / STRICT_LIMIT);
            if (existingViolations >= BLOCK_THRESHOLD) {
                strictBlockedIPs.set(ip, Date.now() + BLOCK_DURATION_MS);
                record.blocked = true;
                if (auditLogger) {
                    auditLogger.logUnauthorizedAccess(req.url || 'unknown', ip, 'IP_BLOCKED_RATE_LIMIT');
                }
                errorHandler.sendRateLimitError(res, `IP temporarily blocked for ${BLOCK_DURATION_MS / 1000} seconds.`);
                return false;
            }
        }

        errorHandler.sendRateLimitError(res, `Rate limit exceeded. Maximum ${STRICT_LIMIT} requests per minute allowed.`);
        return false;
    }

    next();
    return true;
}

(rateLimiter as any).stop = () => {
    if (intervalId) clearInterval(intervalId);
};
(rateLimiter as any).setAuditLogger = setAuditLogger;

export default rateLimiter;
