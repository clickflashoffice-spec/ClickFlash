/// <reference lib="webworker" />

export interface CanvaAutoAdjustRecipe {
    exposure: number;       // -100 to 100
    contrast: number;       // -100 to 100
    highlights: number;     // -100 to 100
    shadows: number;        // -100 to 100
    whites: number;         // -100 to 100
    blacks: number;         // -100 to 100
    temperature: number;    // -100 to 100
    tint: number;           // -100 to 100
    vibrance: number;       // -100 to 100
    saturation: number;     // -100 to 100
    clarity: number;        // -100 to 100
}

export type EditCommand = {
    type: 'PROCESS_IMAGE';
    payload: {
        imageData: ImageData;
        options: {
            brightness?: number; // -100 to 100
            contrast?: number;   // -100 to 100
            saturation?: number; // -100 to 100
            autoEnhance?: boolean;
            recipe?: Partial<CanvaAutoAdjustRecipe>;
        };
    };
};

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
    self.addEventListener('message', (event: MessageEvent<EditCommand>) => {
        if (event.data.type === 'PROCESS_IMAGE') {
            const { imageData, options } = event.data.payload;
            
            // Ensure we actually got valid ImageData
            if (!imageData || !imageData.data) {
                self.postMessage({ type: 'ERROR', payload: 'Invalid image data' });
                return;
            }

            const resultImageData = processImageData(imageData, options);
            
            // Transfer the ArrayBuffer back to avoid memory copy
            self.postMessage(
                { type: 'PROCESS_COMPLETE', payload: { imageData: resultImageData } },
                [resultImageData.data.buffer]
            );
        }
    });
}

/**
 * Computes Canva's Auto-Adjust enhancement recipe from raw ImageData.
 * Analyzes luminance CDF percentiles (P01, P05, P50, P95, P99) and RGB balance.
 */
export function computeCanvaRecipeFromImageData(imageData: ImageData): CanvaAutoAdjustRecipe {
    const data = imageData.data;
    const totalPixels = data.length / 4;
    
    // Sample up to 250,000 pixels for lightning-fast statistical precision
    const stride = Math.max(1, Math.floor(Math.sqrt(totalPixels / 250000)));
    const hist = new Int32Array(256);
    let sampleCount = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;

    for (let i = 0; i < data.length; i += 4 * stride) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        hist[y]++;
        sampleCount++;
        sumR += r;
        sumG += g;
        sumB += b;
    }

    if (sampleCount === 0) {
        return {
            exposure: 0,
            contrast: 0,
            highlights: 0,
            shadows: 0,
            whites: 0,
            blacks: 0,
            temperature: 0,
            tint: 0,
            vibrance: 0,
            saturation: 0,
            clarity: 0
        };
    }

    // Cumulative Distribution Function percentiles
    const getPercentile = (p: number): number => {
        const target = sampleCount * p;
        let accum = 0;
        for (let i = 0; i < 256; i++) {
            accum += hist[i];
            if (accum >= target) return i;
        }
        return 255;
    };

    const p01 = getPercentile(0.01);
    const p05 = getPercentile(0.05);
    const p50 = getPercentile(0.50);
    const p95 = getPercentile(0.95);
    const p99 = getPercentile(0.99);

    const meanR = sumR / sampleCount;
    const meanG = sumG / sampleCount;
    const meanB = sumB / sampleCount;
    const meanLum = (meanR + meanG + meanB) / 3;

    // 1. Exposure: target median luminance around 120
    let exposure = 0;
    if (p50 < 118) {
        exposure = Math.min(45, Math.max(0, Math.round((120 - p50) * 0.6)));
    } else if (p50 > 135) {
        exposure = Math.max(-40, Math.min(0, Math.round((124 - p50) * 0.5)));
    }

    // 2. Contrast: target dynamic spread (P95 - P05) around 160
    const dynamicRange = p95 - p05;
    let contrast = 0;
    if (dynamicRange < 150) {
        contrast = Math.min(35, Math.max(0, Math.round((160 - dynamicRange) * 0.45)));
    }

    // 3. Dynamic Range Expansion: Whites & Blacks
    let whites = 0;
    if (p99 < 235) {
        whites = Math.min(30, Math.max(0, Math.round((245 - p99) * 0.35)));
    }
    let blacks = 0;
    if (p01 > 12) {
        blacks = Math.max(-25, Math.min(0, Math.round((10 - p01) * 0.35)));
    }

    // 4. Tone Mapping: Shadows lift & Highlights recovery
    let shadows = 0;
    if (p05 < 40) {
        shadows = Math.min(35, Math.max(15, Math.round((50 - p05) * 0.75)));
    }
    let highlights = 0;
    if (p95 > 220) {
        highlights = Math.max(-30, Math.min(-10, Math.round((215 - p95) * 0.7)));
    }

    // 5. White Balance: Gray-World chromatic adaptation
    let temperature = 0;
    const rbDiff = (meanR - meanB) / (meanG + 0.001);
    if (rbDiff < -0.08) {
        temperature = Math.min(20, Math.round(-rbDiff * 40));
    } else if (rbDiff > 0.18) {
        temperature = Math.max(-18, Math.round(-rbDiff * 25));
    }

    let tint = 0;
    const greenDiff = (meanG - (meanR + meanB) * 0.5) / (meanLum + 0.001);
    if (Math.abs(greenDiff) > 0.08) {
        tint = Math.max(-15, Math.min(15, Math.round(-greenDiff * 35)));
    }

    return {
        exposure,
        contrast,
        highlights,
        shadows,
        whites,
        blacks,
        temperature,
        tint,
        vibrance: 16,
        saturation: 4,
        clarity: 10
    };
}

