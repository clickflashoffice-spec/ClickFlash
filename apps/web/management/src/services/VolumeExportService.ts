import JSZip from 'jszip';
import * as faceapi from '@vladmandic/face-api';
import { Photo } from '@/types';
import { logger } from '@/utils/logger';

export interface ExportOptions {
  autoCropFace: boolean;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  fileNamePrefix?: string;
  onProgress?: (progress: number, status: string) => void;
}

class VolumeExportService {
  private modelsLoaded = false;
  private isProcessing = false;

  async initModels() {
    if (this.modelsLoaded) return;
    try {
      // Assuming models are served from /models in the public directory
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      this.modelsLoaded = true;
    } catch (error) {
      logger.error('[VolumeExport] Failed to load face-api models', error);
      throw error;
    }
  }

  async exportBatch(photos: Photo[], options: ExportOptions): Promise<void> {
    if (this.isProcessing) {
      throw new Error('An export is already in progress');
    }

    this.isProcessing = true;
    const zip = new JSZip();
    const folder = zip.folder('ClickFlash_Volume_Export');
    
    if (!folder) {
      this.isProcessing = false;
      throw new Error('Failed to create zip folder');
    }

    try {
      if (options.autoCropFace) {
        await this.initModels();
      }

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (options.onProgress) {
          options.onProgress((i / photos.length) * 100, `Processing ${i + 1}/${photos.length}...`);
        }

        try {
          const processedBlob = await this.processPhoto(photo, options);
          const ext = photo.url.split('.').pop()?.toLowerCase() || 'jpg';
          const filename = `${options.fileNamePrefix || 'photo'}_${i + 1}_${photo.id}.${ext}`;
          
          folder.file(filename, processedBlob);
        } catch (err) {
          logger.warn(`[VolumeExport] Skipping photo ${photo.id} due to processing error`, err);
        }
      }

      if (options.onProgress) {
        options.onProgress(95, 'Zipping files...');
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      this.downloadBlob(zipBlob, `ClickFlash_Export_${new Date().getTime()}.zip`);

      if (options.onProgress) {
        options.onProgress(100, 'Complete');
      }

    } catch (error) {
      logger.error('[VolumeExport] Export failed', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private async processPhoto(photo: Photo, options: ExportOptions): Promise<Blob> {
    const img = await this.loadImage(photo.url);
    
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    if (options.autoCropFace) {
      // Use TinyFaceDetector for speed
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions());
      
      if (detection) {
        // Crop around the face with padding
        const box = detection.box;
        const padding = Math.max(box.width, box.height) * 0.5;
        
        let cropX = Math.max(0, box.x - padding);
        let cropY = Math.max(0, box.y - padding);
        let cropW = Math.min(img.width - cropX, box.width + padding * 2);
        let cropH = Math.min(img.height - cropY, box.height + padding * 2);

        // Optionally enforce target aspect ratio
        if (options.targetWidth && options.targetHeight) {
           // Basic center-crop logic could be added here
        }

        canvas.width = cropW;
        canvas.height = cropH;
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      } else {
        // Fallback: draw original
        ctx.drawImage(img, 0, 0);
      }
    } else {
      // No autocrop, just scale or draw
      ctx.drawImage(img, 0, 0);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, 'image/jpeg', options.quality || 0.9);
    });
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const volumeExportService = new VolumeExportService();
