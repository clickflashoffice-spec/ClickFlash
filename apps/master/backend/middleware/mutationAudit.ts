// backend/middleware/mutationAudit.ts
// Mutation audit middleware — logs every successful PUT, PATCH, DELETE to /api/*

import { Request, Response, NextFunction, RequestHandler } from 'express';
import AuditLogger from '../shared/auditLogger';

/** Matches a plain integer or a UUID v4 segment. */
const RESOURCE_ID_RE = /^\d+$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MUTATION_METHODS = new Set(['PUT', 'PATCH', 'DELETE']);

/**
 * createMutationAuditMiddleware
 *
 * Returns an Express RequestHandler that audit-logs every successful
 * PUT, PATCH, or DELETE request to /api/* paths.  The log entry is
 * written after the response is sent so there is zero added latency on
 * the hot path.
 *
 * Log fields written to AuditLogger.logDataAccess:
 *   userId    — from session/req.user, or 'anonymous'
 *   email     — from session/req.user, or 'anonymous'
 *   action    — HTTP method (PUT | PATCH | DELETE)
 *   resource  — second path segment, e.g. /api/orders/123 → 'orders'
 *   resourceId — last numeric or UUID segment, or null
 */
export function createMutationAuditMiddleware(auditLogger: AuditLogger): RequestHandler {
    return function mutationAuditMiddleware(
        req: Request,
        res: Response,
        next: NextFunction,
    ): void {
        // Fast-path: skip non-mutation methods and non-API paths immediately
        if (!MUTATION_METHODS.has(req.method) || !req.path.startsWith('/api/')) {
            next();
            return;
        }

        res.on('finish', () => {
            // Only audit successful mutations; errors are captured by the error logger
            if (res.statusCode >= 400) return;

            // Resolve user context — session user takes precedence over JWT user
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- session typing is loose by design
            const user = (req.session as any)?.user ?? (req as any).user;
            const userId: string | number = user?.id ?? 'anonymous';
            const email: string = user?.email ?? 'anonymous';

            // Derive resource name from the second path segment (/api/<resource>/...)
            // req.path is relative to the mount point, so it starts with '/api/'
            const segments = req.path.split('/').filter(Boolean); // ['api', 'orders', '123']
            const resource: string = segments[1] ?? 'unknown';

            // Extract a resource ID from the last segment if it looks numeric or UUID
            const lastSegment = segments[segments.length - 1] ?? '';
            const resourceId: string | null =
                lastSegment !== resource && RESOURCE_ID_RE.test(lastSegment)
                    ? lastSegment
                    : null;

            auditLogger.logDataAccess(userId, email, req.method, resource, resourceId);
        });

        next();
    };
}
