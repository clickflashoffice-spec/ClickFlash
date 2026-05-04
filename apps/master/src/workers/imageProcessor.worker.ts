/**
 * Image Processing Web Worker
 * 
 * Handles CPU-intensive image operations off the main thread:
 * - Thumbnail generation
 * - Image resizing and compression
 * - Format conversion
 * - EXIF data extraction
 * - Hash generation for deduplication
 * - Face detection preprocessing
 * 
 * @version 1.0.0
 */

import { logger } from '../utils/logger';

// Worker context type
declare const self: Worker & typeof globalThis;

/**
 * Message types for worker communication
 */
export type WorkerMessageType =
    | 'GENERATE_THUMBNAIL'
    | 'RESIZE_IMAGE'
    | 'COMPRESS_IMAGE'
    | 'EXTRACT_EXIF'
    | 'GENERATE_HASH'
    | 'DETECT_FACES'
    | 'APPLY_FILTERS'
    | 'BATCH_PROCESS';

/**
 * Worker request structure
 */
export interface WorkerRequest {
    id: string;
    type: WorkerMessageType;
    payload: unknown;
    priority?: 'high' | 'normal' | 'low';
}

/**
 * Worker response structure
 */
export interface WorkerResponse {
    id: string;
    type: WorkerMessageType;
    success: boolean;
    data?: unknown;
    error?: string;
    processingTime?: number;
}

/**
 * Thumbnail generation options
 */
export interface ThumbnailOptions {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'jpeg' | 'webp' | 'png';
    maintainAspectRatio: boolean;
}

/**
 * Image resize options
 */
export interface ResizeOptions {
    width?: number;
    height?: number;
    mode: 'fit' | 'fill' | 'stretch';
    format?: 'jpeg' | 'webp' | 'png';
    quality?: number;
}

/**
 * Compression options
 */
export interface CompressionOptions {
    quality: number;
    maxWidth?: number;
    maxHeight?: number;
    format?: 'jpeg' | 'webp';
}

/**
 * EXIF data structure
 */
export interface ExifData {
    make?: string;
    model?: string;
    dateTaken?: string;
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    focalLength?: string;
    dimensions?: { width: number; height: number };
    gps?: { latitude: number; longitude: number };
    orientation?: number;
}

/**
 * Face detection result
 */
export interface FaceDetectionResult {
    faces: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        confidence: number;
    }>;
    processingTime: number;
}

/**
 * Filter adjustments
 */
export interface FilterAdjustments {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
    grayscale?: number;
    sepia?: number;
    hueRotate?: number;
}

// Default options
const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.8,
    format: 'webp',
    maintainAspectRatio: true,
};

const DEFAULT_RESIZE_OPTIONS: ResizeOptions = {
    mode: 'fit',
    quality: 0.9,
    format: 'jpeg',
};

/**
 * Generate image hash for deduplication using perceptual hashing
 */
async function generateImageHash(imageData: ImageData): Promise<string> {
    const { width, height, data } = imageData;
    
    // Resize to 8x8 for average hash
    const smallCanvas = new OffscreenCanvas(8, 8);
    const smallCtx = smallCanvas.getContext('2d');
    if (!smallCtx) throw new Error('Failed to create canvas context');
    
    // Draw and resize
    const tempCanvas = new OffscreenCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Failed to create temp canvas context');
    
    const imageDataClone = new ImageData(data, width, height);
    tempCtx.putImageData(imageDataClone, 0, 0);
    smallCtx.drawImage(tempCanvas, 0, 0, 8, 8);
    
    // Get pixel data and compute average
    const smallData = smallCtx.getImageData(0, 0, 8, 8).data;
    let sum = 0;
    for (let i = 0; i < smallData.length; i += 4) {
        // Convert to grayscale
        const gray = 0.299 * smallData[i] + 0.587 * smallData[i + 1] + 0.114 * smallData[i + 2];
        sum += gray;
    }
    const avg = sum / 64;
    
    // Create hash from comparisons
    let hash = '';
    for (let i = 0; i < smallData.length; i += 4) {
        const gray = 0.299 * smallData[i] + 0.587 * smallData[i + 1] + 0.114 * smallData[i + 2];
        hash += gray >= avg ? '1' : '0';
    }
    
    // Convert binary to hex
    let hexHash = '';
    for (let i = 0; i < hash.length; i += 4) {
        hexHash += parseInt(hash.substr(i, 4), 2).toString(16);
    }
    
    return hexHash;
}

/**
 * Generate thumbnail from image buffer
 */