/**
 * Executes high-performance pixel processing with precomputed LUTs and skin-tone protection.
 */
export function processImageData(imageData: ImageData, options: EditCommand['payload']['options']): ImageData {
    const data = imageData.data;
    const len = data.length;

    let recipe: CanvaAutoAdjustRecipe;

    if (options.autoEnhance) {
        // Reverse-engineered Canva Auto Adjust
        const autoRecipe = computeCanvaRecipeFromImageData(imageData);
        recipe = {
            ...autoRecipe,
            exposure: autoRecipe.exposure + (options.brightness || 0),
            contrast: autoRecipe.contrast + (options.contrast || 0),
            saturation: autoRecipe.saturation + (options.saturation || 0),
            ...(options.recipe || {})
        };
    } else {
        // Fallback or explicit adjustments
        recipe = {
            exposure: options.brightness || 0,
            contrast: options.contrast || 0,
            highlights: options.recipe?.highlights || 0,
            shadows: options.recipe?.shadows || 0,
            whites: options.recipe?.whites || 0,
            blacks: options.recipe?.blacks || 0,
            temperature: options.recipe?.temperature || 0,
            tint: options.recipe?.tint || 0,
            vibrance: options.recipe?.vibrance || 0,
            saturation: options.saturation || options.recipe?.saturation || 0,
            clarity: options.recipe?.clarity || 0
        };
    }

    // Precompute 256-entry Luminance Tone Curve LUT
    const toneLUT = new Uint8ClampedArray(256);
    const contrastFactor = recipe.contrast !== 0
        ? (259 * (recipe.contrast + 255)) / (255 * (259 - recipe.contrast))
        : 1;

    for (let y = 0; y < 256; y++) {
        let val = y;

        // Exposure
        if (recipe.exposure !== 0) {
            val += (recipe.exposure / 100) * 60;
        }

        // Contrast
        if (recipe.contrast !== 0) {
            val = contrastFactor * (val - 128) + 128;
        }

        // Shadows lift (smooth bell-curve peaking around y=70)
        if (recipe.shadows > 0 && y < 140) {
            const shadowWeight = Math.sin((y / 140) * Math.PI);
            val += (recipe.shadows / 100) * 45 * shadowWeight;
        }

        // Highlights recovery (smooth bell-curve between y=120 and y=255)
        if (recipe.highlights < 0 && y > 120) {
            const highlightWeight = Math.sin(((y - 120) / 135) * Math.PI);
            val += (recipe.highlights / 100) * 45 * highlightWeight;
        }

        // Whites expansion
        if (recipe.whites > 0 && y > 180) {
            val += (recipe.whites / 100) * 35 * ((y - 180) / 75);
        }

        // Blacks compression
        if (recipe.blacks < 0 && y < 60) {
            val += (recipe.blacks / 100) * 25 * ((60 - y) / 60);
        }

        toneLUT[y] = Math.max(0, Math.min(255, Math.round(val)));
    }

    // Chromatic adaptation gains (Temperature & Tint)
    const tempScaleR = 1 + (recipe.temperature / 100) * 0.16;
    const tempScaleB = 1 - (recipe.temperature / 100) * 0.16;
    const tintScaleG = 1 - (recipe.tint / 100) * 0.12;

    const baseVibranceGain = (recipe.vibrance / 100) * 0.85;
    const baseSatGain = (recipe.saturation / 100) * 0.5;

    // Fast single-pass pixel loop
    for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Chromatic Adaptation (White Balance)
        if (recipe.temperature !== 0 || recipe.tint !== 0) {
            r = r * tempScaleR;
            g = g * tintScaleG;
            b = b * tempScaleB;
        }

        // 2. Luminance-guided Tone Curve via LUT
        const origY = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const targetY = toneLUT[Math.min(255, Math.max(0, origY))];
        const lumRatio = origY > 0 ? targetY / origY : 1;

        r = r * lumRatio;
        g = g * lumRatio;
        b = b * lumRatio;

        // 3. Skin-tone protected Vibrance & Saturation
        // Human skin tone detection: R > G > B with characteristic hue range
        const isSkin = (r > g) && (g > b) && 
                       ((r - g) / (r + 0.001) > 0.12) && 
                       ((r - g) / (r + 0.001) < 0.65) && 
                       (r > 40);

        // Protect skin from excessive saturation so guests never appear sunburnt
        const satMultiplier = isSkin
            ? 1 + baseVibranceGain * 0.18
            : 1 + baseVibranceGain + baseSatGain;

        if (satMultiplier !== 1) {
            const curY = 0.299 * r + 0.587 * g + 0.114 * b;
            r = curY + satMultiplier * (r - curY);
            g = curY + satMultiplier * (g - curY);
            b = curY + satMultiplier * (b - curY);
        }

        // Clamp to valid 8-bit unsigned integers
        data[i] = r > 255 ? 255 : (r < 0 ? 0 : r);
        data[i + 1] = g > 255 ? 255 : (g < 0 ? 0 : g);
        data[i + 2] = b > 255 ? 255 : (b < 0 ? 0 : b);
    }

    return imageData;
}
