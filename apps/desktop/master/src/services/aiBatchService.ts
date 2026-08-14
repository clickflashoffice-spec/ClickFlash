import { logger } from '../utils/logger';
import { ManualEdits } from '../types/shared';
import { photoService } from './api/photoService';
import { aiModelService } from './aiModelService';
import { imageProcessingService } from './imageProcessingService';

import { db, BatchJob, AIBatchOperation } from './db';
export type { BatchJob, AIBatchOperation };

class AIBatchService {
    private static instance: AIBatchService;
    private isProcessing = false;
    private currentJob: BatchJob | null = null;
    private readonly MAX_CONCURRENT = 5; // Process max 5 photos simultaneously
    private readonly MEMORY_THRESHOLD_GB = 6; // Pause if memory exceeds 6GB

    private constructor() {
        logger.info('[AIBatchService] Initialized');
        this.init().catch(err => logger.error('[AIBatchService] Init error', err));
    }

    private async init() {
        const staleJobs = await db.batchJobs.where('status').anyOf(['queued', 'processing']).toArray();
        let needsProcessing = false;
        for (const job of staleJobs) {
            if (job.status === 'processing') {
                await db.batchJobs.update(job.id, { status: 'queued' });
                needsProcessing = true;
            } else if (job.status === 'queued') {
                needsProcessing = true;
            }
        }
        if (needsProcessing) {
            this.processQueue();
        }
    }

    public static getInstance(): AIBatchService {
        if (!AIBatchService.instance) {
            AIBatchService.instance = new AIBatchService();
        }
        return AIBatchService.instance;
    }

    public getCurrentJob(): BatchJob | null {
        return this.currentJob;
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

        await db.batchJobs.add(job);
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
        if (this.isProcessing) return;

        this.isProcessing = true;
        logger.info('[AIBatchService] Starting queue processing');

        while (true) {
            const jobs = await db.batchJobs.where('status').equals('queued').sortBy('createdAt');
            if (jobs.length === 0) break;

            const job = jobs[0];
            this.currentJob = job;
            job.status = 'processing';
            await db.batchJobs.update(job.id, { status: 'processing' });

            try {
                await this.executeJob(job);
                job.status = 'completed';
                job.progress = 100;
                job.completedAt = Date.now();
                await db.batchJobs.update(job.id, { status: 'completed', progress: 100, completedAt: job.completedAt });
                logger.info(`[AIBatchService] Job completed: ${job.id}`);
            } catch (error) {
                job.status = 'failed';
                job.error = error instanceof Error ? error.message : String(error);
                await db.batchJobs.update(job.id, { status: 'failed', error: job.error });
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
            await db.batchJobs.update(job.id, { progress: job.progress });

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
            for (let attempt = 1; attempt <= 5; attempt++) {
                const memoryMB = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
                const memoryGB = memoryMB / 1024;

                if (memoryGB <= this.MEMORY_THRESHOLD_GB) {
                    return;
                }

                logger.warn(`[AIBatchService] Memory usage high (${memoryGB.toFixed(2)}GB), pausing... (attempt ${attempt}/5)`);
                // Wait for GC to potentially free memory
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            logger.warn(`[AIBatchService] Memory still high after 5 attempts, proceeding anyway with risk.`);
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

    public async getJobStatus(jobId: string): Promise<BatchJob | null> {
        return (await db.batchJobs.get(jobId)) || null;
    }

    /**
     * Get all jobs (for UI display)
     */
    public async getAllJobs(): Promise<BatchJob[]> {
        return await db.batchJobs.orderBy('createdAt').reverse().toArray();
    }

    /**
     * Cancel a queued job
     */
    public async cancelJob(jobId: string): Promise<boolean> {
        const job = await db.batchJobs.get(jobId);
        if (job && (job.status === 'queued' || job.status === 'processing')) {
            await db.batchJobs.update(jobId, { status: 'failed', error: 'Cancelled' });
            logger.info(`[AIBatchService] Job cancelled: ${jobId}`);
            return true;
        }
        return false;
    }
}

export const aiBatchService = AIBatchService.getInstance();
