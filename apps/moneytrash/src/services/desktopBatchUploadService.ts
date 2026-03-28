/**
 * Desktop Batch Upload Service for Tauri
 * Handles high-volume concurrent uploads with native file system access
 */

import { invoke, isTauri } from './tauriService';

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

class DesktopBatchUploadService {
  private jobs: Map<string, UploadJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;
  private maxConcurrentFiles: number = 5;
  private subscribers: Array<(progress: UploadProgress) => void> = [];

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
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for bridge efficiency
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      job.progress.currentFile = file.name;
      this.notifySubscribers(job.id);

      if (nativePath) {
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
              mimeType: file.type
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
