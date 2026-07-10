/**
 * Desktop Batch Upload Service for Tauri
 * Handles high-volume concurrent uploads with native file system access
 */

import { invoke, isTauri, calculateFileChecksums } from './tauriService';
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
    useNativePaths?: boolean;
    nativePaths?: string[];
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
}

const STORAGE_KEY = 'cf_moneytrash_upload_jobs';

class DesktopBatchUploadService {
  private jobs: Map<string, UploadJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;
  private maxConcurrentFiles: number = 5;
  private subscribers: Array<(progress: UploadProgress) => void> = [];

  constructor() {
    this.loadJobsFromStorage();
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
      console.warn('Failed to restore upload jobs from storage:', err);
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
      console.warn('Failed to save upload jobs to storage:', err);
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
      console.error(`Batch upload job ${jobId} failed:`, error);
    } finally {
      this.activeJobs.delete(jobId);
      this.processQueue(); // Process next jobs in queue
    }
  }

  /**
   * Process a batch of files concurrently
   */
  private async processBatch(job: UploadJob, batch: File[]): Promise<void> {
    const uploadPromises = batch.map((file) => {
      // Use native path if available
      const nativePath = job.metadata.nativePaths?.[job.files.indexOf(file)];
      return this.uploadFile(job, file, nativePath);
    });
    await Promise.all(uploadPromises);
  }

  /**
   * Upload a single file using Tauri's native APIs with streaming (Zero-Buffer)
   */
  private async uploadFile(job: UploadJob, file: File, nativePath?: string): Promise<void> {
    if (!isTauri()) {
      job.progress.failed++;
      job.errors.push({
        file: file.name,
        error: 'Tauri desktop app required for native file uploads'
      });
      console.error(`Cannot upload ${file.name}: Not running in Tauri context`);
      this.notifySubscribers(job.id);
      return;
    }

    const sessionId = crypto.randomUUID();
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for high-volume uploads
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      job.progress.currentFile = file.name;
      this.notifySubscribers(job.id);

      let sha256Checksum: string | undefined;
      let crc32Checksum: string | undefined;

      if (nativePath) {
        try {
          const checksums = await calculateFileChecksums(nativePath);
          sha256Checksum = checksums.sha256;
          crc32Checksum = checksums.crc32;
          logger.info(`[Checksum Verified] ${file.name}: CRC32=${crc32Checksum}, SHA256=${sha256Checksum}`);
        } catch (checksumErr) {
          logger.warn(`[Checksum Warning] Could not calculate native checksums for ${file.name}:`, { error: checksumErr instanceof Error ? checksumErr.message : String(checksumErr) });
        }

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          
          const chunkData = await invoke<number[]>('read_file_chunk', { 
            path: nativePath, 
            offset: start, 
            length: end - start 
          });

          await invoke('upload_file_chunk', {
            sessionId,
            chunkIndex: i,
            totalChunks,
            chunkData,
            fileName: file.name,
            fileSize: file.size,
            metadata: {
              eventName: job.metadata.eventName,
              accessCode: job.metadata.accessCode,
              mode: job.metadata.mode,
              mimeType: file.type,
              sha256Checksum,
              crc32Checksum
            }
          });
        }
      } else {
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunkBlob = file.slice(start, end);
          const chunkArrayBuffer = await chunkBlob.arrayBuffer();
          const chunkData = Array.from(new Uint8Array(chunkArrayBuffer));

          await invoke('upload_file_chunk', {
            sessionId,
            chunkIndex: i,
            totalChunks,
            chunkData,
            fileName: file.name,
            fileSize: file.size,
            metadata: {
              eventName: job.metadata.eventName,
              accessCode: job.metadata.accessCode,
              mode: job.metadata.mode,
              mimeType: file.type
            }
          });
        }
      }

      await invoke('finalize_upload', {
        sessionId,
        api_base_url: job.metadata.apiUrl,
        metadata: {
          eventName: job.metadata.eventName,
          accessCode: job.metadata.accessCode,
          mode: job.metadata.mode,
          mimeType: file.type
        }
      });

      job.progress.completed++;
    } catch (error) {
      job.progress.failed++;
      job.errors.push({
        file: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`Failed to upload ${file.name}:`, error);
    } finally {
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

    for (const [id, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') &&
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
