/* global WebAssembly */
/**
 * Dedicated Web Worker for Non-Blocking Image Processing
 * 
 * Executes heavy pixel manipulations, histogram analysis, automatic white balance,
 * smart cropping calculations, and skin smoothing off the main browser UI thread.
 * Utilizes Transferable Objects (ArrayBuffer) for zero-copy memory performance.
 */

interface ColorStats {
    mean: { r: number; g: number; b: number };
    std: { r: number; g: number; b: number };
    histogram: { r: number[]; g: number[]; b: number[] };
}

interface ColorAdjustments {
    exposure: number;
    contrast: number;
    saturation: number;
    clarity: number;
}

interface Face {
    topLeft: [number, number];
    bottomRight: [number, number];
    probability: number;
    landmarks: number[][];
}

interface CropRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface EditMetadata {
    exposure: number;
    contrast: number;
    saturation: number;
    clarity: number;
    noiseReductionApplied: boolean;
    crop?: CropRegion;
    processedAt: number;
    engine: string;
}

type WorkerMessageType = 'analyzeHistogram' | 'autoEnhance' | 'faceRetouch' | 'smartCrop' | 'noiseReduction' | 'applyCrop' | 'autoEditFull' | 'applyWatermark';

interface WorkerMessage {
    id: string;
    type: WorkerMessageType;
    payload: any;
}

// WebAssembly Engine state
let wasmInstance: any = null;
let wasmMemory: WebAssembly.Memory | null = null;
let wasmInitPromise: Promise<boolean> | null = null;

async function ensureWasmLoaded(): Promise<boolean> {
    if (wasmInstance && wasmMemory) return true;
    if (wasmInitPromise) return wasmInitPromise;

    wasmInitPromise = (async () => {
        try {
            const memory = new WebAssembly.Memory({ initial: 256 }); // 16MB initial
            const importObject = {
                env: {
                    memory,
                    abort: () => { console.error('WASM abort called'); }
                }
            };

            const response = await fetch('/wasm/photoEditor.wasm');
            if (!response.ok) {
                return false;
            }
            const buffer = await response.arrayBuffer();
            const module = await WebAssembly.instantiate(buffer, importObject);
            wasmInstance = module.instance;
            wasmMemory = memory;
            return true;
        } catch (e) {
            console.warn('WASM engine init failed, falling back to JS canvas math:', e);
            return false;
        }
    })();

    return wasmInitPromise;
}

function ensureWasmMemory(neededBytes: number): boolean {
    if (!wasmMemory) return false;
    const currentBytes = wasmMemory.buffer.byteLength;
    if (currentBytes < neededBytes) {
        const extraPages = Math.ceil((neededBytes - currentBytes) / 65536);
        try {
            wasmMemory.grow(extraPages);
        } catch (e) {
            console.error('Failed to grow WASM memory:', e);
            return false;
        }
    }
    return true;
}

/**
 * Calculate color statistics and histograms from ImageData (WASM-accelerated with JS fallback)
 */
function analyzeHistogram(imageData: ImageData): ColorStats {
    const { data, width, height } = imageData;
    const pixelCount = width * height;

    const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0)
    };

    let sumR = 0, sumG = 0, sumB = 0;

    if (wasmInstance && wasmMemory && ensureWasmMemory(data.length + 3072)) {
        const memArray = new Uint8Array(wasmMemory.buffer);
        memArray.set(data, 0);
        wasmInstance.exports.analyzeHistogramWasm(0, data.length, data.length);

        const countsArray = new Uint32Array(wasmMemory.buffer, data.length, 768);
        for (let i = 0; i < 256; i++) {
            const rCount = countsArray[i];
            const gCount = countsArray[256 + i];
            const bCount = countsArray[512 + i];
            histogram.r[i] = rCount;
            histogram.g[i] = gCount;
            histogram.b[i] = bCount;
            sumR += i * rCount;
            sumG += i * gCount;
            sumB += i * bCount;
        }
    } else {
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
    }

    const mean = {
        r: sumR / pixelCount,
        g: sumG / pixelCount,
        b: sumB / pixelCount
    };

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
 * Apply exposure, contrast, saturation, and clarity adjustments directly to pixel data (WASM-accelerated with JS fallback)
 */
