// backend/routes/gallery.ts
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import DatabaseManager from '../database/db';
import { Logger } from '../utils/logger';
import { signFilePath } from '../utils/signedUrls';
import { walletService } from '../services/WalletService';

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
                'SELECT id, url, originalFilename, manualEdits, autoEdits, autoEnhanced FROM photos WHERE albumId = ? ORDER BY created_at ASC',
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
        let sourceUrl = photo.url;
        try {
            const parsedManual = typeof photo.manualEdits === 'string' ? JSON.parse(photo.manualEdits) : photo.manualEdits;
            const parsedAuto = typeof photo.autoEdits === 'string' ? JSON.parse(photo.autoEdits) : photo.autoEdits;
            const hasManual = parsedManual && Object.keys(parsedManual).length > 0;
            const hasAuto = parsedAuto && Object.keys(parsedAuto).length > 0;
            if (hasManual || hasAuto || photo.autoEnhanced) {
                sourceUrl = sourceUrl.replace(/(_highres|_preview)\.[^.]+$/, '_preview_edited.jpg');
                if (!sourceUrl.includes('_preview_edited.jpg')) {
                    // Fallback for unexpected URL formats
                    const parsed = path.parse(sourceUrl);
                    sourceUrl = path.join(parsed.dir, `${parsed.name.replace(/(_highres|_preview)$/, '')}_preview_edited.jpg`);
                }
            }
        } catch(e) {
            // Ignore parse errors, use default url
        }

        let sourcePath = path.join(uploadsDir, sourceUrl);
        if (!fs.existsSync(sourcePath)) {
            // Fallback to original if edited doesn't exist yet
            sourcePath = path.join(uploadsDir, photo.url);
        }

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

    // P0-2: Bulk-signed URLs for a gallery album's photos.
    //   Customer-facing endpoint — server signs all photo URLs the customer's
    //   browser will need (high-res, preview, thumb, tiny). The customer then
    //   fetches those URLs with the embedded signature, which the
    //   signedUrlMiddleware validates.
    //
    //   Body: { albumId: string, photoIds?: string[], tiers?: string[] }
    //   - photoIds: optional whitelist (default: all photos in album)
    //   - tiers: optional subset of [highres,preview,thumb,tiny] (default: all)
    //   - ttlSeconds: optional, default 3600, max 86400
    router.post('/sign-urls', async (req: Request, res: Response) => {
        try {
            const { albumId, photoIds, tiers, ttlSeconds } = req.body || {};
            if (!albumId || typeof albumId !== 'string') {
                return res.status(400).json({ error: 'albumId required' });
            }
            const tierList = Array.isArray(tiers) && tiers.length > 0
                ? tiers.filter((t: string) => ['highres', 'preview', 'thumb', 'tiny', 'watermarked'].includes(t))
                : ['highres', 'preview', 'thumb', 'tiny'];
            const ttl = Math.min(Math.max(parseInt(String(ttlSeconds ?? 3600), 10) || 3600, 1), 86400);

            // Whitelist check — only allow signing paths to files inside the
            // album's known storage paths.
            const photoQuery = photoIds && Array.isArray(photoIds) && photoIds.length > 0
                ? dbManager.query<{
                      id: string;
                      storage_path_highres: string;
                      storage_path_preview: string;
                      storage_path_thumb: string;
                      storage_path_tiny: string;
                      storage_path_watermarked: string;
                      manualEdits: any;
                      autoEdits: any;
                      autoEnhanced: number;
                  }>(
                      `SELECT id, 
                              url as storage_path_highres, 
                              previewUrl as storage_path_preview, 
                              thumbnailUrl as storage_path_thumb,
                              tinyUrl as storage_path_tiny, 
                              watermarked_url as storage_path_watermarked,
                              manualEdits, autoEdits, autoEnhanced
                         FROM photos WHERE albumId = ? AND id IN (${photoIds.map(() => '?').join(',')})`,
                      [albumId, ...photoIds],
                  )
                : dbManager.query<{
                      id: string;
                      storage_path_highres: string;
                      storage_path_preview: string;
                      storage_path_thumb: string;
                      storage_path_tiny: string;
                      storage_path_watermarked: string;
                      manualEdits: any;
                      autoEdits: any;
                      autoEnhanced: number;
                  }>(
                      `SELECT id, 
                              url as storage_path_highres, 
                              previewUrl as storage_path_preview, 
                              thumbnailUrl as storage_path_thumb,
                              tinyUrl as storage_path_tiny, 
                              watermarked_url as storage_path_watermarked,
                              manualEdits, autoEdits, autoEnhanced
                         FROM photos WHERE albumId = ?`,
                      [albumId],
                  );

            const results = photoQuery.map((row) => {
                const urls: Record<string, string> = {};
                
                let highres = row.storage_path_highres;
                let preview = row.storage_path_preview;

                try {
                    const parsedManual = typeof row.manualEdits === 'string' ? JSON.parse(row.manualEdits) : row.manualEdits;
                    const parsedAuto = typeof row.autoEdits === 'string' ? JSON.parse(row.autoEdits) : row.autoEdits;
                    const hasManual = parsedManual && Object.keys(parsedManual).length > 0;
                    const hasAuto = parsedAuto && Object.keys(parsedAuto).length > 0;
                    if (hasManual || hasAuto || row.autoEnhanced) {
                        if (highres) highres = highres.replace(/(_highres|_preview)\.[^.]+$/, '_preview_edited.jpg');
                        if (preview) preview = preview.replace(/(_highres|_preview)\.[^.]+$/, '_preview_edited.jpg');
                    }
                } catch(e) {}

                const tierToCol: Record<string, string> = {
                    highres: highres,
                    preview: preview,
                    thumb: row.storage_path_thumb,
                    tiny: row.storage_path_tiny,
                    watermarked: row.storage_path_watermarked,
                };
                for (const tier of tierList) {
                    const relPath = tierToCol[tier];
                    if (!relPath) continue;
                    // Build the public path that the files route serves.
                    // The files route expects /files/uploads/<albumId>/<subdir>/<filename>
                    // so we always prefix with /api/files/uploads/ and the rest is the stored relPath.
                    // relPath might be e.g. "/uploads/somealbum/highres/foo.jpg"
                    const cleanRelPath = relPath.replace(/^[\/\\]?uploads[\/\\]/, '');
                    const filePath = `/api/files/uploads/${cleanRelPath}`;
                    urls[tier] = signFilePath(filePath, { ttlSeconds: ttl });
                }
                return { photoId: row.id, urls };
            });

            return res.json({
                albumId,
                signedAt: Math.floor(Date.now() / 1000),
                ttlSeconds: ttl,
                count: results.length,
                urls: results,
            });
        } catch (err: any) {
            logger.error('[Gallery] sign-urls failed', { error: err.message });
            return res.status(500).json({ error: 'sign-urls failed' });
        }
    });

    // GET/POST /api/gallery/wallet-pass
    // Generate a .pkpass Apple Wallet digital pass for an order
    router.all('/wallet-pass', async (req: Request, res: Response) => {
        try {
            const orderId = req.method === 'GET' ? req.query.orderId : req.body.orderId;
            const albumId = req.method === 'GET' ? req.query.albumId : req.body.albumId;
            const clientName = req.method === 'GET' ? req.query.clientName : req.body.clientName;
            // const total = req.method === 'GET' ? req.query.total : req.body.total;
            
            if (!orderId) {
                return res.status(400).json({ error: 'orderId is required' });
            }

            const passBuffer = await walletService.generateGalleryPass({
                albumId: albumId ? String(albumId) : 'GALLERY',
                clientName: clientName ? String(clientName) : 'Guest',
                token: String(orderId), // Using orderId as the token placeholder
                galleryUrl: `https://gallery.clickflash.app/?order=${orderId}`,
                date: new Date().toISOString().split('T')[0],
            });

            res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
            res.setHeader('Content-Disposition', `attachment; filename="Pass-${orderId}.pkpass"`);
            res.send(passBuffer);
        } catch (error: any) {
            logger.error('[Gallery] Failed to generate wallet pass:', error);
            res.status(500).json({ error: 'Failed to generate wallet pass' });
        }
    });

    return router;
}
