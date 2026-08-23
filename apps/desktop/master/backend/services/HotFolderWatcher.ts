import { watch, type FSWatcher, existsSync, mkdirSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { VisionBridge, type PhotoQualityMetrics } from '@clickflash/ai';

export interface IngestedPhotoEvent {
  photoId: string;
  filePath: string;
  fileSizeBytes: number;
  grade: string;
  isHeroShot: boolean;
  score: number;
  timestamp: string;
}

/**
 * ClickFlash Hot Folder Watcher
 * Watches tethered DSLR/SD card ingestion directories and executes automated quality evaluation.
 */
export class HotFolderWatcher {
  private watchDir: string;
  private watcher: FSWatcher | null = null;
  private isWatching: boolean = false;
  private processedFiles = new Set<string>();

  constructor(watchDir?: string) {
    this.watchDir = watchDir || path.resolve(process.cwd(), 'hotfolder');
    if (!existsSync(this.watchDir)) {
      try {
        mkdirSync(this.watchDir, { recursive: true });
      } catch {
        // Directory creation deferred
      }
    }
  }

  /**
   * Starts watching the ingestion folder for new photos.
   */
  start(onPhotoIngested?: (event: IngestedPhotoEvent) => void): void {
    if (this.isWatching || !existsSync(this.watchDir)) return;
    this.isWatching = true;

    try {
      this.watcher = watch(this.watchDir, async (_eventType, filename) => {
        if (!filename) return;
        const filenameStr = filename.toString();
        if (
          !filenameStr.toLowerCase().endsWith('.jpg') &&
          !filenameStr.toLowerCase().endsWith('.jpeg') &&
          !filenameStr.toLowerCase().endsWith('.raw') &&
          !filenameStr.toLowerCase().endsWith('.cr3') &&
          !filenameStr.toLowerCase().endsWith('.nef')
        ) {
          return;
        }

        const fullPath = path.join(this.watchDir, filenameStr);
        if (this.processedFiles.has(fullPath)) return;
        this.processedFiles.add(fullPath);

        // Allow file write completion
        await new Promise(r => setTimeout(r, 200));

        try {
          const stat = await fs.stat(fullPath);
          const photoId = "PHOTO_" + Date.now() + "_" + path.basename(filenameStr, path.extname(filenameStr));

          // Simulated Computer Vision quality scoring (Laplacian + face detection)
          const metrics: PhotoQualityMetrics = {
            photoId,
            sharpnessScore: Math.min(100, Math.max(30, Math.floor(Math.random() * 40) + 60)),
            exposureScore: Math.min(100, Math.max(40, Math.floor(Math.random() * 30) + 70)),
            compositionScore: 85,
            eyesOpenConfidence: 0.98,
            smileConfidence: 0.92,
            faceCount: 1
          };

          const culling = VisionBridge.evaluateCulling(metrics);

          const event: IngestedPhotoEvent = {
            photoId,
            filePath: fullPath,
            fileSizeBytes: stat.size,
            grade: culling.grade,
            isHeroShot: culling.isHeroShot,
            score: culling.overallScore,
            timestamp: new Date().toISOString()
          };

          if (onPhotoIngested) {
            onPhotoIngested(event);
          }
        } catch {
          // File read error
        }
      });
    } catch {
      // Hot folder error
    }
  }

  /**
   * Stops the hot folder watcher.
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.isWatching = false;
  }

  /**
   * Returns current watcher state.
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      watchDir: this.watchDir,
      totalProcessed: this.processedFiles.size
    };
  }
}
