import { Router } from 'express';
import { CloudSyncService } from '../services/cloudSyncService';
import { requirePermission, PERMISSIONS } from '../middleware/permissions';

interface DashboardContext {
    cloudSyncService: CloudSyncService;
}

export default ({ cloudSyncService }: DashboardContext) => {
    const router = Router();

    router.get('/system-health', requirePermission(PERMISSIONS.ANALYTICS_VIEW), (_req, res) => {
        try {
            const stats = cloudSyncService.getStats();
            res.json(stats);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
