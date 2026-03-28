import http from 'http';
import AuditLogger from './auditLogger.js';
import { sendRateLimitError } from './errorHandler.js';

const DEFAULT_LIMIT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const WINDOW_MS = 60 * 1000; // 1 minute

interface RateLimitInfo {
    count: number;
    startTime: number;
}

const ipCounters = new Map<string, RateLimitInfo>();
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

function resetCounters(): void {
    const now = Date.now();
    for (const [ip, info] of ipCounters.entries()) {
        if (now - info.startTime >= WINDOW_MS) {
            ipCounters.delete(ip);
        }
    }
}

setInterval(resetCounters, WINDOW_MS);

export function rateLimiter(req: http.IncomingMessage, res: http.ServerResponse, next: () => void): boolean {
    const pathname = req.url?.split('?')[0];
    if (isExcludedPath(pathname)) {
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
        if (now - record.startTime >= WINDOW_MS) {
            record.count = 1;
            record.startTime = now;
        } else {
            record.count += 1;
        }
    }

    if (record.count > DEFAULT_LIMIT) {
        if (auditLogger) {
            auditLogger.logRateLimitExceeded(ip, req.url || 'unknown');
        }
        sendRateLimitError(res, `Rate limit exceeded. Maximum ${DEFAULT_LIMIT} requests per minute allowed.`);
        return false;
    }

    next();
    return true;
}

export default rateLimiter;
