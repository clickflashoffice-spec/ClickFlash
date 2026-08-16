import sharp from 'sharp';
import { logger } from '../utils/logger.ts';
import { faceService } from './faceService.ts';

export interface ImageStats {
  luminance: number;
  contrast: number;
  rMean: number;
  gMean: number;
  bMean: number;
}

export interface AutoEdits {
  exposure: number;
  contrast: number;
  saturate: number;
  highlights: number;
  shadows: number;
  confidence: number;
  crop?: { x: number; y: number; width: number; height: number };
}

export class AutoEditEngine {
  
  static async initializeFaceModel() {
    // No-op for backwards compatibility; face estimation is offloaded to FaceService worker
    logger.debug('[AutoEditEngine] Face model initialization offloaded to faceWorker via FaceService');
  }

  static computeHeuristics(stats: ImageStats): AutoEdits {
    let exposure = 0;
    let contrastAdjust = 0;
    let saturate = 0;
    
    // 1. Auto-Exposure
    // Target luminance is around 128 (mid-gray).
    const luminance = stats.luminance;
    if (luminance > 0) {
      const diff = 128 - luminance;
      // Scale down so we don't blow it out completely
      exposure = Math.round(diff * 0.45); 
      exposure = Math.max(-60, Math.min(60, exposure));
    }

    // 2. Auto-Contrast
    // Target standard deviation (contrast) is around 50-60.
    if (stats.contrast < 45) {
      // Flat image, boost contrast
      contrastAdjust = Math.round((55 - stats.contrast));
    } else if (stats.contrast > 75) {
      // Too harsh, lower contrast slightly
      contrastAdjust = -Math.round((stats.contrast - 75) * 0.5);
    }
    contrastAdjust = Math.max(-40, Math.min(40, contrastAdjust));
    
    // 3. Saturation
    // Boost a tiny bit if we increased contrast or if it was flat
    if (contrastAdjust > 10) saturate = 15;
    else if (exposure > 20) saturate = 20; // Brightening often washes out colors
    
    // Calculate a basic confidence score based on how "normal" the adjustments are
    let confidence = 1.0;
    if (Math.abs(exposure) > 40) confidence -= 0.2;
    if (Math.abs(contrastAdjust) > 30) confidence -= 0.2;
    confidence = Math.max(0.1, confidence);
    
    return {
      exposure,
      contrast: contrastAdjust,
      saturate,
      highlights: exposure > 0 ? -Math.round(exposure * 0.3) : 0, 
      shadows: exposure < 0 ? Math.round(Math.abs(exposure) * 0.3) : 0,
      confidence
    };
  }

  static async smartCrop(imagePath: string, targetAspectRatio: number = 1.0): Promise<{ x: number, y: number, width: number, height: number } | undefined> {
    try {
      const image = sharp(imagePath).rotate();
      const metadata = await image.metadata();
      const width = metadata.width || 1000;
      const height = metadata.height || 1000;
      
      const analysis = await faceService.analyzeImage(imagePath);
      if (analysis.faces && analysis.faces.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
        
        for (const face of analysis.faces) {
          const box = face.box;
          if (box) {
            minX = Math.min(minX, box.x);
            minY = Math.min(minY, box.y);
            maxX = Math.max(maxX, box.x + box.width);
            maxY = Math.max(maxY, box.y + box.height);
          }
        }
        
        
        if (minX === Infinity) {
          // Fallback to Saliency-based cropping
          return await AutoEditEngine.saliencyCropFallback(imagePath, targetAspectRatio, width, height);
        }
        
        const analysisW = analysis.width || width;
        const analysisH = analysis.height || height;
        const scaleX = width / analysisW;
        const scaleY = height / analysisH;
        
        minX *= scaleX;
        minY *= scaleY;
        maxX *= scaleX;
        maxY *= scaleY;
        
        const faceW = maxX - minX;
        const faceH = maxY - minY;
        const faceCenterX = minX + faceW / 2;
        const faceCenterY = minY + faceH / 2;
        
        const cropH = Math.min(height, faceH * 3.5);
        let cropW = Math.min(width, cropH * targetAspectRatio);
        
        let cropX = faceCenterX - cropW / 2;
        let cropY = faceCenterY - cropH * 0.35; // Head room
        
        if (cropX < 0) cropX = 0;
        if (cropY < 0) cropY = 0;
        if (cropX + cropW > width) cropX = width - cropW;
        if (cropY + cropH > height) cropY = height - cropH;
        
        return {
          x: (cropX / width) * 100, 
          y: (cropY / height) * 100,
          width: (cropW / width) * 100,
          height: (cropH / height) * 100
        };
      } else {
        // Fallback to Saliency-based cropping if no faces detected
        return await AutoEditEngine.saliencyCropFallback(imagePath, targetAspectRatio, width, height);
      }
    } catch (err) {
      logger.error('[AutoEditEngine] Smart crop failed:', err);
    }
    return undefined;
  }

  static async saliencyCropFallback(imagePath: string, targetAspectRatio: number, width: number, height: number): Promise<{x: number, y: number, width: number, height: number} | undefined> {
    try {
      const exec = require('util').promisify(require('child_process').exec);
      const scriptPath = require('path').join(process.cwd(), '../../backend/ai-worker/saliency_service.py');
      const { stdout } = await exec(`python "${scriptPath}" "${imagePath}" ${targetAspectRatio}`);
      
      const crop = JSON.parse(stdout.trim());
      if (crop && !crop.error) {
        return {
          x: (crop.x / width) * 100,
          y: (crop.y / height) * 100,
          width: (crop.w / width) * 100,
          height: (crop.h / height) * 100
        };
      }
    } catch (err) {
      logger.warn('[AutoEditEngine] Saliency fallback failed:', err);
    }
    return undefined;
  }
}
