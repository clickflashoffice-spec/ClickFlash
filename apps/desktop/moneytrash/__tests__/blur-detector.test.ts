/**
 * ClickFlash V7.0 - Blur & Sharpness Detector Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { BlurDetector, blurDetector } from '../src/wasm/blur-detector';
import type { BoundingBox } from '../src/wasm/types';

describe('BlurDetector (WASM & Multi-Scale CV Sharpness)', () => {
  const detector = new BlurDetector();

  describe('Buffer Analysis (Synthetic Grayscale)', () => {
    it('returns 0 sharpness and 100 blur for flat uniform images', async () => {
      const width = 16;
      const height = 16;
      const flat = new Uint8Array(width * height).fill(128);

      const metrics = await detector.analyzeBuffer(flat, width, height);

      expect(metrics.laplacianVarianceScore).toBe(0);
      expect(metrics.tenengradScore).toBe(0);
      expect(metrics.sharpnessScore).toBe(0);
      expect(metrics.blurScore).toBe(100);
      expect(metrics.isSharp).toBe(false);
    });

    it('detects high sharpness and edge energy on high contrast edges', async () => {
      const width = 32;
      const height = 32;
      const sharpImage = new Uint8Array(width * height);

      // Create high-contrast step edges (vertical bars)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          sharpImage[y * width + x] = Math.floor(x / 4) % 2 === 0 ? 255 : 0;
        }
      }

      const metrics = await detector.analyzeBuffer(sharpImage, width, height);

      expect(metrics.laplacianVarianceScore).toBeGreaterThan(20);
      expect(metrics.tenengradScore).toBeGreaterThan(20);
      expect(metrics.highFrequencyEnergy).toBeGreaterThan(20);
      expect(metrics.sharpnessScore).toBeGreaterThanOrEqual(40);
    });

    it('handles invalid buffer dimensions gracefully', async () => {
      const invalid = new Uint8Array(10);
      const metrics = await detector.analyzeBuffer(invalid, 2, 2);

      expect(metrics.sharpnessScore).toBe(0);
      expect(metrics.blurScore).toBe(100);
      expect(metrics.isSharp).toBe(false);
    });

    it('applies bokeh compensation when face ROI is sharper than blurred background', async () => {
      const width = 32;
      const height = 32;
      const image = new Uint8Array(width * height).fill(100); // mostly flat background

      // Add high-contrast sharp edge inside face ROI (x: 10, y: 10, w: 10, h: 10)
      for (let y = 10; y < 20; y++) {
        for (let x = 10; x < 20; x++) {
          image[y * width + x] = Math.floor(x / 2) % 2 === 0 ? 255 : 0;
        }
      }

      const faceRoi: BoundingBox = { x: 10, y: 10, width: 10, height: 10 };
      const metrics = await detector.analyzeBuffer(image, width, height, [faceRoi]);

      expect(metrics.subjectBackgroundContrast).toBeGreaterThanOrEqual(1.0);
      expect(metrics.sharpnessScore).toBeGreaterThan(15);
    });
  });

  describe('Tenengrad Gradient Energy', () => {
    it('computes positive energy for gradient edges', () => {
      const width = 16;
      const height = 16;
      const ramp = new Uint8Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          ramp[y * width + x] = x * 15;
        }
      }

      const score = detector.computeTenengradGradient(ramp, width, height, 10);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Metadata & Filename Evaluation', () => {
    it('scores hero and studio photos with high sharpness (>80)', () => {
      const metrics = blurDetector.evaluateFromMetadata('resort_hero_portrait_01.jpg');
      expect(metrics.sharpnessScore).toBeGreaterThanOrEqual(85);
      expect(metrics.blurScore).toBeLessThanOrEqual(15);
      expect(metrics.isSharp).toBe(true);
    });

    it('scores blurry or defect photos with severe blur (<25 sharpness)', () => {
      const metrics = blurDetector.evaluateFromMetadata('defect_lenscap_blurry.jpg');
      expect(metrics.sharpnessScore).toBeLessThanOrEqual(25);
      expect(metrics.blurScore).toBeGreaterThanOrEqual(75);
      expect(metrics.isSharp).toBe(false);
    });

    it('scores rollercoaster action shots with motion blur allowance', () => {
      const metrics = blurDetector.evaluateFromMetadata('rollercoaster_action_splash.jpg');
      expect(metrics.sharpnessScore).toBeLessThanOrEqual(50);
      expect(metrics.blurScore).toBeGreaterThanOrEqual(50);
    });
  });
});
