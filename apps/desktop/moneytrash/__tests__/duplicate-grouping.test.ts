/**
 * ClickFlash V7.0 - Duplicate Shot Grouping & Burst Clustering Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { DuplicateGroupingEngine, duplicateGroupingEngine } from '../src/wasm/duplicate-grouping';
import type { EvaluatedShot } from '../src/wasm/types';

describe('DuplicateGroupingEngine (Perceptual Hashing & Burst Clustering)', () => {
  const engine = new DuplicateGroupingEngine();

  describe('dHash & aHash Generation', () => {
    it('generates 16-character hex dHash from 9x8 grayscale image', () => {
      // 9 columns x 8 rows = 72 bytes
      const smallGrayscale = new Uint8Array(72);
      for (let i = 0; i < 72; i++) {
        smallGrayscale[i] = (i * 17) % 256;
      }

      const dHash = engine.computeDHashFrom9x8(smallGrayscale);

      expect(dHash).toHaveLength(16);
      expect(/^[0-9a-f]{16}$/i.test(dHash)).toBe(true);
    });

    it('generates 16-character hex aHash from 8x8 grayscale image', () => {
      const smallGrayscale = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        smallGrayscale[i] = (i * 23) % 256;
      }

      const aHash = engine.computeAHashFrom8x8(smallGrayscale);

      expect(aHash).toHaveLength(16);
      expect(/^[0-9a-f]{16}$/i.test(aHash)).toBe(true);
    });

    it('returns zero distance for identical hashes', () => {
      const hash = 'a1b2c3d4e5f60718';
      const distance = engine.computeHammingDistance(hash, hash);
      const similarity = engine.computeSimilarity(hash, hash);

      expect(distance).toBe(0);
      expect(similarity).toBe(1.0);
    });

    it('computes correct Hamming distance for differing bit patterns', () => {
      const hashA = '0000000000000000';
      const hashB = '000000000000000f'; // 4 bits different in last nibble (0b1111)

      const distance = engine.computeHammingDistance(hashA, hashB);
      expect(distance).toBe(4);
    });
  });

  describe('Burst Grouping & Hero Selection', () => {
    it('groups temporally close shots with low Hamming distance into a burst cluster', () => {
      const now = Date.now();
      const mockShots: EvaluatedShot[] = [
        {
          photoId: 'shot_burst_01',
          filePath: 'burst_01.jpg',
          timestampMs: now,
          blurMetrics: { laplacianVarianceScore: 70, tenengradScore: 70, highFrequencyEnergy: 70, sharpnessScore: 70, blurScore: 30, subjectBackgroundContrast: 1, isSharp: true },
          faces: [],
          perceptualHash: { dHash: '1111222233334444', aHash: '1111222233334444', pHash: '1111222233334444' },
          compositeQualityScore: 75,
          isHeroCandidate: false,
          cullRecommendation: 'KEEP_SECONDARY',
          cullReason: ''
        },
        {
          photoId: 'shot_burst_02',
          filePath: 'burst_02.jpg',
          timestampMs: now + 150, // 150ms later (same burst)
          blurMetrics: { laplacianVarianceScore: 92, tenengradScore: 90, highFrequencyEnergy: 90, sharpnessScore: 92, blurScore: 8, subjectBackgroundContrast: 1, isSharp: true },
          faces: [],
          perceptualHash: { dHash: '1111222233334445', aHash: '1111222233334445', pHash: '1111222233334445' }, // 1 bit diff
          compositeQualityScore: 94,
          isHeroCandidate: true,
          cullRecommendation: 'KEEP_HERO',
          cullReason: ''
        },
        {
          photoId: 'shot_burst_03',
          filePath: 'burst_03.jpg',
          timestampMs: now + 300, // 300ms later (same burst)
          blurMetrics: { laplacianVarianceScore: 60, tenengradScore: 60, highFrequencyEnergy: 60, sharpnessScore: 60, blurScore: 40, subjectBackgroundContrast: 1, isSharp: true },
          faces: [],
          perceptualHash: { dHash: '1111222233334446', aHash: '1111222233334446', pHash: '1111222233334446' }, // 1 bit diff
          compositeQualityScore: 65,
          isHeroCandidate: false,
          cullRecommendation: 'KEEP_SECONDARY',
          cullReason: ''
        }
      ];

      const groups = engine.groupDuplicates(mockShots, 10, 3000);

      expect(groups).toHaveLength(1);
      expect(groups[0].totalShots).toBe(3);
      expect(groups[0].heroShotId).toBe('shot_burst_02'); // Highest quality shot chosen as Hero
      expect(groups[0].shots[0].cullRecommendation).toBe('KEEP_HERO');
      expect(groups[0].shots[1].cullRecommendation).toBe('DISCARD_DUPLICATE');
    });

    it('separates shots that exceed the burst time window into distinct clusters', () => {
      const now = Date.now();
      const mockShots: EvaluatedShot[] = [
        {
          photoId: 'photo_morning',
          filePath: 'morning.jpg',
          timestampMs: now,
          blurMetrics: { laplacianVarianceScore: 80, tenengradScore: 80, highFrequencyEnergy: 80, sharpnessScore: 80, blurScore: 20, subjectBackgroundContrast: 1, isSharp: true },
          faces: [],
          perceptualHash: { dHash: '1234567890abcdef', aHash: '1234567890abcdef', pHash: '1234567890abcdef' },
          compositeQualityScore: 80,
          isHeroCandidate: true,
          cullRecommendation: 'KEEP_HERO',
          cullReason: ''
        },
        {
          photoId: 'photo_evening',
          filePath: 'evening.jpg',
          timestampMs: now + 3600000, // 1 hour later
          blurMetrics: { laplacianVarianceScore: 85, tenengradScore: 85, highFrequencyEnergy: 85, sharpnessScore: 85, blurScore: 15, subjectBackgroundContrast: 1, isSharp: true },
          faces: [],
          perceptualHash: { dHash: '1234567890abcdef', aHash: '1234567890abcdef', pHash: '1234567890abcdef' }, // Same hash but different time
          compositeQualityScore: 85,
          isHeroCandidate: true,
          cullRecommendation: 'KEEP_HERO',
          cullReason: ''
        }
      ];

      const groups = engine.groupDuplicates(mockShots, 10, 3000);

      expect(groups).toHaveLength(2);
    });
  });
});
