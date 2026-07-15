import { logger } from '@clickflash/logger';
/**
 * Batch Upload Service for Money Trash
 * Handles high-volume concurrent uploads with queue management
 */

import { v4 as uuidv4 } from 'uuid';

interface UploadJob {
  id: string;
  files: File[];
  metadata: {
    eventName: string;
    accessCode: string;
    mode: 'moneytrash' | 'sold';
    customerEmail?: string;
    singlePhotoPrice?: string;
    fullGalleryPrice?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    currentFile?: string;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errors: Array<{ file: string; error: string }>;
}

interface UploadProgress {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  currentFile?: string;
  status: UploadJob['status'];
  fileProgress?: Record<string, number>;
}

class BatchUploadService {
  private jobs: Map<string, UploadJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;
  private maxConcurrentFiles: number = 5;
  private subscribers: Array<(progress: UploadProgress) => void> = [];
  private fileProgressMap: Map<string, Record<string, number>> = new Map();

  /**
   * Create a new batch upload job
   */
  createJob(files: File[], metadata: UploadJob['metadata']): string {
    const jobId = uuidv4();
    const job: UploadJob = {
      id: jobId,
      files,
      metadata,
      status: 'pending',
      progress: {
        total: files.length,
        completed: 0,
        failed: 0
      },
      createdAt: new Date(),
      errors: []
    };

    this.jobs.set(jobId, job);
    this.processQueue();

    return jobId;
  }

  /**
   * Process the upload queue
   */
  private async processQueue(): Promise<void> {
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    // Find pending jobs
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const job of pendingJobs) {
      if (this.activeJobs.size >= this.maxConcurrentJobs) {
        break;
      }

      this.activeJobs.add(job.id);
      this.processJob(job.id);
    }
  }

  /**
   * Process a single upload job
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.startedAt = new Date();

    try {
      // Process files in batches
      const batches = this.chunkArray(job.files, this.maxConcurrentFiles);

      for (const batch of batches) {
        await this.processBatch(job, batch);
      }

      // Mark job as completed if no failures
      if (job.progress.failed === 0) {
        job.status = 'completed';
      } else if (job.progress.completed === 0) {
        job.status = 'failed';
      } else {
        job.status = 'completed'; // Partial success
      }

      job.completedAt = new Date();

      // Notify completion
      this.notifySubscribers(jobId);
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      logger.error(`Batch upload job ${jobId} failed:`, error);
    } finally {
      this.activeJobs.delete(jobId);
      this.processQueue(); // Process next jobs in queue
    }
  }

  /**
   * Process a batch of files concurrently
   */
  private async processBatch(job: UploadJob, batch: File[]): Promise<void> {
    const uploadPromises = batch.map(file => this.uploadFile(job, file));
    await Promise.all(uploadPromises);
  }

  /**
   * Upload a single file (Chunked Resumable Pattern)
   */
  private async uploadFile(job: UploadJob, file: File): Promise<void> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for high-volume uploads
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      job.progress.currentFile = file.name;
      this.notifySubscribers(job.id);

      // 1. Initialize session
      const initRes = await fetch('/api/upload/chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          metadata: {
            ...job.metadata,
            type: file.type
          }
        })
      });

      if (!initRes.ok) throw new Error('Failed to initialize chunked upload');
      const { sessionId } = await initRes.json();

      // 2. Upload chunks with retry logic
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount <= maxRetries) {
          try {
            const formData = new FormData();
            formData.append('sessionId', sessionId);
            formData.append('chunkIndex', i.toString());
            formData.append('chunk', chunk);

            const putRes = await fetch('/api/upload/chunk', {
              method: 'PUT',
              body: formData
            });

            if (!putRes.ok) throw new Error(`Chunk ${i} failed`);

            // Update individual file progress
            const progress = Math.round(((i + 1) / totalChunks) * 100);
            this.updateFileProgress(job.id, file.name, progress);
            break;
          } catch (err) {
            retryCount++;
            if (retryCount > maxRetries) throw err;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount))); // Backoff
          }
        }
      }

      // 3. Finalize
      const finalizeRes = await fetch('/api/upload/chunk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!finalizeRes.ok) throw new Error('Finalize failed');

      job.progress.completed++;
    } catch (error) {
      job.progress.failed++;
      job.errors.push({
        file: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      logger.error(`Failed to upload ${file.name}:`, error);
    } finally {
      this.notifySubscribers(job.id);
    }
  }

  /**
   * Update individual file progress
   */
  private updateFileProgress(jobId: string, fileName: string, progress: number): void {
    if (!this.fileProgressMap.has(jobId)) {
      this.fileProgressMap.set(jobId, {});
    }
    const progressRecord = this.fileProgressMap.get(jobId)!;
    progressRecord[fileName] = progress;
    this.notifySubscribers(jobId);
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get job progress
   */
  getProgress(jobId: string): UploadProgress | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      jobId,
      total: job.progress.total,
      completed: job.progress.completed,
      failed: job.progress.failed,
      percentage: Math.round((job.progress.completed / job.progress.total) * 100),
      currentFile: job.progress.currentFile,
      status: job.status,
      fileProgress: this.fileProgressMap.get(jobId)
    };
  }

  /**
   * Get all jobs
   */
  getAllJobs(): UploadJob[] {
    return Array.from(this.jobs.values()).sort((a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(callback: (progress: UploadProgress) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(jobId: string): void {
    const progress = this.getProgress(jobId);
    if (progress) {
      this.subscribers.forEach(callback => callback(progress));
    }
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'failed';
    job.completedAt = new Date();
    this.activeJobs.delete(jobId);
    this.notifySubscribers(jobId);

    return true;
  }

  /**
   * Retry a failed job
   */
  retryJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    // Reset job state
    job.status = 'pending';
    job.progress.completed = 0;
    job.progress.failed = 0;
    job.progress.currentFile = undefined;
    job.errors = [];
    job.startedAt = undefined;
    job.completedAt = undefined;

    this.processQueue();
    return true;
  }

  /**
   * Clear completed jobs older than specified hours
   */
  clearOldJobs(maxAgeHours: number = 24): number {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleared = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < cutoff) {
        this.jobs.delete(jobId);
        cleared++;
      }
    }

    return cleared;
  }
}

// Export singleton instance
export const batchUploadService = new BatchUploadService();
export type { UploadJob, UploadProgress };