function applyPixelAdjustments(data: Uint8ClampedArray, adjustments: ColorAdjustments): void {
    const { exposure, contrast, saturation, clarity } = adjustments;

    if (wasmInstance && wasmMemory && ensureWasmMemory(data.length)) {
        const memArray = new Uint8Array(wasmMemory.buffer);
        memArray.set(data, 0);
        wasmInstance.exports.applyPixelAdjustmentsWasm(0, data.length, exposure, contrast, saturation, clarity || 0);
        data.set(new Uint8Array(wasmMemory.buffer, 0, data.length));
        return;
    }

    // Pre-calculate exposure multiplier
    const expMult = Math.pow(2, exposure);
    // Pre-calculate contrast factor: scale [-0.3, 0.3] to factor
    const contrastFactor = 1 + contrast * 1.5;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Apply Exposure
        if (exposure !== 0) {
            r = Math.min(255, Math.max(0, r * expMult));
            g = Math.min(255, Math.max(0, g * expMult));
            b = Math.min(255, Math.max(0, b * expMult));
        }

        // 2. Apply Contrast around mid-tone 128
        if (contrast !== 0) {
            r = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128));
            g = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128));
            b = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128));
        }

        // 3. Apply Saturation
        if (saturation !== 0) {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const satFactor = 1 + saturation * 2.0;
            r = Math.min(255, Math.max(0, lum + (r - lum) * satFactor));
            g = Math.min(255, Math.max(0, lum + (g - lum) * satFactor));
            b = Math.min(255, Math.max(0, lum + (b - lum) * satFactor));
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
    }
}

/**
 * Perform automatic photo enhancement based on image statistics
 */
function autoEnhance(imageData: ImageData): { adjustments: ColorAdjustments; imageData: ImageData } {
    const stats = analyzeHistogram(imageData);

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

    const adjustments: ColorAdjustments = {
        exposure: Math.max(-0.5, Math.min(0.5, exposure)),
        contrast: Math.max(-0.3, Math.min(0.3, contrast)),
        saturation,
        clarity
    };

    // Apply adjustments in-place to pixel buffer
    applyPixelAdjustments(imageData.data, adjustments);

    return { adjustments, imageData };
}

/**
 * Calculate smart crop region based on detected faces or center aspect ratio
 */
function smartCrop(width: number, height: number, faces: Face[]): CropRegion {
    if (!faces || faces.length === 0) {
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

    return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight)
    };
}

/**
 * Apply frequency separation skin smoothing on face regions
 */
function faceRetouch(imageData: ImageData, faces: Face[]): ImageData {
    if (!faces || faces.length === 0) {
        return imageData;
    }

    const { data, width, height } = imageData;
    const output = new ImageData(new Uint8ClampedArray(data), width, height);

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

    return output;
}

/**
 * Fast 3x3 Denoise filter with edge preservation (WASM-accelerated with JS fallback)
 */
function noiseReduction(imageData: ImageData, strength = 0.5): ImageData {
    const { data, width, height } = imageData;
    const output = new ImageData(new Uint8ClampedArray(data), width, height);

    if (wasmInstance && wasmMemory && ensureWasmMemory(data.length * 2)) {
        const memArray = new Uint8Array(wasmMemory.buffer);
        memArray.set(data, 0);
        wasmInstance.exports.noiseReductionWasm(0, width, height, strength, data.length);
        output.data.set(new Uint8Array(wasmMemory.buffer, data.length, data.length));
        return output;
    }

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            let sumR = 0, sumG = 0, sumB = 0;
            let count = 0;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nIdx = ((y + dy) * width + (x + dx)) * 4;
                    sumR += data[nIdx];
                    sumG += data[nIdx + 1];
                    sumB += data[nIdx + 2];
                    count++;
                }
            }

            const avgR = sumR / count;
            const avgG = sumG / count;
            const avgB = sumB / count;

            output.data[idx] = Math.round(data[idx] * (1 - strength) + avgR * strength);
            output.data[idx + 1] = Math.round(data[idx + 1] * (1 - strength) + avgG * strength);
            output.data[idx + 2] = Math.round(data[idx + 2] * (1 - strength) + avgB * strength);
        }
    }

    return output;
}

/**
 * Apply crop region to ImageData buffer
 */