async function generateThumbnail(
    imageBuffer: ArrayBuffer,
    options: Partial<ThumbnailOptions> = {}
): Promise<{ thumbnail: ArrayBuffer; width: number; height: number }> {
    const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };
    
    // Create blob and bitmap from buffer
    const blob = new Blob([imageBuffer]);
    const bitmap = await createImageBitmap(blob);
    
    // Calculate dimensions
    let { width, height } = bitmap;
    if (opts.maintainAspectRatio) {
        const scale = Math.min(opts.maxWidth / width, opts.maxHeight / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    } else {
        width = opts.maxWidth;
        height = opts.maxHeight;
    }
    
    // Create canvas and draw
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');
    
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    
    // Export to buffer
    const mimeType = opts.format === 'webp' ? 'image/webp' : 
                     opts.format === 'png' ? 'image/png' : 'image/jpeg';
    
    const thumbnailBlob = await canvas.convertToBlob({ 
        type: mimeType, 
        quality: opts.quality 
    });
    
    const thumbnail = await thumbnailBlob.arrayBuffer();
    
    return { thumbnail, width, height };
}

/**
 * Resize image with various modes
 */
async function resizeImage(
    imageBuffer: ArrayBuffer,
    options: ResizeOptions
): Promise<{ data: ArrayBuffer; width: number; height: number }> {
    const opts = { ...DEFAULT_RESIZE_OPTIONS, ...options };
    
    const blob = new Blob([imageBuffer]);
    const bitmap = await createImageBitmap(blob);
    
    let { width, height } = bitmap;
    
    // Calculate new dimensions based on mode
    if (opts.mode === 'fit') {
        if (opts.width && opts.height) {
            const scale = Math.min(opts.width / width, opts.height / height, 1);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        } else if (opts.width) {
            height = Math.round((height / width) * opts.width);
            width = opts.width;
        } else if (opts.height) {
            width = Math.round((width / height) * opts.height);
            height = opts.height;
        }
    } else if (opts.mode === 'fill') {
        if (opts.width && opts.height) {
            width = opts.width;
            height = opts.height;
        }
    } else if (opts.mode === 'stretch') {
        width = opts.width || width;
        height = opts.height || height;
    }
    
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');
    
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    
    const mimeType = opts.format === 'webp' ? 'image/webp' : 
                     opts.format === 'png' ? 'image/png' : 'image/jpeg';
    
    const resultBlob = await canvas.convertToBlob({ 
        type: mimeType, 
        quality: opts.quality 
    });
    
    const data = await resultBlob.arrayBuffer();
    
    return { data, width, height };
}

/**
 * Compress image with quality settings
 */
async function compressImage(
    imageBuffer: ArrayBuffer,
    options: CompressionOptions
): Promise<{ data: ArrayBuffer; originalSize: number; compressedSize: number; compressionRatio: number }> {
    const blob = new Blob([imageBuffer]);
    const bitmap = await createImageBitmap(blob);
    
    let { width, height } = bitmap;
    
    // Apply dimension limits if specified
    if (options.maxWidth || options.maxHeight) {
        const maxW = options.maxWidth || width;
        const maxH = options.maxHeight || height;
        const scale = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
    }
    
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');
    
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    
    const mimeType = options.format === 'webp' ? 'image/webp' : 'image/jpeg';
    
    const compressedBlob = await canvas.convertToBlob({ 
        type: mimeType, 
        quality: options.quality 
    });
    
    const data = await compressedBlob.arrayBuffer();
    
    return {
        data,
        originalSize: imageBuffer.byteLength,
        compressedSize: data.byteLength,
        compressionRatio: 1 - (data.byteLength / imageBuffer.byteLength),
    };
}

/**
 * Extract EXIF data from image (simplified version)
 * In production, this would use a full EXIF library
 */
async function extractExif(imageBuffer: ArrayBuffer): Promise<ExifData> {
    const view = new DataView(imageBuffer);
    const exifData: ExifData = {};
    
    // Check for JPEG marker
    if (view.getUint16(0, false) !== 0xFFD8) {
        return exifData; // Not a JPEG
    }
    
    let offset = 2;
    while (offset < view.byteLength) {
        const marker = view.getUint16(offset, false);
        
        // APP1 marker (EXIF)
        if (marker === 0xFFE1) {
            const length = view.getUint16(offset + 2, false);
            // Basic EXIF extraction would go here
            // For now, return empty data
            break;
        }
        
        // Skip other markers
        if (marker >= 0xFFD0 && marker <= 0xFFD9) {
            offset += 2;
        } else {
            const length = view.getUint16(offset + 2, false);
            offset += 2 + length;
        }
    }
    
    return exifData;
}

/**
 * Apply filters to image data
 */
async function applyFilters(
    imageBuffer: ArrayBuffer,
    filters: FilterAdjustments
): Promise<ArrayBuffer> {
    const blob = new Blob([imageBuffer]);
    const bitmap = await createImageBitmap(blob);
    
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');
    
    // Build filter string
    const filterParts: string[] = [];
    if (filters.brightness !== undefined) {
        filterParts.push(`brightness(${100 + filters.brightness}%)`);
    }
    if (filters.contrast !== undefined) {
        filterParts.push(`contrast(${100 + filters.contrast}%)`);
    }
    if (filters.saturation !== undefined) {
        filterParts.push(`saturate(${100 + filters.saturation}%)`);
    }
    if (filters.blur !== undefined && filters.blur > 0) {
        filterParts.push(`blur(${filters.blur}px)`);
    }
    if (filters.grayscale !== undefined && filters.grayscale > 0) {
        filterParts.push(`grayscale(${filters.grayscale}%)`);
    }
    if (filters.sepia !== undefined && filters.sepia > 0) {
        filterParts.push(`sepia(${filters.sepia}%)`);
    }
    if (filters.hueRotate !== undefined) {
        filterParts.push(`hue-rotate(${filters.hueRotate}deg)`);
    }
    
    if (filterParts.length > 0) {
        ctx.filter = filterParts.join(' ');
    }
    
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    
    const resultBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
    return resultBlob.arrayBuffer();
}

