// backend/routes/gallery.ts
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import DatabaseManager from '../shared/db';
import { Logger } from '../shared/logger';

interface GalleryContext {
    dbManager: DatabaseManager;
    logger: Logger;
    uploadDir: string;
}

interface WatermarkConfig {
    text?: string;
    opacity?: number;
    rotation?: number;
    fontSize?: number;
}

export default function galleryRoutes(context: GalleryContext) {
    const { dbManager, logger, uploadDir } = context;
    const router = express.Router();

    // POST /api/gallery/export - Generate watermarked photos for gallery
    router.post('/export', async (req: Request, res: Response) => {
        const startTime = Date.now();
        const { albumId, watermarkConfig = {} } = req.body;

        if (!albumId) {
            return res.status(400).json({ error: 'albumId is required' });
        }

        try {
            // 1. Get all photos in album
            const photos = dbManager.query(
                'SELECT id, url, originalFilename FROM photos WHERE albumId = ? ORDER BY created_at ASC',
                [albumId]
            );

            if (!photos || photos.length === 0) {
                return res.status(404).json({ error: 'Album not found or has no photos' });
            }

            logger.info(`[Gallery] Exporting ${photos.length} photos for album ${albumId}`);

            // 2. Ensure watermark directory exists
            const watermarkDir = path.join(uploadDir, 'gallery', 'watermarked', albumId);
            if (!fs.existsSync(watermarkDir)) {
                fs.mkdirSync(watermarkDir, { recursive: true });
            }

            // 3. Generate watermarks (parallel with concurrency limit)
            const maxConcurrency = 4;
            const results: any[] = [];
            let generated = 0;
            let cached = 0;

            for (let i = 0; i < photos.length; i += maxConcurrency) {
                const batch = photos.slice(i, i + maxConcurrency);
                const batchResults = await Promise.all(
                    batch.map((photo) => processWatermark(photo, watermarkDir, watermarkConfig, uploadDir))
                );

                batchResults.forEach(result => {
                    if (result.cached) cached++;
                    else generated++;
                    results.push(result);
                });
            }

            const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

            logger.info(`[Gallery] Export complete for album ${albumId}: ${generated} generated, ${cached} cached, ${processingTime}s`);

            res.json({
                success: true,
                albumId,
                watermarkedPhotos: results,
                stats: {
                    totalPhotos: photos.length,
                    generated,
                    cached,
                    processingTime: `${processingTime}s`
                }
            });
        } catch (error: any) {
            logger.error('[Gallery] Export error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Helper function to process single watermark
    async function processWatermark(
        photo: any,
        watermarkDir: string,
        config: WatermarkConfig,
        uploadsDir: string
    ): Promise<any> {
        const watermarkPath = path.join(watermarkDir, `${photo.id}.webp`);
        const relativePath = `gallery/watermarked/${path.basename(path.dirname(watermarkPath))}/${photo.id}.webp`;

        // Check if watermark already exists (cache)
        if (fs.existsSync(watermarkPath)) {
            return {
                photoId: photo.id,
                watermarkUrl: relativePath,
                cached: true
            };
        }

        // Generate watermark via worker
        const sourcePath = path.join(uploadsDir, photo.url);

        await runWatermarkWorker({
            photoId: photo.id,
            sourcePath,
            outputPath: watermarkPath,
            config: {
                text: config.text || 'PROOF',
                opacity: config.opacity || 0.3,
                rotation: config.rotation || -45,
                fontSize: config.fontSize
            }
        });

        return {
            photoId: photo.id,
            watermarkUrl: relativePath,
            cached: false
        };
    }

    // Worker thread executor — terminates the thread after each job to prevent
    // zombie threads (watermarkWorker has no self-exit logic).
    function runWatermarkWorker(job: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const workerPath = path.resolve(__dirname, '../workers/watermarkWorker.js');
            const worker = new Worker(workerPath);

            worker.on('message', (result) => {
                worker.terminate();
                if (result.success) {
                    resolve();
                } else {
                    reject(new Error(result.error));
                }
            });

            worker.on('error', (err) => {
                worker.terminate();
                reject(err);
            });
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });

            worker.postMessage(job);
        });
    }

    return router;
}