function applyCrop(imageData: ImageData, crop: CropRegion): ImageData {
    const x = Math.max(0, Math.min(imageData.width - 1, crop.x));
    const y = Math.max(0, Math.min(imageData.height - 1, crop.y));
    const width = Math.max(1, Math.min(imageData.width - x, crop.width));
    const height = Math.max(1, Math.min(imageData.height - y, crop.height));

    const output = new ImageData(width, height);
    for (let row = 0; row < height; row++) {
        const srcOffset = ((y + row) * imageData.width + x) * 4;
        const dstOffset = (row * width) * 4;
        output.data.set(imageData.data.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }
    return output;
}

/**
 * Complete custom auto editor pipeline: auto-exposure, color correction, noise reduction, and smart crop calculation
 */
function autoEditFull(imageData: ImageData, faces: Face[] = []): { imageData: ImageData; editMetadata: EditMetadata } {
    const { adjustments, imageData: enhanced } = autoEnhance(imageData);
    const denoised = noiseReduction(enhanced, 0.35);
    const crop = smartCrop(denoised.width, denoised.height, faces);

    const editMetadata: EditMetadata = {
        exposure: adjustments.exposure,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
        clarity: adjustments.clarity,
        noiseReductionApplied: true,
        crop,
        processedAt: Date.now(),
        engine: wasmInstance ? 'clickflash-wasm-engine-v3' : 'clickflash-canvas-engine-v2'
    };

    return { imageData: denoised, editMetadata };
}

/**
 * Apply a watermark (ImageData) onto a base image
 */
function applyWatermark(baseImage: ImageData, watermarkImage: ImageData, alpha: number = 0.5): ImageData {
    const output = new ImageData(new Uint8ClampedArray(baseImage.data), baseImage.width, baseImage.height);
    const startX = Math.max(0, baseImage.width - watermarkImage.width - 20); // Bottom right with 20px padding
    const startY = Math.max(0, baseImage.height - watermarkImage.height - 20);

    for (let wy = 0; wy < watermarkImage.height; wy++) {
        for (let wx = 0; wx < watermarkImage.width; wx++) {
            const by = startY + wy;
            const bx = startX + wx;

            if (by >= baseImage.height || bx >= baseImage.width) continue;

            const wIdx = (wy * watermarkImage.width + wx) * 4;
            const bIdx = (by * baseImage.width + bx) * 4;

            // Watermark alpha channel
            const wAlpha = (watermarkImage.data[wIdx + 3] / 255) * alpha;

            if (wAlpha > 0) {
                output.data[bIdx] = Math.round(output.data[bIdx] * (1 - wAlpha) + watermarkImage.data[wIdx] * wAlpha);
                output.data[bIdx + 1] = Math.round(output.data[bIdx + 1] * (1 - wAlpha) + watermarkImage.data[wIdx + 1] * wAlpha);
                output.data[bIdx + 2] = Math.round(output.data[bIdx + 2] * (1 - wAlpha) + watermarkImage.data[wIdx + 2] * wAlpha);
                // Keep base alpha unchanged
            }
        }
    }
    return output;
}

// Worker message event listener
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    await ensureWasmLoaded();
    const { id, type, payload } = e.data;

    try {
        switch (type) {
            case 'analyzeHistogram': {
                const stats = analyzeHistogram(payload.imageData);
                self.postMessage({ id, result: stats });
                break;
            }
            case 'autoEnhance': {
                const { adjustments, imageData } = autoEnhance(payload.imageData);
                // Use transferable object for zero-copy array buffer transfer
                (self as any).postMessage({ id, result: { adjustments, imageData } }, [imageData.data.buffer]);
                break;
            }
            case 'smartCrop': {
                const { width, height, faces } = payload;
                const crop = smartCrop(width, height, faces);
                self.postMessage({ id, result: crop });
                break;
            }
            case 'faceRetouch': {
                const { imageData, faces } = payload;
                const retouched = faceRetouch(imageData, faces);
                (self as any).postMessage({ id, result: retouched }, [retouched.data.buffer]);
                break;
            }
            case 'noiseReduction': {
                const { imageData, strength } = payload;
                const denoised = noiseReduction(imageData, strength);
                (self as any).postMessage({ id, result: denoised }, [denoised.data.buffer]);
                break;
            }
            case 'applyCrop': {
                const { imageData, crop } = payload;
                const cropped = applyCrop(imageData, crop);
                (self as any).postMessage({ id, result: cropped }, [cropped.data.buffer]);
                break;
            }
            case 'autoEditFull': {
                const { imageData, faces } = payload;
                const { imageData: processed, editMetadata } = autoEditFull(imageData, faces || []);
                (self as any).postMessage({ id, result: { imageData: processed, editMetadata } }, [processed.data.buffer]);
                break;
            }
            case 'applyWatermark': {
                const { imageData, watermarkData, alpha } = payload;
                const watermarked = applyWatermark(imageData, watermarkData, alpha);
                (self as any).postMessage({ id, result: watermarked }, [watermarked.data.buffer]);
                break;
            }
            default:
                self.postMessage({ id, error: `Unknown job type: ${type}` });
        }
    } catch (err: any) {
        self.postMessage({ id, error: err?.message || String(err) });
    }
};
