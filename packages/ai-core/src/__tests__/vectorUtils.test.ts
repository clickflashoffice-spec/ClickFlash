import { describe, it, expect } from 'vitest';
import { 
  cosineSimilarity, 
  l2Normalize, 
  isFiniteVector,
  isEyesClosed, 
  isHighQualitySmile, 
  calculateQualityRating 
} from '../vectorUtils';
import { AI_CONFIG } from '../constants';

describe('VectorUtils & AI Math Engine', () => {
  it('keeps the indexed face contract at 128D until the 512D migration', () => {
    expect(AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE).toBe(128);
    expect(AI_CONFIG.FACE_VECTOR_DIMENSION_TARGET).toBe(512);
    expect(AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE).not.toBe(
      AI_CONFIG.FACE_VECTOR_DIMENSION_TARGET,
    );
  });

  it('should compute exact cosine similarity for identical 512D vectors', () => {
    const vecA = new Array(512).fill(0.5);
    const vecB = new Array(512).fill(0.5);
    const similarity = cosineSimilarity(vecA, vecB);
    expect(similarity).toBeCloseTo(1.0, 5);
  });

  it('should compute orthogonal vectors as zero similarity', () => {
    const vecA = [1, 0, 0, 0];
    const vecB = [0, 1, 0, 0];
    const similarity = cosineSimilarity(vecA, vecB);
    expect(similarity).toBeCloseTo(0.0, 5);
  });

  it('should properly L2 normalize vectors', () => {
    const vec = [3, 4];
    const normalized = l2Normalize(vec);
    expect(normalized[0]).toBeCloseTo(0.6, 5);
    expect(normalized[1]).toBeCloseTo(0.8, 5);
    
    // Sum of squares should equal 1
    const magnitude = Math.sqrt(normalized[0]**2 + normalized[1]**2);
    expect(magnitude).toBeCloseTo(1.0, 5);
  });

  it('rejects empty, non-finite, and zero-magnitude vectors', () => {
    expect(isFiniteVector([], 128)).toBe(false);
    expect(isFiniteVector([1, Number.NaN])).toBe(false);
    expect(() => l2Normalize([])).toThrow(RangeError);
    expect(() => l2Normalize([0, 0])).toThrow(RangeError);
    expect(() => l2Normalize([1, Number.POSITIVE_INFINITY])).toThrow(RangeError);
  });

  it('fails cosine similarity closed for malformed vectors', () => {
    expect(cosineSimilarity([1, 0], [1])).toBe(0);
    expect(cosineSimilarity([1, Number.NaN], [1, 0])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it('should detect closed eyes via Eye Aspect Ratio (EAR)', () => {
    expect(isEyesClosed(0.12)).toBe(true);
    expect(isEyesClosed(0.18)).toBe(true);
    expect(isEyesClosed(0.28)).toBe(false);
  });

  it('should identify high quality smiles', () => {
    expect(isHighQualitySmile(0.85)).toBe(true);
    expect(isHighQualitySmile(0.40)).toBe(false);
  });

  it('should calculate 5-star rating for pristine portrait shots', () => {
    const result = calculateQualityRating({
      sharpness: 98,
      eyesOpenEar: 0.32,
      smileDegree: 0.90,
      exposureScore: 95
    });

    expect(result.stars).toBe(5);
    expect(result.recommendation).toBe('keep');
    expect(result.overall).toBeGreaterThanOrEqual(85);
  });

  it('should reject shots with blinks and severe blur', () => {
    const result = calculateQualityRating({
      sharpness: 25,
      eyesOpenEar: 0.10, // closed eyes
      smileDegree: 0.10,
      exposureScore: 30
    });

    expect(result.stars).toBe(1);
    expect(result.recommendation).toBe('reject');
  });

  it('rejects non-finite quality inputs instead of manufacturing a rating', () => {
    expect(() => calculateQualityRating({
      sharpness: Number.NaN,
      eyesOpenEar: 0.3,
      smileDegree: 0.8,
      exposureScore: 90,
    })).toThrow(RangeError);
  });
});
