import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export interface VideoReelOptions {
    fps?: number;
    durationSeconds?: number;
    boomerang?: boolean; // If true, play forward then backward
    hardwareAcceleration?: 'auto' | 'nvenc' | 'videotoolbox' | 'vaapi' | 'qsv' | 'none';
    targetResolution?: { width: number; height: number }; // e.g. { width: 1080, height: 1920 } for TikTok/Reels vertical
    speedMultiplier?: number; // e.g. 0.5 for slow-mo or 2.0 for high-speed
    watermarkPath?: string; // Absolute path to studio watermark PNG
    textOverlay?: string; // Text string to overlay on bottom right/left
    audioPath?: string; // Absolute path to background MP3/AAC audio track
}

/**
 * AI Video Reel Service
 * Stitches a burst of photos into a high-performance, Instagram/TikTok-ready reel.
 * Features:
 * - Hardware acceleration with automatic software fallback (NVENC, VideoToolbox, VAAPI, QSV)
 * - 9:16 Vertical aspect ratio scaling with blurred background filler or letterboxing
 * - Slow-Mo burst transitions and speed multipliers
 * - Watermark and text overlay
 * - Background audio soundtrack mixing
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

        const baseFps = options.fps || 12;
        const speedMultiplier = options.speedMultiplier || 1.0;
        // Adjust effective frame duration for slow-mo or speed effects
        const duration = (1 / baseFps) / speedMultiplier;
        
        // We will create a temporary text file with the input paths for ffmpeg concat demuxer
        const tempDir = path.join(path.dirname(outputPath), 'temp_reels');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const listFile = path.join(tempDir, `list_${Date.now()}.txt`);
        
        try {
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

            // Determine HW encoder choice or auto-detect sequence
            const hwChoice = options.hardwareAcceleration || 'auto';
            const encodersToTry: string[] = [];

            if (hwChoice === 'nvenc') encodersToTry.push('h264_nvenc');
            else if (hwChoice === 'videotoolbox') encodersToTry.push('h264_videotoolbox');
            else if (hwChoice === 'vaapi') encodersToTry.push('h264_vaapi');
            else if (hwChoice === 'qsv') encodersToTry.push('h264_qsv');
            else if (hwChoice === 'auto') {
                if (process.platform === 'win32') encodersToTry.push('h264_nvenc', 'h264_qsv');
                else if (process.platform === 'darwin') encodersToTry.push('h264_videotoolbox');
                else encodersToTry.push('h264_vaapi', 'h264_nvenc');
            }
            encodersToTry.push('libx264'); // Software fallback always at the end

            // Build filter chain
            const filterChain = this.buildFilterChain(options);
            let hasSucceeded = false;
            let lastError: Error | null = null;

            for (const encoder of encodersToTry) {
                try {
                    await this.runFFmpegWithEncoder(listFile, outputPath, encoder, filterChain, options);
                    hasSucceeded = true;
                    logger.info(`Successfully generated AI Video Reel at ${outputPath} using encoder: ${encoder}`);
                    break;
                } catch (err: any) {
                    lastError = err;
                    logger.warn(`[VideoReelService] Encoder ${encoder} failed (${err.message}), trying next fallback...`);
                }
            }

            if (!hasSucceeded && lastError) {
                throw lastError;
            }
        } finally {
            if (fs.existsSync(listFile)) {
                try { fs.unlinkSync(listFile); } catch {}
            }
        }
    }

    private buildFilterChain(options: VideoReelOptions): { filterStr: string; extraInputs: string[] } {
        const extraInputs: string[] = [];
        let filterParts: string[] = [];
        let currentStream = '[0:v]';

        // 1. Target resolution scaling (e.g. 1080x1920 vertical reel)
        if (options.targetResolution) {
            const { width, height } = options.targetResolution;
            // Pad and scale with force original aspect ratio to fit within width x height
            filterParts.push(`${currentStream}scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black[scaled]`);
            currentStream = '[scaled]';
        }

        // 2. Slow-Mo / Speed frame blending
        if (options.speedMultiplier && options.speedMultiplier < 1.0) {
            // Frame blending for smooth slow motion
            filterParts.push(`${currentStream}tblend=all_mode=average[blended]`);
            currentStream = '[blended]';
        }

        // 3. Watermark overlay
        if (options.watermarkPath && fs.existsSync(options.watermarkPath)) {
            const inputIndex = 1 + extraInputs.length;
            extraInputs.push(options.watermarkPath);
            filterParts.push(`${currentStream}[${inputIndex}:v]overlay=W-w-20:H-h-20[watermarked]`);
            currentStream = '[watermarked]';
        }

        // 4. Text overlay
        if (options.textOverlay) {
            const escapedText = options.textOverlay.replace(/['":\\]/g, '\\$&');
            filterParts.push(`${currentStream}drawtext=text='${escapedText}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=h-th-40[texted]`);
            currentStream = '[texted]';
        }

        let filterStr = filterParts.join(';');
        if (filterStr && currentStream !== '[0:v]') {
            // Map the last stream out as [outv]
            filterStr = filterStr.replace(new RegExp(`${currentStream.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}$`), '') + `${currentStream}format=yuv420p[outv]`;
        } else {
            filterStr = `[0:v]format=yuv420p[outv]`;
        }

        return { filterStr, extraInputs };
    }

    private async runFFmpegWithEncoder(
        listFile: string,
        outputPath: string,
        encoder: string,
        filterChain: { filterStr: string; extraInputs: string[] },
        options: VideoReelOptions
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const args = [
                '-y', // Overwrite
                '-f', 'concat',
                '-safe', '0',
                '-i', listFile,
            ];

            // Add extra inputs (watermark, audio)
            for (const input of filterChain.extraInputs) {
                args.push('-i', input);
            }

            let audioInputIdx = -1;
            if (options.audioPath && fs.existsSync(options.audioPath)) {
                audioInputIdx = 1 + filterChain.extraInputs.length;
                args.push('-i', options.audioPath);
            }

            args.push('-filter_complex', filterChain.filterStr);
            args.push('-map', '[outv]');

            if (audioInputIdx !== -1) {
                args.push('-map', `${audioInputIdx}:a`);
                args.push('-c:a', 'aac');
                args.push('-shortest');
            }

            args.push('-c:v', encoder);
            if (encoder === 'libx264') {
                args.push('-preset', 'fast', '-crf', '23');
            } else if (encoder === 'h264_nvenc') {
                args.push('-preset', 'p2', '-cq', '26');
            }

            args.push('-vsync', 'vfr');
            args.push(outputPath);

            const ffmpeg = spawn('ffmpeg', args);

            let errorOutput = '';
            ffmpeg.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg (${encoder}) exited with code ${code}. Stderr: ${errorOutput.slice(-300)}`));
                }
            });

            ffmpeg.on('error', (err) => {
                reject(err);
            });
        });
    }
}

export const videoReelService = VideoReelService.getInstance();
