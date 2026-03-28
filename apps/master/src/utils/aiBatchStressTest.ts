import { logger } from './logger';
import { aiBatchService, AIBatchOperation } from '../services/aiBatchService';
import { aiModelService } from '../services/aiModelService';

interface TestResult {
    scenario: string;
    photoCount: number;
    operations: AIBatchOperation[];
    totalTimeMs: number;
    avgTimeMsPerPhoto: number;
    peakMemoryGB: number;
    success: boolean;
    errors: string[];
}

interface MemoryStats {
    currentUsageGB: number;
    peakUsageGB: number;
    tensorCount: number;
    numBytes: number;
}

interface PerformanceMetrics {
    operation: AIBatchOperation;
    samples: number;
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    successCount: number;
    errorCount: number;
}

/**
 * AI Batch Stress Test Utility
 * 
 * Validates batch processing under various load conditions:
 * - Small batches (10 photos)
 * - Medium batches (50 photos)
 * - Large batches (100+ photos)
 * - Memory monitoring
 * - Performance benchmarking
 */
class AIBatchStressTest {
    private memoryPeakGB = 0;

    /**
     * Run small batch stress test (10 photos)
     */
    async runSmallBatch(): Promise<TestResult> {
        logger.info('[StressTest] Running small batch (10 photos)');
        return this.runBatchTest('Small Batch', 10, ['auto-enhance', 'smart-crop', 'face-retouch']);
    }

    /**
     * Run medium batch stress test (50 photos)
     */
    async runMediumBatch(): Promise<TestResult> {
        logger.info('[StressTest] Running medium batch (50 photos)');
        return this.runBatchTest('Medium Batch', 50, ['auto-enhance', 'smart-crop']);
    }

    /**
     * Run large batch stress test (100+ photos)
     */
    async runLargeBatch(): Promise<TestResult> {
        logger.info('[StressTest] Running large batch (100 photos)');
        return this.runBatchTest('Large Batch', 100, ['auto-enhance']);
    }

    /**
     * Run concurrent batches from multiple "users"
     */
    async runConcurrentBatches(): Promise<TestResult[]> {
        logger.info('[StressTest] Running concurrent batches');

        const results = await Promise.all([
            this.runBatchTest('Concurrent Batch 1', 20, ['auto-enhance']),
            this.runBatchTest('Concurrent Batch 2', 20, ['smart-crop']),
            this.runBatchTest('Concurrent Batch 3', 20, ['face-retouch'])
        ]);

        return results;
    }

    /**
     * Monitor memory usage during batch processing
     */
    async monitorMemoryUsage(durationMs = 5000): Promise<MemoryStats> {
        logger.info('[StressTest] Monitoring memory for', durationMs, 'ms');

        const samples: MemoryStats[] = [];
        const startTime = Date.now();

        while (Date.now() - startTime < durationMs) {
            const stats = this.getCurrentMemoryStats();
            samples.push(stats);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Calculate peak
        const peakUsageGB = Math.max(...samples.map(s => s.currentUsageGB));
        const avgTensors = samples.reduce((sum, s) => sum + s.tensorCount, 0) / samples.length;

        logger.info('[StressTest] Memory monitoring complete:', {
            peakUsageGB: peakUsageGB.toFixed(2),
            avgTensors: avgTensors.toFixed(0)
        });

        return {
            currentUsageGB: samples[samples.length - 1].currentUsageGB,
            peakUsageGB,
            tensorCount: Math.round(avgTensors),
            numBytes: samples[samples.length - 1].numBytes
        };
    }

    /**
     * Benchmark individual AI operations
     */
    async benchmarkOperations(sampleSize = 10): Promise<PerformanceMetrics[]> {
        logger.info('[StressTest] Benchmarking operations with sample size:', sampleSize);

        const operations: AIBatchOperation[] = ['auto-enhance', 'smart-crop', 'face-retouch'];
        const results: PerformanceMetrics[] = [];

        for (const operation of operations) {
            const metrics = await this.benchmarkOperation(operation, sampleSize);
            results.push(metrics);
        }

        return results;
    }

    /**
     * Internal: Run a batch test scenario
     */
    private async runBatchTest(
        scenario: string,
        photoCount: number,
        operations: AIBatchOperation[]
    ): Promise<TestResult> {
        const errors: string[] = [];
        const startTime = Date.now();
        this.memoryPeakGB = 0;

        try {
            // Generate mock photo IDs
            const photoIds = Array.from({ length: photoCount }, (_, i) => `test-photo-${i}`);

            // Submit batch jobs for each operation
            const jobIds: string[] = [];
            for (const operation of operations) {
                const jobId = await aiBatchService.submitJob(photoIds, operation);
                jobIds.push(jobId);
            }

            // Monitor jobs until completion
            await this.waitForJobs(jobIds);

            // Track memory peak
            const memoryStats = this.getCurrentMemoryStats();
            this.memoryPeakGB = Math.max(this.memoryPeakGB, memoryStats.currentUsageGB);

        } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
        }

        const totalTimeMs = Date.now() - startTime;
        const avgTimeMsPerPhoto = totalTimeMs / (photoCount * operations.length);

        const result: TestResult = {
            scenario,
            photoCount,
            operations,
            totalTimeMs,
            avgTimeMsPerPhoto,
            peakMemoryGB: this.memoryPeakGB,
            success: errors.length === 0,
            errors
        };

        logger.info(`[StressTest] ${scenario} complete:`, {
            totalTimeMs,
            avgTimeMsPerPhoto: avgTimeMsPerPhoto.toFixed(2),
            peakMemoryGB: this.memoryPeakGB.toFixed(2)
        });

        return result;
    }

