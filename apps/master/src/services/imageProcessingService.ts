import { logger } from '../utils/logger';
import { aiModelService, Face, ColorStats } from './aiModelService';

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
 * Pure functions for image manipulation using Canvas API.
 * Provides auto-enhance, smart crop, and face retouch capabilities.
 */
class ImageProcessingService {
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
     * Auto-Enhance: Calculate optimal adjustments from histogram
     */
    autoEnhance(imageData: ImageData): ColorAdjustments {
        const stats = aiModelService.analyzeImageHistogram(imageData);

        // Calculate exposure adjustment based on mean brightness
        const avgBrightness = (stats.mean.r + stats.mean.g + stats.mean.b) / 3;
        const targetBrightness = 128;
        const exposure = ((targetBrightness - avgBrightness) / 255) * 0.5; // Scale to [-0.5, 0.5]

        // Calculate contrast adjustment based on standard deviation
        const avgStd = (stats.std.r + stats.std.g + stats.std.b) / 3;
        const targetStd = 70;
        const contrast = ((targetStd - avgStd) / 100) * 0.3; // Scale to [-0.3, 0.3]

        // Calculate saturation boost based on color spread
        const colorSpread = Math.max(
            Math.abs(stats.mean.r - stats.mean.g),
            Math.abs(stats.mean.g - stats.mean.b),
            Math.abs(stats.mean.b - stats.mean.r)
        );
        const saturation = colorSpread < 20 ? 0.15 : 0.05; // Boost if low saturation

        // Clarity boost for better definition
        const clarity = 0.1;

        logger.info('Auto-enhance calculated', {
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

        if (faces.length === 0) {
            // No faces: center crop with 4:3 aspect ratio
            const targetAspect = 4 / 3;
            const currentAspect = width / height;

            if (currentAspect > targetAspect) {
                // Too wide: crop width
                const newWidth = height * targetAspect;
                return {
                    x: (width - newWidth) / 2,
                    y: 0,
                    width: newWidth,
                    height
                };
            } else {
                // Too tall: crop height
                const newHeight = width / targetAspect;
                return {
                    x: 0,
                    y: (height - newHeight) / 2,
                    width,
                    height: newHeight
                };
            }
        }

        // Calculate bounding box that includes all faces
        const minX = Math.min(...faces.map(f => f.topLeft[0]));
        const minY = Math.min(...faces.map(f => f.topLeft[1]));
        const maxX = Math.max(...faces.map(f => f.bottomRight[0]));
        const maxY = Math.max(...faces.map(f => f.bottomRight[1]));

        const faceWidth = maxX - minX;
        const faceHeight = maxY - minY;

        // Expand by 40% for breathing room
        const padding = 0.4;
        const cropWidth = faceWidth * (1 + padding * 2);
        const cropHeight = faceHeight * (1 + padding * 2);

        // Center on faces, applying rule of thirds for Y-axis
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Position faces at upper third for portrait composition
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
    faceRetouch(imageData: ImageData, faces: Face[]): ImageData {
        if (faces.length === 0) {
            return imageData;
        }

        const { data, width, height } = imageData;
        const output = new ImageData(width, height);
        output.data.set(data); // Copy original

        // Apply gaussian blur to face regions
        for (const face of faces) {
            const [x1, y1] = face.topLeft;
            const [x2, y2] = face.bottomRight;

            // Expand face region by 20% to include neck
            const expansion = 0.2;
            const faceWidth = x2 - x1;
            const faceHeight = y2 - y1;

            const startX = Math.max(0, Math.floor(x1 - faceWidth * expansion));
            const endX = Math.min(width, Math.ceil(x2 + faceWidth * expansion));
            const startY = Math.max(0, Math.floor(y1 - faceHeight * expansion));
            const endY = Math.min(height, Math.ceil(y2 + faceHeight * expansion));

            // Simple box blur for skin smoothing (3x3 kernel)
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
                    const blendFactor = 0.6; // 60% smoothed, 40% original

                    output.data[idx] = Math.round(blendFactor * (r / count) + (1 - blendFactor) * data[idx]);
                    output.data[idx + 1] = Math.round(blendFactor * (g / count) + (1 - blendFactor) * data[idx + 1]);
                    output.data[idx + 2] = Math.round(blendFactor * (b / count) + (1 - blendFactor) * data[idx + 2]);
                }
            }
        }

        logger.info('Face retouch applied', { faces: faces.length });
        return output;
    }
}

export const imageProcessingService = new ImageProcessingService();
export type { ColorAdjustments, CropRegion };
