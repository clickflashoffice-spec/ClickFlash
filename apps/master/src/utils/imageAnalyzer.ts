/**
 * Image Analyzer Utility
 * 
 * Provides histogram analysis and edge detection for AI auto-enhance and smart crop.
 * Uses HTML5 Canvas API for client-side processing (no heavy dependencies).
 * Memory-safe: downsizes images to max 2048px for analysis.
 */

export interface HistogramData {
    luminosity: number[];  // 0-255 brightness distribution
    red: number[];
    green: number[];
    blue: number[];
}

export interface HistogramStats {
    mean: number;          // Average brightness (0-255)
    median: number;        // Middle value
    mode: number;          // Most common value
    stdDev: number;        // Standard deviation
    clippingLow: number;   // % of pixels at 0 (underexposure)
    clippingHigh: number;  // % of pixels at 255 (overexposure)
}

export interface EnhancementSuggestions {
    exposure: number;      // -100 to 100
    contrast: number;      // -100 to 100
    shadows: number;       // -100 to 100
    highlights: number;    // -100 to 100
    saturate: number;      // -100 to 100
}

/**
 * Load image and downsize if needed for analysis
 */
function loadAndPrepareImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * Get image data from canvas (downsized to max 2048px)
 */
function getImageData(img: HTMLImageElement): ImageData {
    const MAX_SIZE = 2048;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) throw new Error('Failed to get canvas context');

    // Calculate downsize ratio
    const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Calculate histogram from image data
 */
function calculateHistogram(imageData: ImageData): HistogramData {
    const histogram: HistogramData = {
        luminosity: new Array(256).fill(0),
        red: new Array(256).fill(0),
        green: new Array(256).fill(0),
        blue: new Array(256).fill(0)
    };

    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Luminosity (perceived brightness)
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        histogram.red[r]++;
        histogram.green[g]++;
        histogram.blue[b]++;
        histogram.luminosity[lum]++;
    }

    return histogram;
}

/**
 * Calculate statistics from histogram
 */
function calculateStats(histogram: number[]): HistogramStats {
    const totalPixels = histogram.reduce((sum, count) => sum + count, 0);

    // Mean
    let sum = 0;
    for (let i = 0; i < histogram.length; i++) {
        sum += i * histogram[i];
    }
    const mean = sum / totalPixels;

    // Median
    let count = 0;
    let median = 0;
    for (let i = 0; i < histogram.length; i++) {
        count += histogram[i];
        if (count >= totalPixels / 2) {
            median = i;
            break;
        }
    }

    // Mode (most common value)
    const mode = histogram.indexOf(Math.max(...histogram));

    // Standard deviation
    let variance = 0;
    for (let i = 0; i < histogram.length; i++) {
        variance += Math.pow(i - mean, 2) * histogram[i];
    }
    const stdDev = Math.sqrt(variance / totalPixels);

    // Clipping detection
    const clippingLow = (histogram[0] / totalPixels) * 100;
    const clippingHigh = (histogram[255] / totalPixels) * 100;

    return { mean, median, mode, stdDev, clippingLow, clippingHigh };
}

/**
 * Generate enhancement suggestions based on histogram analysis
 */
export async function analyzeImageForEnhancement(imageUrl: string): Promise<EnhancementSuggestions> {
    const img = await loadAndPrepareImage(imageUrl);
    const imageData = getImageData(img);
    const histogram = calculateHistogram(imageData);
    const stats = calculateStats(histogram.luminosity);

    const suggestions: EnhancementSuggestions = {
        exposure: 0,
        contrast: 0,
        shadows: 0,
        highlights: 0,
        saturate: 0
    };

    // Target midpoint: 18% gray ≈ 127 (slightly below middle)
    const TARGET_MIDPOINT = 127;
    const exposureError = TARGET_MIDPOINT - stats.mean;

    // Exposure adjustment (±20 max)
    suggestions.exposure = Math.max(-20, Math.min(20, exposureError * 0.15));

    // Contrast adjustment
    if (stats.stdDev < 40) {
        // Low contrast (flat histogram) → increase
        suggestions.contrast = Math.min(15, (40 - stats.stdDev) * 0.5);
    } else if (stats.stdDev > 70) {
        // Too much contrast → decrease slightly
        suggestions.contrast = Math.max(-10, (70 - stats.stdDev) * 0.2);
    }

    // Shadow recovery (if clipping low)
    if (stats.clippingLow > 1) {
        suggestions.shadows = Math.min(15, stats.clippingLow * 5);
    }

    // Highlight recovery (if clipping high)
    if (stats.clippingHigh > 1) {
        suggestions.highlights = Math.min(-15, -stats.clippingHigh * 5);
    }

    // Saturation boost for dull images
    const colorfulness = (
        calculateStats(histogram.red).stdDev +
        calculateStats(histogram.green).stdDev +
        calculateStats(histogram.blue).stdDev
    ) / 3;

    if (colorfulness < 35) {
        suggestions.saturate = Math.min(12, (35 - colorfulness) * 0.4);
    }

    return suggestions;
}

/**
 * Detect edges for smart crop subject detection
 */
export async function detectSubjectBounds(imageUrl: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const img = await loadAndPrepareImage(imageUrl);
    const imageData = getImageData(img);
    const width = imageData.width;
    const height = imageData.height;

    // Simple edge detection using Sobel operator
    // (Simplified for performance - not full Sobel)
    const edgeMap = new Uint8Array(width * height);
    const data = imageData.data;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const _lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            // Horizontal gradient
            const leftIdx = (y * width + (x - 1)) * 4;
            const rightIdx = (y * width + (x + 1)) * 4;
            const gx = (
                (0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2]) -
                (0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2])
            );

            // Vertical gradient
            const topIdx = ((y - 1) * width + x) * 4;
            const bottomIdx = ((y + 1) * width + x) * 4;
            const gy = (
                (0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2]) -
                (0.299 * data[topIdx] + 0.587 * data[topIdx + 1] + 0.114 * data[topIdx + 2])
            );

            edgeMap[y * width + x] = Math.sqrt(gx * gx + gy * gy) > 30 ? 255 : 0;
        }
    }

    // Find bounding box of significant edges
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let edgeCount = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (edgeMap[y * width + x] > 0) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                edgeCount++;
            }
        }
    }

    // If too few edges, no clear subject
    if (edgeCount < width * height * 0.05) {
        return null;
    }

    // Add 10% padding
    const paddingX = (maxX - minX) * 0.1;
    const paddingY = (maxY - minY) * 0.1;

    return {
        x: Math.max(0, minX - paddingX) / width,
        y: Math.max(0, minY - paddingY) / height,
        width: Math.min(1, (maxX - minX + 2 * paddingX) / width),
        height: Math.min(1, (maxY - minY + 2 * paddingY) / height)
    };
}