    /**
     * Internal: Wait for batch jobs to complete
     */
    private async waitForJobs(jobIds: string[]): Promise<void> {
        const maxWaitMs = 300000; // 5 minutes max
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            const allComplete = jobIds.every(jobId => {
                const job = aiBatchService.getJobStatus(jobId);
                return job && (job.status === 'completed' || job.status === 'failed');
            });

            if (allComplete) {
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error('Batch jobs timed out after 5 minutes');
    }

    /**
     * Internal: Benchmark a single operation
     */
    private async benchmarkOperation(
        operation: AIBatchOperation,
        sampleSize: number
    ): Promise<PerformanceMetrics> {
        const latencies: number[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < sampleSize; i++) {
            const startTime = Date.now();

            try {
                await aiBatchService.submitJob([`benchmark-photo-${i}`], operation);
                const latency = Date.now() - startTime;
                latencies.push(latency);
                successCount++;
            } catch (error) {
                errorCount++;
            }
        }

        const avgLatencyMs = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
        const minLatencyMs = Math.min(...latencies);
        const maxLatencyMs = Math.max(...latencies);

        return {
            operation,
            samples: sampleSize,
            avgLatencyMs,
            minLatencyMs,
            maxLatencyMs,
            successCount,
            errorCount
        };
    }

    /**
     * Internal: Get current memory statistics
     */
    private getCurrentMemoryStats(): MemoryStats {
        let currentUsageGB = 0;

        // Browser memory API (Chrome/Edge)
        if ('memory' in performance && (performance as any).memory) {
            const heapMB = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
            currentUsageGB = heapMB / 1024;
        }

        // TensorFlow.js memory
        const tfMemory = aiModelService.getMemoryInfo();

        return {
            currentUsageGB,
            peakUsageGB: this.memoryPeakGB,
            tensorCount: tfMemory.numTensors,
            numBytes: tfMemory.numBytes
        };
    }

    /**
     * Run all stress tests
     */
    async runAllTests(): Promise<{
        small: TestResult;
        medium: TestResult;
        large: TestResult;
        concurrent: TestResult[];
        memory: MemoryStats;
        benchmarks: PerformanceMetrics[];
    }> {
        logger.info('[StressTest] Running all stress tests...');

        const small = await this.runSmallBatch();
        const medium = await this.runMediumBatch();
        const large = await this.runLargeBatch();
        const concurrent = await this.runConcurrentBatches();
        const memory = await this.monitorMemoryUsage(10000);
        const benchmarks = await this.benchmarkOperations(5);

        logger.info('[StressTest] All tests complete');

        return { small, medium, large, concurrent, memory, benchmarks };
    }
}

export const aiBatchStressTest = new AIBatchStressTest();
export type { TestResult, MemoryStats, PerformanceMetrics };
