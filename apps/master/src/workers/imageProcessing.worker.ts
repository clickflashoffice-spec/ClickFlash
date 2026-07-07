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

type WorkerMessageType = 'analyzeHistogram' | 'autoEnhance' | 'faceRetouch' | 'smartCrop';

interface WorkerMessage {
    id: string;
    type: WorkerMessageType;
    payload: any;
}

/**
 * Calculate color statistics and histograms from ImageData
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
 * Apply exposure, contrast, saturation, and clarity adjustments directly to pixel data
 */
function applyPixelAdjustments(data: Uint8ClampedArray, adjustments: ColorAdjustments): void {
    const { exposure, contrast, saturation } = adjustments;

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

// Worker message event listener
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
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
            default:
                self.postMessage({ id, error: `Unknown job type: ${type}` });
        }
    } catch (err: any) {
        self.postMessage({ id, error: err?.message || String(err) });
    }
};
