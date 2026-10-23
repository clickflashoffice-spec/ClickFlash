import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { AutoEditEngine } from '../../services/AutoEditEngine.ts';

describe('Canva Auto-Adjust Engine', () => {
  it('correctly analyzes a dark image and generates exposure boost and shadow lift', async () => {
    // Generate a 100x100 dark image (luminance ~30)
    const darkBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 30, g: 30, b: 35 }
      }
    }).jpeg().toBuffer();

    const recipe = await AutoEditEngine.computeCanvaAutoAdjust(darkBuffer);

    expect(recipe).toBeDefined();
    // Dark image should trigger positive exposure to bring toward midtone 128
    expect(recipe.exposure).toBeGreaterThan(20);
    // Dark shadows should trigger positive shadow lift
    expect(recipe.shadows).toBeGreaterThanOrEqual(15);
    // Vibrance should be present
    expect(recipe.vibrance).toBeGreaterThan(0);
    expect(recipe.confidence).toBeGreaterThan(0.9);
  });

  it('correctly compensates warm color cast with cooling temperature', async () => {
    // Generate an image with strong warm/orange cast (R=210, G=140, B=60)
    const warmBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 210, g: 140, b: 60 }
      }
    }).jpeg().toBuffer();

    const recipe = await AutoEditEngine.computeCanvaAutoAdjust(warmBuffer);

    expect(recipe).toBeDefined();
    // Warm image (high red, low blue) should trigger cooling temperature (negative)
    expect(recipe.temperature).toBeLessThan(0);
    expect(recipe.clarity).toBe(12);
  });

  it('correctly compresses harsh highlights on bright overexposed image', async () => {
    // Generate a bright image with blown highlights (luminance ~240)
    const brightBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 245, g: 240, b: 235 }
      }
    }).jpeg().toBuffer();

    const recipe = await AutoEditEngine.computeCanvaAutoAdjust(brightBuffer);

    expect(recipe).toBeDefined();
    // Bright image should pull down exposure
    expect(recipe.exposure).toBeLessThan(0);
    // Blown highlights should trigger negative highlight recovery
    expect(recipe.highlights).toBeLessThanOrEqual(-15);
  });

  it('returns all Canva-grade adjustment parameters in the recipe', async () => {
    const neutralBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 128, g: 128, b: 128 }
      }
    }).jpeg().toBuffer();

    const recipe = await AutoEditEngine.computeCanvaAutoAdjust(neutralBuffer);

    expect(recipe).toHaveProperty('exposure');
    expect(recipe).toHaveProperty('contrast');
    expect(recipe).toHaveProperty('saturate');
    expect(recipe).toHaveProperty('vibrance');
    expect(recipe).toHaveProperty('highlights');
    expect(recipe).toHaveProperty('shadows');
    expect(recipe).toHaveProperty('whites');
    expect(recipe).toHaveProperty('blacks');
    expect(recipe).toHaveProperty('temperature');
    expect(recipe).toHaveProperty('tint');
    expect(recipe).toHaveProperty('clarity');
  });
});
