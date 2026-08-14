import express, { Request, Response, Router } from 'express';
import { sendInternalError, sendInvalidInputError } from '../utils/errorHandler';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';

export default function permissionsRoutes(context: any): Router {
    const router = express.Router();

    // GET /api/permissions
    router.get('/', (_req: Request, res: Response) => {
        try {
            const rows = context.dbManager.query('SELECT role, permission FROM role_permissions');
            const result: Record<string, string[]> = {};
            for (const row of rows) {
                if (!result[row.role]) {
                    result[row.role] = [];
                }
                result[row.role].push(row.permission);
            }
            res.status(200).json(result);
        } catch (err: any) {
            sendInternalError(res, err);
        }
    });

    const updateSchema = z.object({
        role: z.string().min(1),
        permissions: z.array(z.string())
    });

    // POST /api/permissions
    router.post('/', strictRateLimiter, async (_req: Request, res: Response) => {
        try {
            // Must have elevated privileges (Admin or CEO)
            const user = (_req as any).session?.user || (_req as any).user;
            if (!user || (user.role !== 'Admin' && user.role !== 'CEO')) {
                return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
            }

            const parsed = updateSchema.safeParse(_req.body);
            if (!parsed.success) {
                return sendInvalidInputError(res, 'Invalid input format');
            }

            const { role, permissions } = parsed.data;

            context.dbManager.transaction(() => {
                // Delete all current permissions for this role
                context.dbManager.run('DELETE FROM role_permissions WHERE role = ?', [role]);
                // Insert new ones
                if (permissions.length > 0) {
                    const stmt = context.dbManager.prepare('INSERT INTO role_permissions (role, permission, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
                    for (const perm of permissions) {
                        stmt.run([role, perm]);
                    }
                }
            });

            res.status(200).json({ success: true });
        } catch (err: any) {
            sendInternalError(res, err);
        }
    });

    return router;
}