/**
 * Detect faces using simple detection (placeholder for ML model)
 * In production, this would use TensorFlow.js or similar
 */
async function detectFaces(imageBuffer: ArrayBuffer): Promise<FaceDetectionResult> {
    // Placeholder implementation
    // Real implementation would load a face detection model
    const startTime = performance.now();
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
        faces: [],
        processingTime: performance.now() - startTime,
    };
}

/**
 * Batch process multiple images
 */
async function batchProcess(
    items: Array<{ id: string; buffer: ArrayBuffer; operation: WorkerMessageType; options?: unknown }>
): Promise<Array<{ id: string; success: boolean; data?: unknown; error?: string }>> {
    const results = await Promise.all(
        items.map(async (item) => {
            try {
                let result: unknown;
                
                switch (item.operation) {
                    case 'GENERATE_THUMBNAIL':
                        result = await generateThumbnail(item.buffer, item.options as ThumbnailOptions);
                        break;
                    case 'RESIZE_IMAGE':
                        result = await resizeImage(item.buffer, item.options as ResizeOptions);
                        break;
                    case 'COMPRESS_IMAGE':
                        result = await compressImage(item.buffer, item.options as CompressionOptions);
                        break;
                    case 'EXTRACT_EXIF':
                        result = await extractExif(item.buffer);
                        break;
                    case 'GENERATE_HASH': {
                        const blob = new Blob([item.buffer]);
                        const bitmap = await createImageBitmap(blob);
                        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                        const ctx = canvas.getContext('2d');
                        if (!ctx) throw new Error('Failed to create context');
                        ctx.drawImage(bitmap, 0, 0);
                        bitmap.close();
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        result = await generateImageHash(imageData);
                        break;
                    }
                    default:
                        throw new Error(`Unknown operation: ${item.operation}`);
                }
                
                return { id: item.id, success: true, data: result };
            } catch (error) {
                return { 
                    id: item.id, 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                };
            }
        })
    );
    
    return results;
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const { id, type, payload } = event.data;
    const startTime = performance.now();
    
    try {
        let result: unknown;
        
        switch (type) {
            case 'GENERATE_THUMBNAIL':
                result = await generateThumbnail(
                    (payload as { buffer: ArrayBuffer }).buffer,
                    (payload as { options?: ThumbnailOptions }).options
                );
                break;
                
            case 'RESIZE_IMAGE':
                result = await resizeImage(
                    (payload as { buffer: ArrayBuffer }).buffer,
                    (payload as { options: ResizeOptions }).options
                );
                break;
                
            case 'COMPRESS_IMAGE':
                result = await compressImage(
                    (payload as { buffer: ArrayBuffer }).buffer,
                    (payload as { options: CompressionOptions }).options
                );
                break;
                
            case 'EXTRACT_EXIF':
                result = await extractExif((payload as { buffer: ArrayBuffer }).buffer);
                break;
                
            case 'GENERATE_HASH': {
                const { buffer } = payload as { buffer: ArrayBuffer };
                const blob = new Blob([buffer]);
                const bitmap = await createImageBitmap(blob);
                const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Failed to create context');
                ctx.drawImage(bitmap, 0, 0);
                bitmap.close();
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                result = await generateImageHash(imageData);
                break;
            }
            
            case 'DETECT_FACES':
                result = await detectFaces((payload as { buffer: ArrayBuffer }).buffer);
                break;
                
            case 'APPLY_FILTERS':
                result = await applyFilters(
                    (payload as { buffer: ArrayBuffer }).buffer,
                    (payload as { filters: FilterAdjustments }).filters
                );
                break;
                
            case 'BATCH_PROCESS':
                result = await batchProcess((payload as { items: Parameters<typeof batchProcess>[0] }).items);
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
        
        const response: WorkerResponse = {
            id,
            type,
            success: true,
            data: result,
            processingTime: performance.now() - startTime,
        };
        
        (self as any).postMessage(response, result instanceof ArrayBuffer ? [result] : undefined);
        
    } catch (error) {
        const response: WorkerResponse = {
            id,
            type,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime: performance.now() - startTime,
        };
        
        self.postMessage(response);
    }
};

// Export types for main thread usage
export type { WorkerRequest as ImageProcessorRequest, WorkerResponse as ImageProcessorResponse };
