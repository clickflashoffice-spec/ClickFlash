import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import * as blazeface from '@tensorflow-models/blazeface';
import sharp from 'sharp';
import { logger } from '../utils/logger';

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
  crop?: { x: number; y: number; width: number; height: number };
}

let faceModel: blazeface.BlazeFaceModel | null = null;

export class AutoEditEngine {
  
  static async initializeFaceModel() {
    if (!faceModel) {
      try {
        logger.info('[AutoEditEngine] Initializing Blazeface model for Smart Crop');
        faceModel = await blazeface.load();
      } catch (err) {
        logger.warn('[AutoEditEngine] Failed to load blazeface model (offline?). Smart Crop will be disabled.', err);
      }
    }
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
    
    return {
      exposure,
      contrast: contrastAdjust,
      saturate,
      highlights: exposure > 0 ? -Math.round(exposure * 0.3) : 0, 
      shadows: exposure < 0 ? Math.round(Math.abs(exposure) * 0.3) : 0,
    };
  }

  static async smartCrop(imagePath: string, targetAspectRatio: number = 1.0): Promise<{ x: number, y: number, width: number, height: number } | undefined> {
    if (!faceModel) await this.initializeFaceModel();
    if (!faceModel) return undefined;

    try {
      const image = sharp(imagePath).rotate();
      const metadata = await image.metadata();
      const width = metadata.width || 1000;
      const height = metadata.height || 1000;
      
      const resizeW = 500;
      const resizeH = Math.round(height * (500/width));
      
      // BlazeFace expects RGB
      const { data, info } = await image.resize(resizeW, resizeH).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      
      const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels]);
      const predictions = await faceModel.estimateFaces(tensor, false);
      tf.dispose(tensor);
      
      if (predictions.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
        
        for (const pred of predictions) {
           const topLeft = pred.topLeft as [number, number];
           const bottomRight = pred.bottomRight as [number, number];
           minX = Math.min(minX, topLeft[0]);
           minY = Math.min(minY, topLeft[1]);
           maxX = Math.max(maxX, bottomRight[0]);
           maxY = Math.max(maxY, bottomRight[1]);
        }
        
        const scaleX = width / resizeW;
        const scaleY = height / resizeH;
        
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
      }
      
    } catch (err) {
      logger.error('[AutoEditEngine] Smart crop failed:', err);
    }
    return undefined;
  }
}
