import { logger } from '../utils/logger';
import { spawn } from 'child_process';
import * as path from 'path';
import { type DuplicateGroup, type ShotMetadata } from '../wasm';
import { cullingPipeline } from '../wasm/culling-pipeline';

export interface BurstToVideoRequest {
    galleryId: string;
    photoIds: string[];
    fps?: number;
    sourceDir: string;
    outputDir: string;
}

export interface BurstCullingAnalysis {
    galleryId: string;
    totalFrames: number;
    heroFrameId: string;
    burstDurationMs: number;
    groups: DuplicateGroup[];
    recommendedVideoFrameIds: string[];
}

export class BurstWorker {
    /**
     * Clusters burst frames using WASM perceptual hashing and selects the peak action Hero frame.
     */
    public async analyzeBurstSequence(
        galleryId: string,
        photoIds: string[],
        sourceDir: string
    ): Promise<BurstCullingAnalysis> {
        logger.info(`[BurstWorker] Analyzing burst sequence for gallery ${galleryId} (${photoIds.length} frames)`);

        const shotMetas: ShotMetadata[] = photoIds.map((pid, idx) => ({
            photoId: pid,
            filePath: path.join(sourceDir, `${pid}.jpg`),
            timestampMs: Date.now() - (photoIds.length - idx) * 100, // 10fps interval (100ms)
            galleryId
        }));

        const batchResult = await cullingPipeline.processBatch(shotMetas, {
            burstWindowMs: 5000,
            duplicateHammingThreshold: 12
        });

        // Find the hero frame (highest composite quality)
        const sorted = [...batchResult.evaluatedShots].sort((a, b) => b.compositeQualityScore - a.compositeQualityScore);
        const heroFrameId = sorted[0]?.photoId || photoIds[0];

        // Filter out severe defect frames for video rendering
        const validFrames = batchResult.evaluatedShots
            .filter(s => s.cullRecommendation !== 'DISCARD_DEFECT')
            .map(s => s.photoId);

        const recommendedVideoFrameIds = validFrames.length > 0 ? validFrames : photoIds;

        const burstDurationMs = photoIds.length * 100;

        return {
            galleryId,
            totalFrames: photoIds.length,
            heroFrameId,
            burstDurationMs,
            groups: batchResult.groups,
            recommendedVideoFrameIds
        };
    }

    /**
     * Converts a burst of high-speed photos into a short video clip.
     * Maps to Fotiqo feature: Burst-to-Video Engine.
     */
    public async processBurst(req: BurstToVideoRequest): Promise<{ videoUrl: string; heroPhotoId?: string }> {
        logger.info(`[BurstWorker] Starting burst-to-video for gallery ${req.galleryId}`);
        logger.info(`[BurstWorker] Processing ${req.photoIds.length} photos at ${req.fps || 30} FPS`);

        if (!fs.existsSync(req.outputDir)) {
            fs.mkdirSync(req.outputDir, { recursive: true });
        }

        // Analyze burst sequence for hero frame identification
        const analysis = await this.analyzeBurstSequence(req.galleryId, req.photoIds, req.sourceDir);
        const outputFileName = `${req.galleryId}-burst-${Date.now()}.mp4`;
        const outputPath = path.join(req.outputDir, outputFileName);
        
        // We assume photos are named sequentially or we pass a glob/concat script.
        const concatFilePath = path.join(req.outputDir, `${req.galleryId}-concat.txt`);
        let concatContent = '';
        const framesToUse = analysis.recommendedVideoFrameIds.length > 0 ? analysis.recommendedVideoFrameIds : req.photoIds;

        for (const photoId of framesToUse) {
            const photoPath = path.join(req.sourceDir, `${photoId}.jpg`);
            if (fs.existsSync(photoPath)) {
                const safePath = photoPath.replace(/\\/g, '/');
                concatContent += `file '${safePath}'\n`;
                concatContent += `duration ${1.0 / (req.fps || 30)}\n`;
            }
        }
        
        // Write concat file
        fs.writeFileSync(concatFilePath, concatContent);

        return new Promise((resolve, reject) => {
            const ffmpegProcess = spawn('ffmpeg', [
                '-f', 'concat',
                '-safe', '0',
                '-i', concatFilePath,
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                outputPath
            ]);

            ffmpegProcess.on('close', (code) => {
                if (code === 0) {
                    const mockVideoUrl = `https://cdn.clickflash.com/bursts/${outputFileName}`;
                    logger.info(`[BurstWorker] Burst video successfully generated: ${mockVideoUrl} (Hero: ${analysis.heroFrameId})`);
                    
                    // Cleanup concat file
                    try { 
                        fs.unlinkSync(concatFilePath); 
                    } catch (_err) {
                        logger.debug?.('[BurstWorker] Concat file already unlinked');
                    }

                    resolve({ videoUrl: mockVideoUrl, heroPhotoId: analysis.heroFrameId });
                } else {
                    logger.error(`[BurstWorker] FFmpeg exited with code ${code}`);
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

            ffmpegProcess.on('error', (err) => {
                logger.error(`[BurstWorker] FFmpeg process failed: ${err.message}`);
                reject(err);
            });
        });
    }
}

export const burstWorker = new BurstWorker();
