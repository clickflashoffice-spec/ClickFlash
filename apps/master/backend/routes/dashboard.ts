import { Router } from 'express';
import { CloudSyncService } from '../services/cloudSyncService';

interface DashboardContext {
    cloudSyncService: CloudSyncService;
}

export default ({ cloudSyncService }: DashboardContext) => {
    const router = Router();

    router.get('/system-health', (_req, res) => {
        try {
            const stats = cloudSyncService.getStats();
            res.json(stats);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
