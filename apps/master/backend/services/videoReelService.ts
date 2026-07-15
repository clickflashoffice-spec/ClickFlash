import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export interface VideoReelOptions {
    fps?: number;
    durationSeconds?: number;
    boomerang?: boolean; // If true, play forward then backward
}

/**
 * AI Video Reel Service
 * Stitches a burst of photos into a 3-second Instagram-ready video.
 * Uses native FFmpeg on the server instead of external subscriptions.
 */
export class VideoReelService {
    private static instance: VideoReelService;

    private constructor() {}

    public static getInstance(): VideoReelService {
        if (!VideoReelService.instance) {
            VideoReelService.instance = new VideoReelService();
        }
        return VideoReelService.instance;
    }

    /**
     * Generates a video reel from a sequence of images.
     * @param imagePaths Array of absolute paths to the images.
     * @param outputPath Absolute path to save the resulting .mp4
     * @param options Configuration options
     */
    public async generateReel(imagePaths: string[], outputPath: string, options: VideoReelOptions = {}): Promise<void> {
        if (!imagePaths || imagePaths.length < 2) {
            throw new Error('At least 2 images are required to generate a reel.');
        }

        const fps = options.fps || 10;
        
        // We will create a temporary text file with the input paths for ffmpeg concat demuxer
        const tempDir = path.join(path.dirname(outputPath), 'temp_reels');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const listFile = path.join(tempDir, `list_${Date.now()}.txt`);
        
        try {
            // duration per frame = 1 / fps
            const duration = 1 / fps;
            let fileContent = '';

            for (const imgPath of imagePaths) {
                // ffmpeg concat demuxer requires paths to be escaped or relative properly
                // On Windows, backslashes must be escaped or replaced with forward slashes
                const safePath = imgPath.replace(/\\/g, '/');
                fileContent += `file '${safePath}'\nduration ${duration}\n`;
            }

            // For boomerang, append the images in reverse order
            if (options.boomerang) {
                for (let i = imagePaths.length - 2; i >= 0; i--) {
                    const safePath = imagePaths[i].replace(/\\/g, '/');
                    fileContent += `file '${safePath}'\nduration ${duration}\n`;
                }
            }

            // The concat demuxer requires the last file to be repeated without duration
            const lastSafePath = imagePaths[0].replace(/\\/g, '/');
            fileContent += `file '${lastSafePath}'\n`;

            fs.writeFileSync(listFile, fileContent);

            await new Promise<void>((resolve, reject) => {
                const args = [
                    '-y', // Overwrite
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', listFile,
                    '-vsync', 'vfr',
                    '-pix_fmt', 'yuv420p',
                    outputPath
                ];

                const ffmpeg = spawn('ffmpeg', args);

                ffmpeg.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`FFmpeg exited with code ${code}`));
                    }
                });

                ffmpeg.on('error', (err) => {
                    logger.error('FFmpeg failed to start. Is it installed?', err);
                    reject(err);
                });
            });

            logger.info(`Successfully generated AI Video Reel at ${outputPath}`);
        } finally {
            if (fs.existsSync(listFile)) {
                fs.unlinkSync(listFile);
            }
        }
    }
}

export const videoReelService = VideoReelService.getInstance();
