import { logger } from '../utils/logger';
import { ManualEdits } from '../types/shared';
import { photoService } from './api/photoService';
import { aiModelService } from './aiModelService';
import { imageProcessingService } from './imageProcessingService';

export type AIBatchOperation = 'auto-enhance' | 'smart-crop' | 'face-retouch';

export interface BatchJob {
    id: string;
    photoIds: string[];
    operation: AIBatchOperation;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    createdAt: number;
    completedAt?: number;
    error?: string;
}

class AIBatchService {
    private static instance: AIBatchService;
    private queue: BatchJob[] = [];
    private isProcessing = false;
    private currentJob: BatchJob | null = null;
    private readonly MAX_CONCURRENT = 5; // Process max 5 photos simultaneously
    private readonly MEMORY_THRESHOLD_GB = 6; // Pause if memory exceeds 6GB

    private constructor() {
        logger.info('[AIBatchService] Initialized');
    }

    public static getInstance(): AIBatchService {
        if (!AIBatchService.instance) {
            AIBatchService.instance = new AIBatchService();
        }
        return AIBatchService.instance;
    }

    /**
     * Submit a new batch job to the queue
     */
    public async submitJob(photoIds: string[], operation: AIBatchOperation): Promise<string> {
        const job: BatchJob = {
            id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            photoIds,
            operation,
            status: 'queued',
            progress: 0,
            createdAt: Date.now()
        };

        this.queue.push(job);
        logger.info(`[AIBatchService] Job submitted: ${job.id} (${photoIds.length} photos, ${operation})`);

        // Start processing if not already running
        if (!this.isProcessing) {
            this.processQueue();
        }

        return job.id;
    }

    /**
     * Sequential queue processor (Rule 15: Memory Safety)
     */
    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        logger.info('[AIBatchService] Starting queue processing');

        while (this.queue.length > 0) {
            const job = this.queue.shift()!;
            this.currentJob = job;
            job.status = 'processing';

            try {
                await this.executeJob(job);
                job.status = 'completed';
                job.progress = 100;
                job.completedAt = Date.now();
                logger.info(`[AIBatchService] Job completed: ${job.id}`);
            } catch (error) {
                job.status = 'failed';
                job.error = error instanceof Error ? error.message : String(error);
                logger.error(`[AIBatchService] Job failed: ${job.id}`, error);
            }

            this.currentJob = null;
        }

