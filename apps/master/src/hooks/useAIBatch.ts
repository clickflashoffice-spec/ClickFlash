import React from 'react';
import { aiBatchService } from '../services/aiBatchService';
import { AIBatchOperation, BatchJob } from '../services/db';
import { logger } from '../utils/logger';

export function useAIBatch() {
    const [jobs, setJobs] = React.useState<BatchJob[]>([]);
    const [isProcessing, setIsProcessing] = React.useState(false);

    // Poll for job updates
    React.useEffect(() => {
        const interval = setInterval(async () => {
            const allJobs = (await aiBatchService.getAllJobs()) as BatchJob[];
            setJobs(allJobs);
            setIsProcessing(allJobs.some(j => j.status === 'processing'));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const submitBatchJob = React.useCallback(async (photoIds: string[], operation: AIBatchOperation) => {
        try {
            const jobId = await aiBatchService.submitJob(photoIds, operation);
            logger.info(`[useAIBatch] Batch job submitted: ${jobId}`);
            return jobId;
        } catch (error) {
            logger.error('[useAIBatch] Failed to submit batch job', error);
            throw error;
        }
    }, []);

    const cancelJob = React.useCallback((jobId: string) => {
        return aiBatchService.cancelJob(jobId);
    }, []);

    return {
        jobs,
        isProcessing,
        submitBatchJob,
        cancelJob
    };
}
