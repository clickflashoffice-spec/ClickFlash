import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    computeCanvaRecipeFromImageData,
    processImageData
} from '../imageEditor.worker';

// Helper to construct a synthetic ImageData object
function createMockImageData(width: number, height: number, fillRgb: (x: number, y: number) => [number, number, number]): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const [r, g, b] = fillRgb(x, y);
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
        }
    }
    return {
        width,
        height,
        data,
        colorSpace: 'srgb'
    } as ImageData;
}

describe('imageEditor.worker — Canva Auto Adjust Algorithm', () => {
    it('detects underexposed dark images and lifts exposure, shadows, and contrast', () => {
        // Dark underexposed image (values 20-50)
        const darkImg = createMockImageData(100, 100, (x, y) => {
            const v = 20 + Math.floor((x + y) / 200 * 30);
            return [v, v, v];
        });

        const recipe = computeCanvaRecipeFromImageData(darkImg);

        assert.ok(recipe.exposure > 20, `Expected exposure > 20, got ${recipe.exposure}`);
        assert.ok(recipe.shadows > 15, `Expected shadows > 15, got ${recipe.shadows}`);
        assert.equal(recipe.vibrance, 16);
    });

    it('detects overexposed washed-out images and compresses highlights and exposure', () => {
        // High-key washed out image (values 200-245)
        const brightImg = createMockImageData(100, 100, (x, y) => {
            const v = 200 + Math.floor((x + y) / 200 * 45);
            return [v, v, v];
        });

        const recipe = computeCanvaRecipeFromImageData(brightImg);

        assert.ok(recipe.exposure < 0, `Expected exposure < 0, got ${recipe.exposure}`);
        assert.ok(recipe.highlights < 0, `Expected highlights < 0, got ${recipe.highlights}`);
    });

    it('applies gray-world chromatic adaptation to warm up blue-cast images', () => {
        // Cool blue cast: R=80, G=100, B=150
        const coolImg = createMockImageData(50, 50, () => [80, 100, 150]);

        const recipe = computeCanvaRecipeFromImageData(coolImg);

        assert.ok(recipe.temperature > 0, `Expected temperature > 0, got ${recipe.temperature}`);
    });

    it('processes pixels through processImageData with autoEnhance and skin protection', () => {
        // Mixed image with skin tone (R=180, G=120, B=95) and background foliage (R=40, G=140, B=40)
        const img = createMockImageData(50, 50, (x) => {
            if (x < 25) {
                return [180, 120, 95]; // Caucasian/Warm skin tone
            } else {
                return [40, 140, 40];  // Green foliage
            }
        });

        const processed = processImageData(img, { autoEnhance: true });

        // Ensure all pixels are valid integers in [0, 255]
        for (let i = 0; i < processed.data.length; i += 4) {
            assert.ok(processed.data[i] >= 0 && processed.data[i] <= 255);
            assert.ok(processed.data[i + 1] >= 0 && processed.data[i + 1] <= 255);
            assert.ok(processed.data[i + 2] >= 0 && processed.data[i + 2] <= 255);
            assert.equal(processed.data[i + 3], 255);
        }

        // Skin tones should retain gentle saturation increase without exploding
        const skinR = processed.data[0];
        const skinG = processed.data[1];
        const skinB = processed.data[2];
        assert.ok(skinR > skinG, `Expected skinR (${skinR}) > skinG (${skinG})`);
        assert.ok(skinG > skinB, `Expected skinG (${skinG}) > skinB (${skinB})`);
    });
});
