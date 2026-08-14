/**
 * ImageExporter - Canvas-based image export with filters and edits
 * 
 * Renders the edited image to a canvas and exports as high-quality image
 */

import { ManualEdits } from '../../types';

export interface ExportOptions {
    quality?: number; // 0-1 for JPEG
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
    maxWidth?: number;
    maxHeight?: number;
    maintainAspectRatio?: boolean;
}

export class ImageExporter {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }
        this.ctx = ctx;
    }

    /**
     * Export image with all edits applied
     */
    async export(
        imageElement: HTMLImageElement,
        edits: ManualEdits,
        options: ExportOptions = {}
    ): Promise<Blob> {
        const {
            quality = 0.92,
            format = 'image/jpeg',
            maxWidth = 4096,
            maxHeight = 4096,
            maintainAspectRatio = true
        } = options;

        // Calculate dimensions
        let { width, height } = this.calculateDimensions(
            imageElement.naturalWidth,
            imageElement.naturalHeight,
            maxWidth,
            maxHeight,
            maintainAspectRatio
        );

        // Handle crop if specified
        if (edits.crop) {
            width = edits.crop.width;
            height = edits.crop.height;
        }

        // Set canvas size
        this.canvas.width = width;
        this.canvas.height = height;

        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);

        // Apply filters
        this.applyFilters(edits);

        // Draw image (with crop if specified)
        if (edits.crop) {
            const { x, y, width: cW, height: cH } = edits.crop;
            const sx = x * imageElement.naturalWidth;
            const sy = y * imageElement.naturalHeight;
            const sWidth = cW * imageElement.naturalWidth;
            const sHeight = cH * imageElement.naturalHeight;

            // Calculate final dimensions maintaining aspect ratio
            const finalDims = this.calculateDimensions(
                sWidth,
                sHeight,
                maxWidth,
                maxHeight,
                maintainAspectRatio
            );

            this.canvas.width = finalDims.width;
            this.canvas.height = finalDims.height;

            this.ctx.drawImage(
                imageElement,
                sx,
                sy,
                sWidth,
                sHeight,
                0,
                0,
                this.canvas.width,
                this.canvas.height
            );
        } else {
            this.ctx.drawImage(imageElement, 0, 0, width, height);
        }

        // Reset filters
        this.ctx.filter = 'none';

        // Apply retouch actions
        if (edits.retouchActions && edits.retouchActions.length > 0) {
            await this.applyRetouchActions(edits.retouchActions, imageElement);
        }

        // Apply rotation/straighten
        if (edits.rotate || edits.straighten) {
            this.applyRotation(edits.rotate || 0, edits.straighten || 0, width, height);
        }

        // Export as blob
        return new Promise((resolve, reject) => {
            this.canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                format,
                quality
            );
        });
    }

    /**
     * Calculate export dimensions with optional resizing
     */
    private calculateDimensions(
        naturalWidth: number,
        naturalHeight: number,
        maxWidth: number,
        maxHeight: number,
        maintainAspectRatio: boolean
    ): { width: number; height: number } {
        let width = naturalWidth;
        let height = naturalHeight;

        // Check if resizing is needed
        if (width > maxWidth || height > maxHeight) {
            if (maintainAspectRatio) {
                const scaleX = maxWidth / width;
                const scaleY = maxHeight / height;
                const scale = Math.min(scaleX, scaleY);
                width = Math.floor(width * scale);
                height = Math.floor(height * scale);
            } else {
                width = Math.min(width, maxWidth);
                height = Math.min(height, maxHeight);
            }
        }

        return { width, height };
    }

    /**
     * Apply CSS filters to canvas context
     */
    private applyFilters(edits: ManualEdits): void {
        const filters: string[] = [];

        // Brightness (exposure)
        if (edits.exposure !== undefined) {
            const brightness = 100 + edits.exposure;
            filters.push(`brightness(${brightness}%)`);
        }

        // Contrast
        if (edits.contrast !== undefined) {
            const contrast = 100 + edits.contrast;
            filters.push(`contrast(${contrast}%)`);
        }

        // Saturation
        if (edits.saturate !== undefined) {
            const saturate = 100 + edits.saturate;
            filters.push(`saturate(${saturate}%)`);
        }

        // Grayscale
        if (edits.grayscale !== undefined && edits.grayscale > 0) {
            filters.push(`grayscale(${edits.grayscale}%)`);
        }

        // Sepia
        if (edits.sepia !== undefined && edits.sepia > 0) {
            filters.push(`sepia(${edits.sepia}%)`);
        }

        // Hue rotate
        if (edits.hueRotate !== undefined && edits.hueRotate > 0) {
            filters.push(`hue-rotate(${edits.hueRotate}deg)`);
        }

        // Invert
        if (edits.invert !== undefined && edits.invert > 0) {
            filters.push(`invert(${edits.invert}%)`);
        }

        // Blur (soften)
        if (edits.soften !== undefined && edits.soften > 0) {
            filters.push(`blur(${edits.soften}px)`);
        }

        // Shadows/Highlights simulation using drop-shadow
        if (edits.dropShadow !== undefined && edits.dropShadow > 0) {
            filters.push(`drop-shadow(0 4px ${edits.dropShadow}px rgba(0,0,0,0.5))`);
        }

        this.ctx.filter = filters.join(' ') || 'none';
    }

    /**
     * Apply retouch actions to the canvas
     */
    private async applyRetouchActions(
        actions: ManualEdits['retouchActions'],
        imageElement: HTMLImageElement
    ): Promise<void> {
        // Create a temporary canvas for the source image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(imageElement, 0, 0, this.canvas.width, this.canvas.height);

        for (const action of actions || []) {
            if (action.type === 'heal' && action.sourceX !== undefined && action.sourceY !== undefined) {
                // Scale coordinates to canvas size
                const scaleX = this.canvas.width / imageElement.naturalWidth;
                const scaleY = this.canvas.height / imageElement.naturalHeight;

                const targetX = action.x * scaleX;
                const targetY = action.y * scaleY;
                const sourceX = action.sourceX * scaleX;
                const sourceY = action.sourceY * scaleY;
                const radius = action.radius * Math.min(scaleX, scaleY);

                // Copy from source to target
                const patchSize = radius * 2;
                const imageData = tempCtx.getImageData(
                    sourceX - radius,
                    sourceY - radius,
                    patchSize,
                    patchSize
                );

                // Create radial mask for feathering
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = patchSize;
                maskCanvas.height = patchSize;
                const maskCtx = maskCanvas.getContext('2d')!;

                const gradient = maskCtx.createRadialGradient(
                    radius, radius, 0,
                    radius, radius, radius
                );
                gradient.addColorStop(0, 'rgba(255,255,255,1)');
                gradient.addColorStop(0.7, 'rgba(255,255,255,0.8)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');

                maskCtx.fillStyle = gradient;
                maskCtx.fillRect(0, 0, patchSize, patchSize);

                // Apply mask to image data
                const maskData = maskCtx.getImageData(0, 0, patchSize, patchSize);
                const pixelData = imageData.data;
                const maskPixels = maskData.data;

                for (let i = 0; i < pixelData.length; i += 4) {
                    const alpha = maskPixels[i + 3] / 255;
                    pixelData[i + 3] = Math.floor(pixelData[i + 3] * alpha);
                }

                // Draw the patched area
                this.ctx.putImageData(imageData, targetX - radius, targetY - radius);
            }
        }
    }

    /**
     * Apply rotation and straighten
     */
    private applyRotation(
        rotate: number,
        straighten: number,
        width: number,
        height: number
    ): void {
        const totalRotation = (rotate + straighten) * (Math.PI / 180);

        if (totalRotation === 0) return;

        // Create a new canvas for the rotated image
        const rotatedCanvas = document.createElement('canvas');

        // Calculate new dimensions after rotation
        const sin = Math.abs(Math.sin(totalRotation));
        const cos = Math.abs(Math.cos(totalRotation)); // totalRotation is already in radians

        // Picasa-style auto-zoom: s = cos(a) + (max(w,h)/min(w,h)) * sin(a)
        const aspectCorrection = Math.max(width / height, height / width);
        const scale = cos + (sin * aspectCorrection);

        // We want to fill the target rectangle without black corners.
        // Instead of expanding the canvas, we scale the image to fit the ORIGINAL bounds.
        // However, the current applyRotation implementation expands the canvas.
        // Let's refine this to match the preview (which stays at object-contain bounds).

        const newWidth = width;
        const newHeight = height;

        rotatedCanvas.width = newWidth;
        rotatedCanvas.height = newHeight;

        const rotatedCtx = rotatedCanvas.getContext('2d')!;

        // Translate to center, rotate, scale, then draw
        rotatedCtx.translate(newWidth / 2, newHeight / 2);
        rotatedCtx.rotate(totalRotation);
        rotatedCtx.scale(scale, scale);
        rotatedCtx.drawImage(this.canvas, -width / 2, -height / 2);

        // Copy back to main canvas
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.ctx.drawImage(rotatedCanvas, 0, 0);
    }

    /**
     * Get data URL preview (for before/after comparison)
     */
    getPreviewDataURL(
        imageElement: HTMLImageElement,
        edits: ManualEdits,
        maxDimension: number = 800
    ): string {
        const scale = Math.min(
            1,
            maxDimension / imageElement.naturalWidth,
            maxDimension / imageElement.naturalHeight
        );

        const width = Math.floor(imageElement.naturalWidth * scale);
        const height = Math.floor(imageElement.naturalHeight * scale);

        this.canvas.width = width;
        this.canvas.height = height;

        this.ctx.clearRect(0, 0, width, height);
        this.applyFilters(edits);
        this.ctx.drawImage(imageElement, 0, 0, width, height);
        this.ctx.filter = 'none';

        return this.canvas.toDataURL('image/jpeg', 0.85);
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.canvas.width = 0;
        this.canvas.height = 0;
    }
}

// Singleton instance
export const imageExporter = new ImageExporter();
