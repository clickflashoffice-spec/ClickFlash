import { logger } from '../utils/logger';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface BurstToVideoRequest {
    galleryId: string;
    photoIds: string[];
    fps?: number;
    sourceDir: string;
    outputDir: string;
}

export class BurstWorker {
    /**
     * Converts a burst of high-speed photos into a short video clip.
     * Maps to Fotiqo feature: Burst-to-Video Engine.
     */
    public async processBurst(req: BurstToVideoRequest): Promise<{ videoUrl: string }> {
        logger.info(`[BurstWorker] Starting burst-to-video for gallery ${req.galleryId}`);
        logger.info(`[BurstWorker] Processing ${req.photoIds.length} photos at ${req.fps || 30} FPS`);

        if (!fs.existsSync(req.outputDir)) {
            fs.mkdirSync(req.outputDir, { recursive: true });
        }

        const outputFileName = `${req.galleryId}-burst-${Date.now()}.mp4`;
        const outputPath = path.join(req.outputDir, outputFileName);
        
        // We assume photos are named sequentially or we pass a glob/concat script.
        // For simplicity in this implementation, we will use an ffmpeg glob pattern or demuxer.
        // Let's create a temporary concat file.
        const concatFilePath = path.join(req.outputDir, `${req.galleryId}-concat.txt`);
        let concatContent = '';
        for (const photoId of req.photoIds) {
            // Find the photo file, assuming jpeg
            const photoPath = path.join(req.sourceDir, `${photoId}.jpg`);
            if (fs.existsSync(photoPath)) {
                // FFmpeg concat format requires forward slashes or escaped backslashes
                const safePath = photoPath.replace(/\\/g, '/');
                concatContent += `file '${safePath}'\n`;
                // duration per frame = 1 / fps
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
                    logger.info(`[BurstWorker] Burst video successfully generated: ${mockVideoUrl}`);
                    
                    // Cleanup concat file
                    try { 
                        fs.unlinkSync(concatFilePath); 
                    } catch (_err) {
                        logger.debug?.('[BurstWorker] Concat file already unlinked');
                    }

                    resolve({ videoUrl: mockVideoUrl });
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
