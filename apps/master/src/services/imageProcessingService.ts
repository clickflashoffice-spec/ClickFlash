import { logger } from '../utils/logger';
import { aiModelService, Face } from './aiModelService';

interface ColorAdjustments {
    exposure: number;
    contrast: number;
    saturation: number;
    clarity: number;
}

interface CropRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Image Processing Service
 * 
 * Pure functions and Web Worker dispatchers for image manipulation using Canvas API.
 * Provides auto-enhance, smart crop, face retouch, and batch processing capabilities.
 */
class ImageProcessingService {
    private worker: Worker | null = null;
    private msgIdCounter = 0;
    private pendingCallbacks = new Map<string, { resolve: (res: any) => void; reject: (err: any) => void }>();

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        try {
            if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
                this.worker = new Worker(new URL('../workers/imageProcessing.worker.ts', import.meta.url), { type: 'module' });
                this.worker.onmessage = (e: MessageEvent) => {
                    const { id, result, error } = e.data;
                    const cb = this.pendingCallbacks.get(id);
                    if (cb) {
                        this.pendingCallbacks.delete(id);
                        if (error) {
                            cb.reject(new Error(error));
                        } else {
                            cb.resolve(result);
                        }
                    }
                };
                this.worker.onerror = (err) => {
                    logger.error('ImageProcessingWorker error:', err);
                };
                logger.info('ImageProcessingWorker initialized successfully');
            }
        } catch (e) {
            logger.warn('Failed to initialize ImageProcessingWorker, falling back to main thread canvas:', e);
            this.worker = null;
        }
    }

    private async dispatchToWorker<T>(type: string, payload: any, transfer?: any[]): Promise<T> {
        if (!this.worker) {
            throw new Error('Worker not available');
        }
        const id = `msg_${++this.msgIdCounter}_${Date.now()}`;
        return new Promise<T>((resolve, reject) => {
            this.pendingCallbacks.set(id, { resolve, reject });
            if (transfer && transfer.length > 0) {
                this.worker!.postMessage({ id, type, payload }, transfer);
            } else {
                this.worker!.postMessage({ id, type, payload });
            }
        });
    }

    /**
     * Load image from URL into HTMLImageElement
     */
    async loadImageFromUrl(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    /**
     * Extract ImageData from image element
     */
    getImageData(image: HTMLImageElement, maxSize = 1920): ImageData {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Canvas context not available');
        }

        // Downsample if needed for memory safety
        let width = image.width;
        let height = image.height;

        if (width > maxSize || height > maxSize) {
            const scale = maxSize / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);

        return ctx.getImageData(0, 0, width, height);
    }

    /**
     * Auto-Enhance: Calculate optimal adjustments from histogram and apply pixel modifications
     * Dispatches to Web Worker if available, otherwise executes synchronously on main thread.
     */
    async autoEnhanceAsync(imageData: ImageData): Promise<{ adjustments: ColorAdjustments; imageData: ImageData }> {
        if (this.worker) {
            try {
                // Make a copy of imageData to transfer to worker
                const copy = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
                const result = await this.dispatchToWorker<{ adjustments: ColorAdjustments; imageData: ImageData }>(
                    'autoEnhance',
                    { imageData: copy },
                    [copy.data.buffer]
                );
                logger.info('Auto-enhance executed via Web Worker', result.adjustments);
                return result;
            } catch (err) {
                logger.warn('Worker autoEnhance failed, falling back to main thread', err);
            }
        }

        const adjustments = this.autoEnhance(imageData);
        return { adjustments, imageData };
    }

    /**
     * Synchronous Auto-Enhance fallback for main thread
     */
    autoEnhance(imageData: ImageData): ColorAdjustments {
        const stats = aiModelService.analyzeImageHistogram(imageData);

        const avgBrightness = (stats.mean.r + stats.mean.g + stats.mean.b) / 3;
        const targetBrightness = 128;
        const exposure = ((targetBrightness - avgBrightness) / 255) * 0.5;

        const avgStd = (stats.std.r + stats.std.g + stats.std.b) / 3;
        const targetStd = 70;
        const contrast = ((targetStd - avgStd) / 100) * 0.3;

        const colorSpread = Math.max(
            Math.abs(stats.mean.r - stats.mean.g),
            Math.abs(stats.mean.g - stats.mean.b),
            Math.abs(stats.mean.b - stats.mean.r)
        );
        const saturation = colorSpread < 20 ? 0.15 : 0.05;
        const clarity = 0.1;

        logger.info('Auto-enhance calculated synchronously', {
            exposure: exposure.toFixed(3),
            contrast: contrast.toFixed(3),
            avgBrightness: avgBrightness.toFixed(1),
            avgStd: avgStd.toFixed(1)
        });

        return {
            exposure: Math.max(-0.5, Math.min(0.5, exposure)),
            contrast: Math.max(-0.3, Math.min(0.3, contrast)),
            saturation,
            clarity
        };
    }

    /**
     * Smart Crop: Use face detection + rule of thirds
     */
    async smartCrop(image: HTMLImageElement, faces: Face[]): Promise<CropRegion> {
        const { width, height } = image;

        if (this.worker) {
            try {
                return await this.dispatchToWorker<CropRegion>('smartCrop', { width, height, faces });
            } catch (err) {
                logger.warn('Worker smartCrop failed, falling back to main thread', err);
            }
        }

        if (faces.length === 0) {
            const targetAspect = 4 / 3;
            const currentAspect = width / height;

            if (currentAspect > targetAspect) {
                const newWidth = height * targetAspect;
                return {
                    x: Math.round((width - newWidth) / 2),
                    y: 0,
                    width: Math.round(newWidth),
                    height
                };
            } else {
                const newHeight = width / targetAspect;
                return {
                    x: 0,
                    y: Math.round((height - newHeight) / 2),
                    width,
                    height: Math.round(newHeight)
                };
            }
        }

        const minX = Math.min(...faces.map(f => f.topLeft[0]));
        const minY = Math.min(...faces.map(f => f.topLeft[1]));
        const maxX = Math.max(...faces.map(f => f.bottomRight[0]));
        const maxY = Math.max(...faces.map(f => f.bottomRight[1]));

        const faceWidth = maxX - minX;
        const faceHeight = maxY - minY;

        const padding = 0.4;
        const cropWidth = faceWidth * (1 + padding * 2);
        const cropHeight = faceHeight * (1 + padding * 2);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const x = Math.max(0, Math.min(width - cropWidth, centerX - cropWidth / 2));
        const y = Math.max(0, Math.min(height - cropHeight, centerY - cropHeight * 0.4));

        logger.info('Smart crop calculated', {
            faces: faces.length,
            crop: { x: x.toFixed(0), y: y.toFixed(0), width: cropWidth.toFixed(0), height: cropHeight.toFixed(0) }
        });

        return {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(cropWidth),
            height: Math.round(cropHeight)
        };
    }

    /**
     * Face Retouch: Apply skin smoothing (simplified bilateral filter)
     */
    async faceRetouchAsync(imageData: ImageData, faces: Face[]): Promise<ImageData> {
        if (this.worker && faces.length > 0) {
            try {
                const copy = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
                return await this.dispatchToWorker<ImageData>('faceRetouch', { imageData: copy, faces }, [copy.data.buffer]);
            } catch (err) {
                logger.warn('Worker faceRetouch failed, falling back to main thread', err);
            }
        }
        return this.faceRetouch(imageData, faces);
    }

    /**
     * Synchronous Face Retouch fallback
     */
    faceRetouch(imageData: ImageData, faces: Face[]): ImageData {
        if (faces.length === 0) {
            return imageData;
        }

        const { data, width, height } = imageData;
        const output = new ImageData(width, height);
        output.data.set(data);

        for (const face of faces) {
            const [x1, y1] = face.topLeft;
            const [x2, y2] = face.bottomRight;

            const expansion = 0.2;
            const faceWidth = x2 - x1;
            const faceHeight = y2 - y1;

            const startX = Math.max(0, Math.floor(x1 - faceWidth * expansion));
            const endX = Math.min(width, Math.ceil(x2 + faceWidth * expansion));
            const startY = Math.max(0, Math.floor(y1 - faceHeight * expansion));
            const endY = Math.min(height, Math.ceil(y2 + faceHeight * expansion));

            const blurRadius = 2;

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    let r = 0, g = 0, b = 0, count = 0;

                    for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;

                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const idx = (ny * width + nx) * 4;
                                r += data[idx];
                                g += data[idx + 1];
                                b += data[idx + 2];
                                count++;
                            }
                        }
                    }

                    const idx = (y * width + x) * 4;
                    const blendFactor = 0.6;

                    output.data[idx] = Math.round(blendFactor * (r / count) + (1 - blendFactor) * data[idx]);
                    output.data[idx + 1] = Math.round(blendFactor * (g / count) + (1 - blendFactor) * data[idx + 1]);
                    output.data[idx + 2] = Math.round(blendFactor * (b / count) + (1 - blendFactor) * data[idx + 2]);
                }
            }
        }

        logger.info('Face retouch applied synchronously', { faces: faces.length });
        return output;
    }

    /**
     * Batch process multiple images for auto enhancement without blocking
     */
    async batchAutoEnhance(images: { id: string; imageData: ImageData }[]): Promise<Map<string, { adjustments: ColorAdjustments; imageData: ImageData }>> {
        const results = new Map<string, { adjustments: ColorAdjustments; imageData: ImageData }>();
        for (const item of images) {
            try {
                const res = await this.autoEnhanceAsync(item.imageData);
                results.set(item.id, res);
            } catch (err) {
                logger.error(`Batch auto enhance failed for photo ${item.id}:`, err);
            }
        }
        return results;
    }
}

export const imageProcessingService = new ImageProcessingService();
export type { ColorAdjustments, CropRegion };
