import { describe, it, expect } from 'vitest';
import { ImageProcessor } from './index';
import sharp from 'sharp';

describe('wasm-cv package — ImageProcessor', () => {
  it('returns zero or near-zero variance for a flat solid color image', async () => {
    const processor = new ImageProcessor();
    
    // Create a 50x50 flat grey image
    const flatBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 128, g: 128, b: 128 }
      }
    }).png().toBuffer();

    const sharpness = await processor.gradeSharpness(flatBuffer);
    expect(sharpness).toBe(0);
  });

  it('returns positive variance for an image with sharp edges', async () => {
    const processor = new ImageProcessor();

    // Create a 50x50 image with alternating black and white stripes
    const rawData = new Uint8Array(50 * 50 * 3);
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        const val = (x % 2 === 0) ? 255 : 0;
        const idx = (y * 50 + x) * 3;
        rawData[idx] = val;
        rawData[idx + 1] = val;
        rawData[idx + 2] = val;
      }
    }

    const stripeBuffer = await sharp(rawData, {
      raw: { width: 50, height: 50, channels: 3 }
    }).png().toBuffer();

    const sharpness = await processor.gradeSharpness(stripeBuffer);
    expect(sharpness).toBeGreaterThan(100);
  });
});