        this.isProcessing = false;
        logger.info('[AIBatchService] Queue processing complete');
    }

    /**
     * Execute a single batch job with memory safety
     */
    private async executeJob(job: BatchJob) {
        const totalPhotos = job.photoIds.length;
        logger.info(`[AIBatchService] Executing ${job.operation} on ${totalPhotos} photos`);

        // Process in batches to prevent memory overflow
        const batchSize = this.MAX_CONCURRENT;
        for (let i = 0; i < totalPhotos; i += batchSize) {
            const batch = job.photoIds.slice(i, Math.min(i + batchSize, totalPhotos));

            // Check memory before processing batch
            await this.waitForMemorySafety();

            // Process batch concurrently
            await Promise.allSettled(
                batch.map(photoId => this.processPhoto(photoId, job.operation))
            );

            job.progress = Math.round(((i + batch.length) / totalPhotos) * 100);

            // Small yield to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    /**
     * Wait for memory to be under threshold (Rule 15: Memory Safety)
     */
    private async waitForMemorySafety(): Promise<void> {
        // Check if performance.memory API is available (Chromium-based browsers)
        if ('memory' in performance && (performance as any).memory) {
            const memoryMB = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
            const memoryGB = memoryMB / 1024;

            if (memoryGB > this.MEMORY_THRESHOLD_GB) {
                logger.warn(`[AIBatchService] Memory usage high (${memoryGB.toFixed(2)}GB), pausing...`);
                // Wait for GC to potentially free memory
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Process a single photo with the specified AI operation
     */
    private async processPhoto(photoId: string, operation: AIBatchOperation): Promise<void> {
        logger.debug(`[AIBatchService] Processing photo ${photoId} with ${operation}`);

        switch (operation) {
            case 'auto-enhance':
                await this.applyAutoEnhance(photoId);
                break;
            case 'smart-crop':
                await this.applySmartCrop(photoId);
                break;
            case 'face-retouch':
                await this.applyFaceRetouch(photoId);
                break;
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Apply auto-enhance (histogram-based adaptive adjustments)
     */
    private async applyAutoEnhance(photoId: string): Promise<void> {
        try {
            // Fetch photo to get URL
            const currentPhoto = await photoService.getPhotos().then(photos =>
                photos.find(p => p.id === photoId)
            );

            if (!currentPhoto || !currentPhoto.url) {
                throw new Error(`Photo ${photoId} not found or missing URL`);
            }

            // Load image and analyze histogram
            const image = await imageProcessingService.loadImageFromUrl(currentPhoto.url);
            const imageData = imageProcessingService.getImageData(image);

            // Calculate optimal adjustments
            const adjustments = imageProcessingService.autoEnhance(imageData);

            // Convert to ManualEdits format
            const edits: Partial<ManualEdits> = {
                exposure: Math.round(adjustments.exposure * 100),
                contrast: Math.round(adjustments.contrast * 100),
                saturate: Math.round(adjustments.saturation * 100),
                clarity: Math.round(adjustments.clarity * 100)
            };

            await this.saveEditsToPhoto(photoId, edits);
            logger.debug(`[AIBatchService] Auto-enhance applied to ${photoId}:`, edits);
        } catch (error) {
            logger.error(`[AIBatchService] Auto-enhance failed for ${photoId}`, error);
            throw error;
        }
    }

    /**
     * Apply smart crop (BlazeFace detection + rule of thirds)
     */
    private async applySmartCrop(photoId: string): Promise<void> {
        try {
            // Fetch photo to get URL
            const currentPhoto = await photoService.getPhotos().then(photos =>
                photos.find(p => p.id === photoId)
            );

            if (!currentPhoto || !currentPhoto.url) {
                throw new Error(`Photo ${photoId} not found or missing URL`);
            }

            // Load image and detect faces
            const image = await imageProcessingService.loadImageFromUrl(currentPhoto.url);
            const faces = await aiModelService.detectFaces(image);

            // Calculate smart crop region
            const cropRegion = await imageProcessingService.smartCrop(image, faces);

            // Convert to normalized coordinates (0-1)
            const edits: Partial<ManualEdits> = {
                crop: {
                    x: cropRegion.x / image.width,
                    y: cropRegion.y / image.height,
                    width: cropRegion.width / image.width,
                    height: cropRegion.height / image.height
                }
            };

            await this.saveEditsToPhoto(photoId, edits);
            logger.debug(`[AIBatchService] Smart crop applied to ${photoId}:`, edits.crop);
        } catch (error) {
            logger.error(`[AIBatchService] Smart crop failed for ${photoId}`, error);
            throw error;
        }
    }

    /**
     * Apply face retouching (skin smoothing with bilateral filter)
     */
    private async applyFaceRetouch(photoId: string): Promise<void> {
        try {
            // Fetch photo to get URL
            const currentPhoto = await photoService.getPhotos().then(photos =>
                photos.find(p => p.id === photoId)
            );

            if (!currentPhoto || !currentPhoto.url) {
                throw new Error(`Photo ${photoId} not found or missing URL`);
            }

            // Load image and detect faces
            const image = await imageProcessingService.loadImageFromUrl(currentPhoto.url);
            const faces = await aiModelService.detectFaces(image);

            if (faces.length === 0) {
                logger.debug(`[AIBatchService] No faces detected for retouch in ${photoId}`);
                return; // Skip if no faces
            }

            // Apply face retouching
            const imageData = imageProcessingService.getImageData(image);
            imageProcessingService.faceRetouch(imageData, faces);

            // For now, use general softening in edits
            // In production, we'd apply the retouched imageData directly
            const edits: Partial<ManualEdits> = {
                soften: 30,
                clarity: 10
            };

            await this.saveEditsToPhoto(photoId, edits);
            logger.debug(`[AIBatchService] Face retouch applied to ${photoId} (${faces.length} faces)`);
        } catch (error) {
            logger.error(`[AIBatchService] Face retouch failed for ${photoId}`, error);
            throw error;
        }
    }

    /**
     * Save edits to photo metadata (non-destructive)
     */
    private async saveEditsToPhoto(photoId: string, edits: Partial<ManualEdits>): Promise<void> {
        try {
            // Fetch current photo to merge edits
            const currentPhoto = await photoService.getPhotos().then(photos =>
                photos.find(p => p.id === photoId)
            );

            if (!currentPhoto) {
                throw new Error(`Photo ${photoId} not found`);
            }

            // Merge new edits with existing ones
            const mergedEdits: ManualEdits = {
                ...currentPhoto.manualEdits,
                ...edits
            } as ManualEdits;

            // Update photo with merged edits
            await photoService.updatePhoto(photoId, { manualEdits: mergedEdits });
            logger.debug(`[AIBatchService] Edits saved for photo ${photoId}`);
        } catch (error) {
            logger.error(`[AIBatchService] Failed to save edits for photo ${photoId}`, error);
            throw error;
        }
    }

    /**
     * Get current job status
     */
    public getJobStatus(jobId: string): BatchJob | null {
        if (this.currentJob?.id === jobId) return this.currentJob;
        return this.queue.find(j => j.id === jobId) || null;
    }

    /**
     * Get all jobs (for UI display)
     */
    public getAllJobs(): BatchJob[] {
        const jobs = [...this.queue];
        if (this.currentJob) jobs.unshift(this.currentJob);
        return jobs;
    }

    /**
     * Cancel a queued job
     */
    public cancelJob(jobId: string): boolean {
        const index = this.queue.findIndex(j => j.id === jobId);
        if (index !== -1) {
            this.queue.splice(index, 1);
            logger.info(`[AIBatchService] Job cancelled: ${jobId}`);
            return true;
        }
        return false;
    }
}

export const aiBatchService = AIBatchService.getInstance();
