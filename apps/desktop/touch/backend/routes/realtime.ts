import { Router, Request, Response } from 'express';
import { Logger } from '../shared/logger';

interface RealtimeContext {
    realtimeService: any;
    logger: Logger;
}

export default function createRealtimeRouter(context: RealtimeContext): Router {
    const router = Router();
    const { realtimeService, logger } = context;

    /**
     * @route GET /api/realtime
     * @description Subscribe to realtime updates (SSE)
     */
    router.get('/', (req: Request, res: Response) => {
        if (!realtimeService) {
            logger.error('Realtime service not initialized');
            return res.status(500).json({ error: 'Realtime service unavailable' });
        }

        realtimeService.handleConnection(req, res);
    });

    return router;
}
