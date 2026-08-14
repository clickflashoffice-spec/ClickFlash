import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { pipeline } from 'stream';
import { promisify } from 'util';

import {
    sendDatabaseError,
    sendInvalidInputError,
    sendInternalError,
    sendNotFoundError,
    sendValidationError
} from '../shared/errorHandler';
import { customRoutesSchemas } from '../shared/validation';

const streamPipeline = promisify(pipeline);

interface SyncContext {
    dbManager: any;
    logger: any;
    UPLOAD_DIR: string;
    authMiddleware: any;
    realtimeService?: any;
    photoProcessor: any;
}

export default function createSyncRouter(context: SyncContext): Router {
    const router = Router();
    const { dbManager, logger, UPLOAD_DIR, authMiddleware, photoProcessor, realtimeService } = context;

    /**
     * @route GET /api/sync/status
     * @description Get sync status with Master
     */
    router.get('/status', (req: Request, res: Response) => {
        try {
            const result = dbManager.get('SELECT MAX(updated_at) as lastSync FROM orders');
            const lastSync = result ? result.lastSync : null;
            res.status(200).json({ masterConnected: true, lastSync });
        } catch (e: any) {
            sendDatabaseError(res, e, 'fetching sync status');
        }
    });

    /**
     * @route POST /api/sync/pull-photo
     * @description Server-side file pull. Downloads a file from Master directly to local disk.
     * @access Private (authenticated)
     */
    router.post('/pull-photo', authMiddleware, async (req: Request, res: Response) => {
        try {
            const validation = customRoutesSchemas.syncFetchPhoto.safeParse(req.body);
            if (!validation.success) {
                return sendValidationError(res, 'Invalid pull request', validation.error);
            }
            const { url, filename, photoId, albumId, photographerId, title } = validation.data;

            logger.info(`[Sync] Pulling photo directly to backend`, { photoId, url, filename });

            const tempDir = path.join(UPLOAD_DIR, 'temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `${photoId}_${filename}`);

            await new Promise<void>((resolve, reject) => {
                const request = http.get(url, (response) => {
                    if (response.statusCode !== 200) {
                        return reject(new Error(`Failed to download file: Status ${response.statusCode}`));
                    }
                    const fileStream = fs.createWriteStream(tempPath);
                    streamPipeline(response, fileStream).then(resolve).catch(reject);
                });
                request.on('error', (err) => reject(err));
                request.setTimeout(120000, () => {
                    request.destroy();
                    reject(new Error('Download timeout'));
                });
            });

            if (!fs.existsSync(tempPath)) throw new Error('Downloaded file missing');
            const stats = fs.statSync(tempPath);
            if (stats.size === 0) {
                try { fs.unlinkSync(tempPath); } catch (e) { }
                throw new Error('Downloaded file is empty');
            }

            const fileObj = {
                filepath: tempPath,
                originalFilename: filename,
                newFilename: filename
            };

            const processed = await photoProcessor.processPhoto(fileObj, albumId, photoId);

            const now = new Date().toISOString();
            const photoData = {
                id: photoId,
                albumId: albumId,
                url: processed.url,
                title: title || filename,
                photographerId: photographerId || 0,
                created_at: now,
                updated_at: now,
                fileSize: processed.fileSize,
                mimeType: processed.mimeType,
                width: processed.width,
                height: processed.height,
                fileHash: processed.fileHash,
                storagePath: processed.storagePath
            };

            dbManager.transaction(() => {
                const exists = dbManager.get('SELECT 1 FROM photos WHERE id = ?', [photoId]);
                if (exists) {
                    dbManager.run(
                        `UPDATE photos SET 
                             url = @url, 
                             fileSize = @fileSize, 
                             mimeType = @mimeType,
                             width = @width,
                             height = @height,
                             fileHash = @fileHash,
                             storagePath = @storagePath, 
                             updated_at = @updated_at 
                             WHERE id = @id`,
                        photoData
                    );
                } else {
                    dbManager.run(
                        `INSERT INTO photos (
                                id, albumId, url, title, photographerId, 
                                created_at, updated_at, fileSize, mimeType, 
                                width, height, fileHash, storagePath
                             ) VALUES (
                                @id, @albumId, @url, @title, @photographerId, 
                                @created_at, @updated_at, @fileSize, @mimeType, 
                                @width, @height, @fileHash, @storagePath
                             )`,
                        photoData
                    );
                }
            })();

            logger.info(`[Sync] Photo downloaded and processed successfully`, { photoId, size: processed.fileSize });

            // Queue for face indexing (P3-R5: auto-index synced photos)
            try {
                dbManager.run(
                    `INSERT OR IGNORE INTO face_indexing_queue (photoId, priority, status) VALUES (?, 0, 'pending')`,
                    [photoId]
                );
            } catch (faceErr: any) {
                // Non-fatal — don't block sync if face queue insert fails
                logger.warn(`[Sync] Failed to queue face indexing for ${photoId}`, { error: faceErr.message });
            }

            if (realtimeService) {
                realtimeService.broadcast({
                    collection: 'photos',
                    action: 'create',
                    record: photoData
                });

                realtimeService.broadcast({
                    collection: 'albums',
                    action: 'update',
                    record: {
                        id: albumId,
                        updated_at: now
                    }
                });
            }

            res.status(200).json({ success: true, id: photoId, size: stats.size });

        } catch (error: any) {
            logger.error(`[Sync] Failed to pull photo`, { error: error.message });
            sendInternalError(res, error, 'Photo Pull Failed');
        }
    });

    return router;
}
