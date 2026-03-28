import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { logger } from '../utils/logger';

interface Face {
    topLeft: [number, number];
    bottomRight: [number, number];
    probability: number;
    landmarks: number[][];
}

interface ColorStats {
    mean: { r: number; g: number; b: number };
    std: { r: number; g: number; b: number };
    histogram: {
        r: number[];
        g: number[];
        b: number[];
    };
}

/**
 * AI Model Service
 * 
 * Manages TensorFlow.js model lifecycle for AI-powered image operations.
 * Handles lazy loading, caching, and proper tensor disposal for memory safety.
 */
class AIModelService {
    private blazefaceModel: blazeface.BlazeFaceModel | null = null;
    private modelLoadPromise: Promise<blazeface.BlazeFaceModel> | null = null;

    constructor() {
        // Set TensorFlow.js backend preference (WebGL > CPU)
        tf.ready().then(() => {
            logger.info('TensorFlow.js backend:', tf.getBackend());
        });
    }

    /**
     * Load BlazeFace model (lazy, cached)
     */
    async loadBlazeFace(): Promise<blazeface.BlazeFaceModel> {
        if (this.blazefaceModel) {
            return this.blazefaceModel;
        }

        if (this.modelLoadPromise) {
            return this.modelLoadPromise;
        }

        this.modelLoadPromise = blazeface.load().then(model => {
            this.blazefaceModel = model;
            logger.info('BlazeFace model loaded successfully');
            return model;
        });

        return this.modelLoadPromise;
    }

    /**
     * Detect faces in an image
     */
    async detectFaces(imageElement: HTMLImageElement): Promise<Face[]> {
        try {
            const model = await this.loadBlazeFace();
            const predictions = await model.estimateFaces(imageElement, false);

            return (predictions as any[]).map((prediction) => ({
                topLeft: prediction.topLeft as [number, number],
                bottomRight: prediction.bottomRight as [number, number],
                probability: prediction.probability?.[0] || 1.0,
                landmarks: prediction.landmarks as number[][]
            }));
        } catch (error) {
            logger.error('Face detection failed', error instanceof Error ? error : undefined);
            return [];
        }
    }

    /**
     * Analyze image color histogram
     */
    analyzeImageHistogram(imageData: ImageData): ColorStats {
        const { data, width, height } = imageData;
        const pixelCount = width * height;

        const histogram = {
            r: new Array(256).fill(0),
            g: new Array(256).fill(0),
            b: new Array(256).fill(0)
        };

        let sumR = 0, sumG = 0, sumB = 0;

        // Build histogram and calculate sums
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            histogram.r[r]++;
            histogram.g[g]++;
            histogram.b[b]++;

            sumR += r;
            sumG += g;
            sumB += b;
        }

        // Calculate means
        const mean = {
            r: sumR / pixelCount,
            g: sumG / pixelCount,
            b: sumB / pixelCount
        };

        // Calculate standard deviations
        let sumSqR = 0, sumSqG = 0, sumSqB = 0;
        for (let i = 0; i < data.length; i += 4) {
            sumSqR += Math.pow(data[i] - mean.r, 2);
            sumSqG += Math.pow(data[i + 1] - mean.g, 2);
            sumSqB += Math.pow(data[i + 2] - mean.b, 2);
        }

        const std = {
            r: Math.sqrt(sumSqR / pixelCount),
            g: Math.sqrt(sumSqG / pixelCount),
            b: Math.sqrt(sumSqB / pixelCount)
        };

        return { mean, std, histogram };
    }

    /**
     * Dispose all loaded models and free memory
     */
    dispose(): void {
        if (this.blazefaceModel) {
            this.blazefaceModel = null;
            this.modelLoadPromise = null;
            logger.info('BlazeFace model disposed');
        }
    }

    /**
     * Get TensorFlow.js memory stats
     */
    getMemoryInfo(): { numTensors: number; numBytes: number } {
        return tf.memory();
    }
}

export const aiModelService = new AIModelService();
export type { Face, ColorStats };
