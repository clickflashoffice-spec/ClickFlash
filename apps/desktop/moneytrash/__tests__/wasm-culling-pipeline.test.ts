/**
 * ClickFlash V7.0 - WASM & AI Culling Pipeline Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { CullingPipeline, cullingPipeline } from '../src/wasm/culling-pipeline';
import type { ShotMetadata } from '../src/wasm/types';

describe('CullingPipeline (End-to-End WASM Culling & Batch Processing)', () => {
  const pipeline = new CullingPipeline();

  it('evaluates a single hero studio portrait and assigns KEEP_HERO', async () => {
    const shot: ShotMetadata = {
      photoId: 'studio_hero_01',
      filePath: 'resort_hero_portrait_studio_01.jpg',
      timestampMs: Date.now()
    };

    const result = await pipeline.evaluateShot(shot);

    expect(result.cullRecommendation).toBe('KEEP_HERO');
    expect(result.isHeroCandidate).toBe(true);
    expect(result.blurMetrics.sharpnessScore).toBeGreaterThanOrEqual(75);
    expect(result.faces.length).toBeGreaterThan(0);
    expect(result.faces[0].eyes.areBothEyesOpen).toBe(true);
    expect(result.compositeQualityScore).toBeGreaterThanOrEqual(80);
  });

  it('triggers EMOTIONAL_RESCUE for rollercoaster / action splash shots with motion blur', async () => {
    const shot: ShotMetadata = {
      photoId: 'action_splash_coaster_42',
      filePath: 'action_splash_rollercoaster_family.jpg',
      timestampMs: Date.now()
    };

    const result = await pipeline.evaluateShot(shot, { enableEmotionalBypass: true });

    expect(result.cullRecommendation).toBe('EMOTIONAL_RESCUE');
    expect(result.isHeroCandidate).toBe(true);
    expect(result.cullReason).toContain('Emotional Intelligence');
    expect(result.faces[0].smileScore).toBeGreaterThanOrEqual(80);
  });

  it('discards defect photos with lens cap / extreme blur as DISCARD_DEFECT', async () => {
    const shot: ShotMetadata = {
      photoId: 'defect_blurry_floor',
      filePath: 'defect_blurry_floor_dark.jpg',
      timestampMs: Date.now()
    };

    const result = await pipeline.evaluateShot(shot);

    expect(result.cullRecommendation).toBe('DISCARD_DEFECT');
    expect(result.isHeroCandidate).toBe(false);
    expect(result.blurMetrics.sharpnessScore).toBeLessThan(30);
  });

  it('processes a batch of shots with duplicate grouping, selects the best Hero, and discards redundant duplicates', async () => {
    const now = Date.now();
    const photos: ShotMetadata[] = [
      {
        photoId: 'burst_01_hero',
        filePath: 'hero_portrait_burst_01.jpg',
        timestampMs: now
      },
      {
        photoId: 'burst_02_dup',
        filePath: 'hero_portrait_burst_02.jpg',
        timestampMs: now + 100
      },
      {
        photoId: 'action_coaster_03',
        filePath: 'action_splash_coaster_drop.jpg',
        timestampMs: now + 5000 // New cluster
      },
      {
        photoId: 'defect_floor_04',
        filePath: 'defect_floor_lenscap.jpg',
        timestampMs: now + 10000 // New cluster
      }
    ];

    const batch = await pipeline.processBatch(photos, {
      concurrency: 4,
      burstWindowMs: 3000,
      enableEmotionalBypass: true
    });

    expect(batch.totalProcessed).toBe(4);
    expect(batch.heroCount).toBeGreaterThanOrEqual(1);
    expect(batch.emotionalRescueCount).toBeGreaterThanOrEqual(1);
    expect(batch.defectDiscardCount).toBeGreaterThanOrEqual(1);
    expect(batch.groups.length).toBeGreaterThan(0);
    expect(batch.durationMs).toBeGreaterThan(0);
    expect(batch.peakThroughputFps).toBeGreaterThan(0);
  });
});
