import { Router, Request, Response } from 'express';
import { AICullingService } from '../services/aiCullingService';
import { sendInternalError, sendInvalidInputError } from '../shared/errorHandler';
// import { Context } from '../types'; // Assuming types file, or use any for now if not strict

export default function cullingRoutes(context: any): Router {
    const router = Router();
    const service = new AICullingService(context.dbManager, context.logger);

    // POST /api/culling/analyze/:albumId
    // Triggers full analysis and grouping for an album
    router.post('/analyze/:albumId', async (req: Request, res: Response) => {
        const albumId = String(req.params.albumId);
        if (!albumId) return sendInvalidInputError(res, 'Album ID is required');

        try {
            // 1. Get all photos (simulated path resolution)
            const photos = context.dbManager.query(`
                SELECT id, originalFilename, storagePath
                FROM photos WHERE albumId = ?
            `, [albumId]);

            // Analyze each photo if not already scored
            for (const photo of photos) {
                // Check if scored
                const score = context.dbManager.get(`SELECT photoId FROM ai_scores WHERE photoId = ?`, [photo.id]);
                if (!score) {
                    // Fallback to uploads/filename if storagePath empty
                    const p = photo.storagePath || `uploads/${photo.originalFilename}`;
                    await service.analyzePhoto(photo.id, p);
                }
            }

            // 2. Group
            await service.groupPhotos(albumId);

            // 3. Auto-Cull
            await service.autoCull(albumId);

            res.json({ success: true, message: 'Culling analysis complete' });
        } catch (error) {
            context.logger.error('Culling Analysis Failed', error);
            sendInternalError(res, error);
        }
    });

    // GET /api/culling/results/:albumId
    // Get groups and selection status for review UI
    router.get('/results/:albumId', async (req: Request, res: Response) => {
        const albumId = String(req.params.albumId);
        if (!albumId) return sendInvalidInputError(res, 'Album ID is required');

        try {
            const groups = context.dbManager.query(`
                SELECT * FROM ai_groups WHERE albumId = ? ORDER BY createdAt ASC
            `, [albumId]);

            // Enrich with photos
            const results = groups.map((group: any) => {
                const photos = context.dbManager.query(`
                    SELECT p.id, p.thumbnailUrl, p.cullingStatus, s.overallScore, s.sharpnessScore, s.expressionScore
                    FROM photos p
                    LEFT JOIN ai_scores s ON p.id = s.photoId
                    WHERE p.aiGroupId = ?
                    ORDER BY s.overallScore DESC
                `, [group.id]);
                return { ...group, photos };
            });

            res.json({ success: true, data: results });
        } catch (error) {
            context.logger.error('Fetch Culling Results Failed', error);
            sendInternalError(res, error);
        }
    });

    // POST /api/culling/confirm/:albumId
    // Apply culling choices (delete/hide rejected)
    router.post('/confirm/:albumId', async (req: Request, res: Response) => {
        const { albumId } = req.params;
        const { actions } = req.body; // e.g., { mode: 'archive' | 'delete' }

        if (!albumId) return sendInvalidInputError(res, 'Album ID is required');

        try {
            // Support both { actions: { mode: 'delete' } } and { mode: 'delete' }
            const effectiveActions = actions || req.body || {};
            context.logger.info(`Confirming culling for album ${albumId}`, { actions: effectiveActions });

            if (effectiveActions.mode === 'delete') {
                const rejected = context.dbManager.query('SELECT storagePath FROM photos WHERE albumId = ? AND cullingStatus = "Rejected"', [albumId]);
                for (const p of rejected) {
                    if (p.storagePath && fs.existsSync(p.storagePath)) {
                        fs.unlinkSync(p.storagePath);
                    }
                }
                context.dbManager.run('DELETE FROM photos WHERE albumId = ? AND cullingStatus = "Rejected"', [albumId]);
            } else {
                // Default: just hide them by marking status
                context.dbManager.run('UPDATE photos SET status = "archived" WHERE albumId = ? AND cullingStatus = "Rejected"', [albumId]);
            }

            res.json({ success: true, message: 'Culling confirmed and applied' });
        } catch (error) {
            context.logger.error('Confirm Culling Failed', error);
            sendInternalError(res, error);
        }
    });

    return router;
}
