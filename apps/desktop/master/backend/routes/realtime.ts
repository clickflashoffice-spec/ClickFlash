// backend/routes/realtime.ts
// Realtime Routes

import express, { Request, Response, Router } from 'express';
import RealtimeService from '../services/realtimeService';

interface RealtimeContext {
    realtimeService: RealtimeService;
}

export default function realtimeRoutes(context: RealtimeContext): Router {
    const router = express.Router();
    const { realtimeService } = context;

    router.get('/realtime', (req: Request, res: Response) => {
        realtimeService.handleConnection(req, res);
    });

    return router;
};
