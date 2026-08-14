import { db, BackgroundJob } from './db';
import { logger } from '../utils/logger';
import { pb } from '../services/pb';
import { imageProcessingService } from './imageProcessingService';

class BackgroundJobService {
    constructor() {
        this.recoverStaleJobs().catch(err => logger.error('[BackgroundJobService] Recover stale jobs failed', err));
    }

    private async recoverStaleJobs() {
        const staleJobs = await db.backgroundJobs.where('status').equals('processing').toArray();
        for (const job of staleJobs) {
            const retries = (job.retries || 0) + 1;
            const status = retries < 3 ? 'pending' : 'failed';
            await this.updateJob(job.id!, { status, retries });
            logger.info(`[BackgroundJobService] Recovered stale job ${job.id} -> ${status}`);
        }
    }

    /**
     * Add a new job to the queue
     * @param type - The type of job to execute
     * @param payload - The data payload for the job
     * @param priority - Lower number means higher priority (default 0)
     */
    async addJob(type: BackgroundJob['type'], payload: unknown, priority = 0): Promise<number> {
        const now = Date.now();
        const job: BackgroundJob = {
            type,
            payload,
            priority,
            status: 'pending',
            retries: 0,
            createdAt: now,
            updatedAt: now
        };

        const id = await db.backgroundJobs.add(job);
        logger.info(`[BackgroundJobService] Job added`, { id, type, priority });
        return id;
    }

    /**
     * Get the next pending jobs based on priority and createdAt
     */
    async getNextJobs(limit = 1): Promise<BackgroundJob[]> {
        return await db.backgroundJobs
            .where('status')
            .equals('pending')
            .limit(100)
            .toArray()
            .then(jobs => {
                // Return the highest priority (lowest number) first, then oldest
                jobs.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
                return jobs.slice(0, limit);
            });
    }

    async getNextJob(): Promise<BackgroundJob | undefined> {
        const jobs = await this.getNextJobs(1);
        return jobs[0];
    }

    /**
     * Update job status and handle errors
     */
    async updateJob(id: number, updates: Partial<BackgroundJob>): Promise<void> {
        await db.backgroundJobs.update(id, {
            ...updates,
            updatedAt: Date.now()
        });
    }

    /**
     * Process the next job in the queue
     * This is a simple runner for now, will be replaced by Web Worker
     */
    async processNext(concurrency = 3): Promise<boolean> {
        const jobs = await this.getNextJobs(concurrency);
        if (jobs.length === 0) return false;

        const results = await Promise.allSettled(jobs.map(job => this.processSingleJob(job)));
        return results.some(r => r.status === 'fulfilled' && r.value === true);
    }

    private async processSingleJob(job: BackgroundJob): Promise<boolean> {
        if (!job || !job.id) return false;

        try {
            await this.updateJob(job.id, { status: 'processing' });

            // Logic for specific job types (Rule 13: Decoupled Heavy Operations)
            switch (job.type) {
                case 'thumbnail':
                case 'watermark':
                    // Trigger backend worker via API
                    await pb.request(`/api/files/process-heavy`, {
                        method: 'POST',
                        body: JSON.stringify({ type: job.type, payload: job.payload })
                    });
                    break;
                case 'migrate':
                    // Trigger storage migration
                    await pb.request('/api/migrate-storage', { method: 'POST' });
                    break;
                case 'auto_edit': {
                    const payload = job.payload as { photoId?: string; url: string; albumId?: string };
                    if (payload && payload.url) {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        await Promise.race([
                            new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = () => reject(new Error('Failed to load image for auto_edit'));
                                img.src = payload.url;
                            }),
                            new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Image load timeout')), 30000))
                        ]);
                        
                        let imgData: ImageData;
                        const c = document.createElement('canvas');
                        try {
                            c.width = img.width; 
                            c.height = img.height; 
                            const ctx = c.getContext('2d')!; 
                            ctx.drawImage(img, 0, 0); 
                            imgData = ctx.getImageData(0, 0, c.width, c.height);
                        } finally {
                            c.width = 0; 
                            c.height = 0; // Release memory aggressively
                        }

                        const processed = await imageProcessingService.autoEditFullAsync(imgData);
                        
                        if (payload.photoId) {
                            await pb.request(`/api/photos/${payload.photoId}/auto-edits`, {
                                method: 'POST',
                                body: JSON.stringify({
                                    autoEdits: { applied: true, enhanced: true },
                                    editMetadata: processed.editMetadata,
                                    width: processed.imageData.width,
                                    height: processed.imageData.height
                                })
                            }).catch(() => {});
                        }
                    }
                    break;
                }
                case 'batch_enhance': {
                    const payload = job.payload as { albumId: string; photos: Array<{ id: string; url: string }> };
                    if (payload && payload.photos) {
                        for (const photo of payload.photos) {
                            try {
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                await Promise.race([
                                    new Promise<void>((resolve, reject) => {
                                        img.onload = () => resolve();
                                        img.onerror = () => reject(new Error('Failed to load image in batch'));
                                        img.src = photo.url;
                                    }),
                                    new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Image load timeout')), 30000))
                                ]);
                                
                                let imgData: ImageData;
                                const c = document.createElement('canvas');
                                try {
                                    c.width = img.width; 
                                    c.height = img.height; 
                                    const ctx = c.getContext('2d')!; 
                                    ctx.drawImage(img, 0, 0); 
                                    imgData = ctx.getImageData(0, 0, c.width, c.height);
                                } finally {
                                    c.width = 0; 
                                    c.height = 0; // Release memory aggressively
                                }

                                const processed = await imageProcessingService.autoEditFullAsync(imgData);
                                
                                await pb.request(`/api/photos/${photo.id}/auto-edits`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        autoEdits: { applied: true, enhanced: true },
                                        editMetadata: processed.editMetadata,
                                        width: processed.imageData.width,
                                        height: processed.imageData.height
                                    })
                                }).catch(() => {});
                            } catch (e) {
                                logger.warn(`[BackgroundJobService] Failed single photo in batch_enhance`, { photoId: photo.id });
                            }
                        }
                    }
                    break;
                }
            }


            await this.updateJob(job.id, { status: 'completed' });
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const retries = (job.retries || 0) + 1;
            const status = retries >= 3 ? 'failed' : 'pending';

            await this.updateJob(job.id, {
                status,
                retries,
                error: errorMessage
            });

            logger.error(`[BackgroundJobService] Job failed`, { id: job.id, type: job.type, error: errorMessage });
            return false;
        }
    }
}

export const backgroundJobService = new BackgroundJobService();
