import { db, BackgroundJob } from './db';
import { logger } from '../utils/logger';
import { pb } from '../services/pb';

class BackgroundJobService {
    /**
     * Add a new job to the queue
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
     * Get the next pending job based on priority and createdAt
     */
    async getNextJob(): Promise<BackgroundJob | undefined> {
        return await db.backgroundJobs
            .where('status')
            .equals('pending')
            .sortBy('priority')
            .then(jobs => {
                // Return the highest priority (lowest number) first, then oldest
                return jobs[0];
            });
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
    async processNext(): Promise<boolean> {
        const job = await this.getNextJob();
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
