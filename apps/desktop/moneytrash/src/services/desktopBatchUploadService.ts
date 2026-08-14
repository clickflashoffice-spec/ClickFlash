
/**
 * Desktop batch upload service
 * Handles high-volume concurrent uploads with native file system access
 */

import { invoke, isDesktop } from './tauriService';
import { logger } from '@/utils/logger';

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
    apiUrl?: string;
    deskId?: string;
    nativePaths?: string[];
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
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
}

const STORAGE_KEY = 'cf_moneytrash_upload_jobs';

export class DesktopBatchUploadService {
  private jobs: Map<string, UploadJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private nativeSessionsByJob: Map<string, Set<string>> = new Map();
  private maxConcurrentJobs: number = 3;
  private maxConcurrentFiles: number = 5;
  private subscribers: Array<(progress: UploadProgress) => void> = [];

  constructor() {
    this.loadJobsFromStorage();
  }

  private isJobCancelled(jobId: string): boolean {
    return this.jobs.get(jobId)?.status === 'cancelled';
  }

  private loadJobsFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: any[] = JSON.parse(raw);
      parsed.forEach((j) => {
        // Only load summary/meta since File objects cannot be stored in localStorage directly
        this.jobs.set(j.id, {
          ...j,
          files: [],
          createdAt: new Date(j.createdAt),
          startedAt: j.startedAt ? new Date(j.startedAt) : undefined,
          completedAt: j.completedAt ? new Date(j.completedAt) : undefined,
        });
      });
    } catch (err) {
      logger.warn('Failed to restore upload jobs from storage:', err);
    }
  }

  private saveJobsToStorage(): void {
    try {
      if (typeof window === 'undefined') return;
      const toSave = Array.from(this.jobs.values()).map((job) => ({
        id: job.id,
        metadata: job.metadata,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        errors: job.errors,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave.slice(0, 50)));
    } catch (err) {
      logger.warn('Failed to save upload jobs to storage:', err);
    }
  }

  /**
   * Create a new batch upload job
   */
  createJob(files: File[], metadata: UploadJob['metadata']): string {
    const jobId = crypto.randomUUID();
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
    this.saveJobsToStorage();
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
        if (this.isJobCancelled(job.id)) break;
        await this.processBatch(job, batch);
      }

      if (this.isJobCancelled(job.id)) return;

      // Mark job as completed if no failures
      if (job.progress.failed === 0) {
        job.status = 'completed';
      } else {
        job.status = 'failed';
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
    if (this.isJobCancelled(job.id)) return;
    const uploadPromises = batch.map((file) => {
      // Use native path if available
      const nativePath = job.metadata.nativePaths?.[job.files.indexOf(file)];
      return this.uploadFile(job, file, nativePath);
    });
    await Promise.all(uploadPromises);
  }

  /**
   * Upload a single file using the native streaming API
   */
  private async uploadFile(job: UploadJob, file: File, nativePath?: string): Promise<void> {
    if (this.isJobCancelled(job.id)) return;
    if (!isDesktop()) {
      job.progress.failed++;
      job.errors.push({
        file: file.name,
        error: 'ClickFlash desktop app required for native file uploads'
      });
      logger.error(`Cannot upload ${file.name}: not running in a desktop context`);
      this.notifySubscribers(job.id);
      return;
    }

    const sessionId = crypto.randomUUID();
    const sessions = this.nativeSessionsByJob.get(job.id) ?? new Set<string>();
    sessions.add(sessionId);
    this.nativeSessionsByJob.set(job.id, sessions);

    try {
      job.progress.currentFile = file.name;
      this.notifySubscribers(job.id);

      if (nativePath) {
        logger.info(`Starting native upload for ${file.name} at ${nativePath}`);
        
        await invoke('start_native_upload', {
          sessionId,
          filePath: nativePath,
          apiUrl: job.metadata.apiUrl,
          metadata: {
            eventName: job.metadata.eventName,
            accessCode: job.metadata.accessCode,
            mode: job.metadata.mode,
            mimeType: file.type,
            deskId: job.metadata.deskId,
            customerEmail: job.metadata.customerEmail,
            singlePhotoPrice: job.metadata.singlePhotoPrice,
            fullGalleryPrice: job.metadata.fullGalleryPrice
          }
        });
      } else {
        throw new Error("Native path is required for MoneyTrash uploads to avoid JS memory overhead.");
      }

      if (!this.isJobCancelled(job.id)) job.progress.completed++;
    } catch (error) {
      if (!this.isJobCancelled(job.id)) {
        job.progress.failed++;
        job.errors.push({
          file: file.name,
          error: error instanceof Error ? error.message : String(error)
        });
        logger.error(`Failed to upload ${file.name}:`, error);
      }
    } finally {
      sessions.delete(sessionId);
      if (sessions.size === 0) this.nativeSessionsByJob.delete(job.id);
      this.notifySubscribers(job.id);
    }
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
      status: job.status
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
    this.saveJobsToStorage();
    const progress = this.getProgress(jobId);
    if (progress) {
      this.subscribers.forEach(callback => callback(progress));
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (
      !job ||
      job.status === 'completed' ||
      job.status === 'failed' ||
      job.status === 'cancelled'
    ) {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    const sessions = [...(this.nativeSessionsByJob.get(jobId) ?? [])];
    await Promise.allSettled(
      sessions.map((sessionId) => invoke('cancel_upload', { sessionId }))
    );
    this.notifySubscribers(jobId);

    return true;
  }

  /**
   * Retry a failed job
   */
  retryJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || (job.status !== 'failed' && job.status !== 'cancelled')) {
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

    for (const [id, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        job.completedAt &&
        job.completedAt < cutoff) {
        this.jobs.delete(id);
        cleared++;
      }
    }

    return cleared;
  }
}

// Export singleton instance
export const desktopBatchUploadService = new DesktopBatchUploadService();
export type { UploadJob, UploadProgress };
