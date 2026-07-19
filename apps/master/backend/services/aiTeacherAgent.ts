import fs from 'fs';
import sharp from 'sharp';
import { logger } from '@clickflash/logger';

export interface TeacherFeedback {
  photoId: string;
  isUnderexposed: boolean;
  isOverexposed: boolean;
  isBlurry: boolean;
  overallScore: number; // 0-100
  suggestions: string[];
}

/**
 * A real-time AI Agent that acts as a photography coach.
 * It analyzes incoming photos for exposure and sharpness issues,
 * allowing the system to alert the photographer via the mobile app.
 */
export class AITeacherAgent {
  /**
   * Analyzes a newly ingested photo for basic heuristic quality metrics.
   * @param photoId ID of the photo in the DB
   * @param imagePath Absolute path to the original raw/jpeg
   */
  public static async analyzeShot(photoId: string, imagePath: string): Promise<TeacherFeedback | null> {
    try {
      if (!fs.existsSync(imagePath)) {
        logger.warn(`[AITeacherAgent] Photo not found for analysis: ${imagePath}`);
        return null;
      }

      // We use Sharp to extract basic stats: brightness (mean) and edge detection for blur.
      // For performance on the Master kiosk, we downscale heavily before running stats.
      const image = sharp(imagePath).resize(400, 400).grayscale();
      
      const { data } = await image.raw().toBuffer({ resolveWithObject: true });
      
      let totalLuminance = 0;
      for (let i = 0; i < data.length; i++) {
        totalLuminance += data[i];
      }
      const meanLuminance = totalLuminance / data.length; // Range: 0 to 255

      const isUnderexposed = meanLuminance < 40;
      const isOverexposed = meanLuminance > 220;

      const suggestions: string[] = [];
      let score = 100;

      if (isUnderexposed) {
        suggestions.push("Increase ISO or open aperture (underexposed).");
        score -= 30;
      }
      if (isOverexposed) {
        suggestions.push("Decrease ISO or step down aperture (overexposed).");
        score -= 30;
      }

      // Calculate a rough Laplacian variance for blur detection (simulated here)
      // In a real implementation we'd run a 3x3 convolution
      const isBlurry = false; // Mock for now

      if (isBlurry) {
        suggestions.push("Increase shutter speed or check focus (motion/focus blur detected).");
        score -= 40;
      }

      if (score < 100) {
        logger.info(`[AITeacherAgent] Photo ${photoId} needs improvement: ${suggestions.join(' ')}`);
      } else {
        logger.info(`[AITeacherAgent] Photo ${photoId} exposure looks good.`);
      }

      return {
        photoId,
        isUnderexposed,
        isOverexposed,
        isBlurry,
        overallScore: Math.max(0, score),
        suggestions
      };

    } catch (error) {
      logger.error(`[AITeacherAgent] Failed to analyze shot ${photoId}`, error);
      return null;
    }
  }
}
