import { describe, it, expect } from 'vitest';
import {
  isFiniteVector,
  cosineSimilarity,
  l2Normalize,
  isEyesClosed,
  isHighQualitySmile,
  calculateQualityRating,
} from './vectorUtils.js';

// ─── isFiniteVector ───────────────────────────────────────────────────────────

describe('isFiniteVector', () => {
  it('returns true for valid vector', () => {
    expect(isFiniteVector([1, 2, 3])).toBe(true);
  });

  it('returns false for empty vector', () => {
    expect(isFiniteVector([])).toBe(false);
  });

  it('returns false when dimensions mismatch', () => {
    expect(isFiniteVector([1, 2, 3], 4)).toBe(false);
  });

  it('returns true when dimensions match exactly', () => {
    expect(isFiniteVector([1, 2, 3], 3)).toBe(true);
  });

  it('returns false for vector containing NaN', () => {
    expect(isFiniteVector([1, NaN, 3])).toBe(false);
  });

  it('returns false for vector containing Infinity', () => {
    expect(isFiniteVector([1, Infinity, 3])).toBe(false);
  });

  it('returns false for vector containing -Infinity', () => {
    expect(isFiniteVector([1, -Infinity, 3])).toBe(false);
  });
});

// ─── cosineSimilarity ────────────────────────────────────────────────────────

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const vec = [1, 2, 3, 4];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns 0 for length mismatch', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
  });

  it('returns 0 for zero vector', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it('returns 0 for NaN in either vector', () => {
    expect(cosineSimilarity([NaN, 1], [1, 1])).toBe(0);
    expect(cosineSimilarity([1, 1], [NaN, 1])).toBe(0);
  });

  it('clamps result to [-1, 1] due to floating point', () => {
    // Normalized identical vectors should never exceed 1 due to float imprecision
    const vec = [0.7071067811865476, 0.7071067811865476];
    const sim = cosineSimilarity(vec, vec);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it('handles 128-dimensional face vectors', () => {
    const a = Array.from({ length: 128 }, (_, i) => Math.sin(i));
    const b = Array.from({ length: 128 }, (_, i) => Math.sin(i));
    expect(cosineSimilarity(a, b)).toBeCloseTo(1);
  });

  it('returns value between -1 and 1 for random vectors', () => {
    const a = Array.from({ length: 64 }, () => Math.random() - 0.5);
    const b = Array.from({ length: 64 }, () => Math.random() - 0.5);
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });
});

// ─── l2Normalize ─────────────────────────────────────────────────────────────

describe('l2Normalize', () => {
  it('returns unit vector (magnitude ≈ 1)', () => {
    const normalized = l2Normalize([3, 4]);
    const magnitude = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1);
  });

  it('correctly normalizes [1, 0, 0] → [1, 0, 0]', () => {
    const result = l2Normalize([1, 0, 0]);
    expect(result[0]).toBeCloseTo(1);
    expect(result[1]).toBeCloseTo(0);
  });

  it('throws for empty vector', () => {
    expect(() => l2Normalize([])).toThrow(RangeError);
  });

  it('throws for zero vector', () => {
    expect(() => l2Normalize([0, 0, 0])).toThrow(RangeError);
  });

  it('throws for vector with NaN', () => {
    expect(() => l2Normalize([NaN, 1])).toThrow(RangeError);
  });

  it('cosine similarity of two normalized vectors equals dot product', () => {
    const a = l2Normalize([3, 1, -2]);
    const b = l2Normalize([1, 5, 0]);
    const dotProduct = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const cosine = cosineSimilarity(a, b);
    expect(cosine).toBeCloseTo(dotProduct);
  });
});

// ─── isEyesClosed ────────────────────────────────────────────────────────────

describe('isEyesClosed', () => {
  it('returns true when EAR is below 0.20 (closed)', () => {
    expect(isEyesClosed(0.10)).toBe(true);
    expect(isEyesClosed(0.19)).toBe(true);
  });

  it('returns false when EAR is at or above 0.20 (open)', () => {
    expect(isEyesClosed(0.20)).toBe(false);
    expect(isEyesClosed(0.35)).toBe(false);
  });

  it('returns true for NaN (defensive)', () => {
    expect(isEyesClosed(NaN)).toBe(true);
  });

  it('returns true for negative EAR', () => {
    expect(isEyesClosed(-0.1)).toBe(true);
  });
});

// ─── isHighQualitySmile ───────────────────────────────────────────────────────

describe('isHighQualitySmile', () => {
  it('returns true for smile degree >= 0.70', () => {
    expect(isHighQualitySmile(0.70)).toBe(true);
    expect(isHighQualitySmile(0.99)).toBe(true);
  });

  it('returns false below 0.70', () => {
    expect(isHighQualitySmile(0.69)).toBe(false);
    expect(isHighQualitySmile(0.0)).toBe(false);
  });
});

// ─── calculateQualityRating ───────────────────────────────────────────────────

describe('calculateQualityRating', () => {
  const excellentSignals = {
    sharpness: 95,
    eyesOpenEar: 0.35,
    smileDegree: 0.85,
    exposureScore: 90,
  };

  it('returns 5 stars for excellent signals', () => {
    const result = calculateQualityRating(excellentSignals);
    expect(result.stars).toBe(5);
    expect(result.recommendation).toBe('keep');
    expect(result.overall).toBeGreaterThanOrEqual(85);
  });

  it('returns 1 star and reject for low quality', () => {
    const result = calculateQualityRating({
      sharpness: 10,
      eyesOpenEar: 0.05,
      smileDegree: 0.0,
      exposureScore: 15,
    });
    expect(result.stars).toBe(1);
    expect(result.recommendation).toBe('reject');
  });

  it('returns review for middling signals', () => {
    const result = calculateQualityRating({
      sharpness: 60,
      eyesOpenEar: 0.30,
      smileDegree: 0.40,
      exposureScore: 55,
    });
    expect(result.recommendation).toBe('review');
    expect(result.stars).toBe(3);
  });

  it('rejects photos with closed eyes even if sharpness is high', () => {
    const result = calculateQualityRating({
      sharpness: 95,
      eyesOpenEar: 0.05, // closed!
      smileDegree: 0.8,
      exposureScore: 90,
    });
    // Eyes closed means cannot be 4 or 5 stars
    expect(result.stars).toBeLessThanOrEqual(3);
  });

  it('clamps out-of-range sharpness values', () => {
    // sharpness > 100 should be treated as 100
    const result = calculateQualityRating({
      sharpness: 999,
      eyesOpenEar: 0.35,
      smileDegree: 0.9,
      exposureScore: 100,
    });
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('throws RangeError when signals contain NaN', () => {
    expect(() =>
      calculateQualityRating({
        sharpness: NaN,
        eyesOpenEar: 0.3,
        smileDegree: 0.5,
        exposureScore: 80,
      }),
    ).toThrow(RangeError);
  });

  it('throws RangeError for Infinity', () => {
    expect(() =>
      calculateQualityRating({
        sharpness: Infinity,
        eyesOpenEar: 0.3,
        smileDegree: 0.5,
        exposureScore: 80,
      }),
    ).toThrow(RangeError);
  });
});
