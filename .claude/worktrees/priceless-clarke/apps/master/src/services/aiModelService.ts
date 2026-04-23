// TensorFlow imports are dynamic to avoid pulling ~4MB into the main bundle
// They are loaded on first use via getTf() and getBlazeFace()
import { logger } from '../utils/logger';

let _tf: typeof import('@tensorflow/tfjs') | null = null;
let _blazeface: typeof import('@tensorflow-models/blazeface') | null = null;

async function getTf() {
    if (!_tf) {
        _tf = await import('@tensorflow/tfjs');
        await _tf.ready();
        logger.info('TensorFlow.js backend:', _tf.getBackend());
    }
    return _tf;
}

async function getBlazeFace() {
    if (!_blazeface) {
        _blazeface = await import('@tensorflow-models/blazeface');
    }
    return _blazeface;
}

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
    private blazefaceModel: any | null = null;
    private modelLoadPromise: Promise<any> | null = null;

    constructor() {
        // TensorFlow initialized lazily on first use via getTf()
    }

    /**
     * Load BlazeFace model (lazy, cached)
     */
    async loadBlazeFace(): Promise<any> {
        if (this.blazefaceModel) {
            return this.blazefaceModel;
        }

        if (this.modelLoadPromise) {
            return this.modelLoadPromise;
        }

        this.modelLoadPromise = getBlazeFace().then(bf => bf.load()).then(model => {
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
    async getMemoryInfo(): Promise<{ numTensors: number; numBytes: number }> {
        const tf = await getTf();
        return tf.memory();
    }
}

export const aiModelService = new AIModelService();
export type { Face, ColorStats };
