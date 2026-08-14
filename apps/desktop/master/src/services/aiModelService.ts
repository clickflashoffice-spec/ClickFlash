// TensorFlow and face-api imports are dynamic to avoid pulling large deps into the main bundle
import { logger } from '../utils/logger';

let _tf: typeof import('@tensorflow/tfjs') | null = null;
let _faceapi: typeof import('@vladmandic/face-api') | null = null;

async function getTf() {
    if (!_tf) {
        _tf = await import('@tensorflow/tfjs');
        await _tf.ready();
        try {
            await _tf.setBackend('cpu');
        } catch (e) {
            logger.warn('Could not set CPU backend, using default');
        }
        logger.info('TensorFlow.js backend:', _tf.getBackend());
    }
    return _tf;
}

async function getFaceApi() {
    if (!_faceapi) {
        _faceapi = await import('@vladmandic/face-api');
    }
    return _faceapi;
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
    private faceApiModel: any | null = null;
    private modelLoadPromise: Promise<any> | null = null;

    constructor() {
        // TensorFlow/face-api initialized lazily on first use
    }

    /**
     * Load face-api model (lazy, cached)
     */
    async loadFaceApi(): Promise<any> {
        if (this.faceApiModel) {
            return this.faceApiModel;
        }

        if (this.modelLoadPromise) {
            return this.modelLoadPromise;
        }

        this.modelLoadPromise = getFaceApi().then(async (faceapi) => {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            this.faceApiModel = faceapi;
            logger.info('Face-api tinyFaceDetector loaded successfully');
            return faceapi;
        });

        return this.modelLoadPromise;
    }

    /**
     * Backwards compatible alias
     */
    async loadBlazeFace(): Promise<any> {
        return this.loadFaceApi();
    }

    /**
     * Detect faces in an image
     */
    async detectFaces(imageElement: HTMLImageElement): Promise<Face[]> {
        if (!imageElement || !imageElement.width || !imageElement.height) {
            logger.warn('Face detection skipped: image not loaded or has no dimensions');
            return [];
        }

        try {
            const faceapi = await this.loadFaceApi();
            if (!faceapi) {
                logger.error('Face-api model not properly loaded');
                return [];
            }

            const options = new faceapi.TinyFaceDetectorOptions();
            const detections = await faceapi.detectAllFaces(imageElement, options);

            return detections.map((detection: any) => ({
                topLeft: [detection.box.x, detection.box.y] as [number, number],
                bottomRight: [detection.box.x + detection.box.width, detection.box.y + detection.box.height] as [number, number],
                probability: detection.score || 1.0,
                landmarks: []
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('does not support image input')) {
                logger.warn('Face detection skipped: model does not support this image type');
            } else if (message.includes('tfjs') || message.includes('tensor') || message.includes('Tensor')) {
                logger.warn('Face detection skipped: TensorFlow error', { error: message });
            } else {
                logger.error('Face detection failed', error instanceof Error ? error : undefined);
            }
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
        if (this.faceApiModel) {
            this.faceApiModel = null;
            this.modelLoadPromise = null;
            logger.info('Face-api model disposed');
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
