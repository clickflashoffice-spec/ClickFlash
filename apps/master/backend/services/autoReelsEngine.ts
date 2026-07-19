import path from 'path';
import fs from 'fs';
import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import { videoReelService, VideoReelOptions } from './videoReelService';

interface Photo {
  id: string;
  albumId: string;
  url: string;
  created_at: string;
}

export class AutoReelsEngine {
  private dbManager: DatabaseManager;
  private logger: Logger;

  constructor(dbManager: DatabaseManager, logger: Logger) {
    this.dbManager = dbManager;
    this.logger = logger;
  }

  /**
   * Scans an album for rapid-fire bursts and automatically generates a vertical boomerang reel.
   * This is a high-margin upsell feature formatted for Instagram Reels and TikTok (1080x1920).
   */
  public async detectAndGenerateReel(albumId: string, customOptions: VideoReelOptions = {}): Promise<string | null> {
    const photos = this.dbManager.all<Photo>(
      `SELECT id, albumId, url, created_at FROM photos WHERE albumId = ? ORDER BY created_at ASC`,
      [albumId]
    );

    if (photos.length < 5) return null;

    const bursts: Photo[][] = [];
    let currentBurst: Photo[] = [photos[0]];

    for (let i = 1; i < photos.length; i++) {
        const prev = new Date(photos[i - 1].created_at).getTime();
        const curr = new Date(photos[i].created_at).getTime();
        
        // Photos taken within 2 seconds of each other are considered a burst
        if (curr - prev <= 2000) {
            currentBurst.push(photos[i]);
        } else {
            if (currentBurst.length >= 5) {
                bursts.push([...currentBurst]);
            }
            currentBurst = [photos[i]];
        }
    }
    
    if (currentBurst.length >= 5) {
        bursts.push(currentBurst);
    }

    if (bursts.length > 0) {
        // We take the best (or first) burst to generate a reel
        const targetBurst = bursts[0];
        const imagePaths = targetBurst.map(p => p.url).filter(Boolean);
        
        if (imagePaths.length === 0) return null;

        // Ensure we save it near the original images
        const firstImagePath = imagePaths[0];
        const baseDir = path.dirname(firstImagePath);
        const outputPath = path.join(baseDir, `premium_reel_${Date.now()}.mp4`);
        
        // Load settings from DB for watermark or audio soundtrack if available
        let watermarkPath = customOptions.watermarkPath;
        let audioPath = customOptions.audioPath;

        try {
            if (!watermarkPath) {
                const row = this.dbManager.get<{ value: string }>("SELECT value FROM settings WHERE id = 'REEL_WATERMARK_PATH'");
                if (row?.value && fs.existsSync(row.value)) watermarkPath = row.value;
            }
            if (!audioPath) {
                const row = this.dbManager.get<{ value: string }>("SELECT value FROM settings WHERE id = 'REEL_AUDIO_PATH'");
                if (row?.value && fs.existsSync(row.value)) audioPath = row.value;
            }
        } catch {}

        const options: VideoReelOptions = {
            fps: 12,
            boomerang: true,
            targetResolution: { width: 1080, height: 1920 }, // Vertical 9:16 for TikTok/Reels
            hardwareAcceleration: 'auto',
            watermarkPath,
            audioPath,
            ...customOptions
        };
        
        try {
            this.logger.info(`[AutoReelsEngine] Detected burst of ${targetBurst.length} photos. Generating vertical boomerang reel...`);
            await videoReelService.generateReel(imagePaths, outputPath, options);
            this.logger.info(`[AutoReelsEngine] Successfully generated Auto-Reel for album ${albumId}: ${outputPath}`);
            
            return outputPath;
        } catch (err) {
            this.logger.error(`[AutoReelsEngine] Failed to generate auto-reel`, { error: err instanceof Error ? err.message : String(err) });
            return null;
        }
    }
    return null;
  }

  /**
   * Explicitly generates a Slow-Mo / High-Frame Burst Reel for selected photos.
   */
  public async generateSlowMoBurstReel(photos: Photo[], outputPath: string, options: VideoReelOptions = {}): Promise<string | null> {
    if (photos.length < 2) return null;
    const imagePaths = photos.map(p => p.url).filter(Boolean);

    const reelOptions: VideoReelOptions = {
        fps: 24,
        speedMultiplier: 0.5, // 2x slow motion with frame blending
        boomerang: true,
        targetResolution: { width: 1080, height: 1920 },
        hardwareAcceleration: 'auto',
        ...options
    };

    try {
        this.logger.info(`[AutoReelsEngine] Generating slow-mo burst reel for ${photos.length} photos...`);
        await videoReelService.generateReel(imagePaths, outputPath, reelOptions);
        return outputPath;
    } catch (err) {
        this.logger.error(`[AutoReelsEngine] Failed to generate slow-mo burst reel`, { error: err instanceof Error ? err.message : String(err) });
        return null;
    }
  }
}
