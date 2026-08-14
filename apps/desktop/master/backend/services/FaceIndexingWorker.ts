/**
 * FaceIndexingWorker — Background batch processor for the face_indexing_queue.
 *
 * Drains pending items on a configurable interval:
 *   1. Pick N pending photos (oldest first, highest priority first)
 *   2. Run face detection via FaceService (worker-thread based)
 *   3. Store descriptors in photo_faces
 *   4. Add vectors to VectorIndexService
 *   5. Mark queue items completed / failed with retry
 */

import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import { faceService } from "./faceService";
import { VectorIndexService } from "./VectorIndexService";
import path from "path";

interface QueueItem {
  id: number;
  photoId: string;
  priority: number;
  status: string;
  retry_count: number;
}

interface PhotoRow {
  id: string;
  url: string;
  storagePath?: string;
  albumId: string;
}

export class FaceIndexingWorker {
  private dbManager: DatabaseManager;
  private logger: Logger;
  private vectorIndex: VectorIndexService;
  private uploadDir: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private processing = false;

  /** Max photos to process per tick */
  private readonly BATCH_SIZE = 5;
  /** Interval between processing ticks (ms) */
  private readonly INTERVAL_MS = 30_000;
  /** Max retry attempts before marking as permanently failed */
  private readonly MAX_RETRIES = 3;

  constructor(
    dbManager: DatabaseManager,
    logger: Logger,
    vectorIndex: VectorIndexService,
    uploadDir: string,
  ) {
    this.dbManager = dbManager;
    this.logger = logger;
    this.vectorIndex = vectorIndex;
    this.uploadDir = uploadDir;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.logger.info(
      `[FaceIndexingWorker] Started (batch=${this.BATCH_SIZE}, interval=${this.INTERVAL_MS}ms)`,
    );

    // Run once immediately, then on interval
    this.tick();
    this.timer = setInterval(() => this.tick(), this.INTERVAL_MS);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.info("[FaceIndexingWorker] Stopped");
  }

  private async tick(): Promise<void> {
    if (this.processing) return; // Skip if previous tick still running
    this.processing = true;

    try {
      await this.processBatch();
    } catch (err) {
      this.logger.error("[FaceIndexingWorker] Tick error", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.processing = false;
    }
  }

  private async processBatch(): Promise<void> {
    // 1. Claim pending items (highest priority first, then oldest)
    const items = this.dbManager.query<QueueItem>(
      `SELECT id, photoId, priority, status, retry_count
       FROM face_indexing_queue
       WHERE status = 'pending'
       ORDER BY priority DESC, created_at ASC
       LIMIT ?`,
      [this.BATCH_SIZE],
    );

    if (items.length === 0) return;

    // Mark as processing
    const ids = items.map((i) => i.id);
    const placeholders = ids.map(() => "?").join(",");
    this.dbManager.run(
      `UPDATE face_indexing_queue SET status = 'processing', updated_at = datetime('now')
       WHERE id IN (${placeholders})`,
      ids,
    );

    let completed = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.processPhoto(item);
        this.dbManager.run(
          `UPDATE face_indexing_queue SET status = 'completed', updated_at = datetime('now') WHERE id = ?`,
          [item.id],
        );
        completed++;
      } catch (err) {
        const retries = (item.retry_count || 0) + 1;
        const newStatus = retries >= this.MAX_RETRIES ? "failed" : "pending";
        const errorMsg =
          err instanceof Error ? err.message : String(err);

        this.dbManager.run(
          `UPDATE face_indexing_queue
           SET status = ?, error = ?, retry_count = ?, updated_at = datetime('now')
           WHERE id = ?`,
          [newStatus, errorMsg, retries, item.id],
        );

        this.logger.warn(
          `[FaceIndexingWorker] Photo ${item.photoId} failed (retry ${retries}/${this.MAX_RETRIES})`,
          { error: errorMsg },
        );
        failed++;
      }
    }

    if (completed > 0 || failed > 0) {
      this.logger.info(
        `[FaceIndexingWorker] Batch: ${completed} completed, ${failed} failed`,
      );
    }
  }

  private async processPhoto(item: QueueItem): Promise<void> {
    // 1. Get photo record for file path
    const photo = this.dbManager.get<PhotoRow>(
      "SELECT id, url, storagePath, albumId FROM photos WHERE id = ?",
      [item.photoId],
    );

    if (!photo) {
      throw new Error(`Photo ${item.photoId} not found in database`);
    }

    // 2. Resolve file path
    const filePath = this.resolvePhotoPath(photo);
    if (!filePath) {
      throw new Error(`Cannot resolve file path for photo ${item.photoId}`);
    }

    // 3. Check if already indexed (skip duplicates)
    const existing = this.dbManager.get<{ id: string }>(
      "SELECT id FROM photo_faces WHERE photoId = ? LIMIT 1",
      [item.photoId],
    );
    if (existing) {
      // Already indexed, skip
      return;
    }

    // 4. Run face detection via FaceService worker
    const analysis = await faceService.analyzeImage(filePath);

    if (!analysis || !analysis.faces || analysis.faces.length === 0) {
      // No faces detected — still mark as completed (not an error)
      return;
    }

    // 5. Store each face descriptor in photo_faces and add to vector index
    for (let i = 0; i < analysis.faces.length; i++) {
      const face = analysis.faces[i];
      const faceId = `${item.photoId}_face_${i}`;
      const descriptorJson = JSON.stringify(Array.from(face.descriptor));
      const boxJson = face.box
        ? JSON.stringify(face.box)
        : null;

      this.dbManager.run(
        `INSERT OR IGNORE INTO photo_faces (id, photoId, descriptor, box, createdAt)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [faceId, item.photoId, descriptorJson, boxJson],
      );

      // 6. Add to VP-Tree index for fast search
      this.vectorIndex.addFace(
        item.photoId,
        faceId,
        Array.from(face.descriptor),
      );
    }

    this.logger.info(
      `[FaceIndexingWorker] Indexed ${analysis.faces.length} face(s) for photo ${item.photoId}`,
    );
  }

  /**
   * Resolve the filesystem path for a photo.
   * Prefers storagePath, falls back to url-based resolution.
   */
  private resolvePhotoPath(photo: PhotoRow): string | null {
    // storagePath is an absolute path set during ingestion
    if (photo.storagePath) {
      return photo.storagePath;
    }

    // url may be a relative path like /uploads/albums/abc/photo.jpg
    if (photo.url) {
      // Strip leading /uploads/ or /api/files/ prefix
      let relative = photo.url;
      if (relative.startsWith("/uploads/")) {
        relative = relative.replace(/^\/uploads\//, "");
      } else if (relative.startsWith("/api/files/")) {
        relative = relative.replace(/^\/api\/files\//, "");
      }
      return path.join(this.uploadDir, relative);
    }

    return null;
  }

  /** Get queue depth for monitoring */
  getQueueStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const row = this.dbManager.get<{
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    }>(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM face_indexing_queue`,
    );

    return row || { pending: 0, processing: 0, completed: 0, failed: 0 };
  }
}
