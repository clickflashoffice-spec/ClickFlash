/**
 * Utility functions for high-speed vector math (cosine similarity, normalization).
 */

export function isFiniteVector(
  vector: readonly number[],
  expectedDimensions?: number,
): boolean {
  if (
    vector.length === 0 ||
    (expectedDimensions !== undefined && vector.length !== expectedDimensions)
  ) {
    return false;
  }

  return vector.every(Number.isFinite);
}

export function cosineSimilarity(
  vecA: readonly number[],
  vecB: readonly number[],
): number {
  if (
    vecA.length !== vecB.length ||
    !isFiniteVector(vecA) ||
    !isFiniteVector(vecB)
  ) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (
    !Number.isFinite(dotProduct) ||
    !Number.isFinite(normA) ||
    !Number.isFinite(normB) ||
    normA <= Number.EPSILON ||
    normB <= Number.EPSILON
  ) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Number.isFinite(similarity) ? Math.max(-1, Math.min(1, similarity)) : 0;
}

export function l2Normalize(vec: readonly number[]): number[] {
  if (!isFiniteVector(vec)) {
    throw new RangeError('Vector must contain at least one finite value.');
  }

  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }

  norm = Math.sqrt(norm);
  if (!Number.isFinite(norm) || norm <= Number.EPSILON) {
    throw new RangeError('Vector magnitude must be finite and non-zero.');
  }

  return vec.map(v => v / norm);
}

export function isEyesClosed(ear: number): boolean {
  return !Number.isFinite(ear) || ear < 0.20;
}

export function isHighQualitySmile(smileDegree: number): boolean {
  return smileDegree >= 0.70;
}

export function calculateQualityRating(signals: {
  sharpness: number;
  eyesOpenEar: number;
  smileDegree: number;
  exposureScore: number;
}): { overall: number; stars: 1 | 2 | 3 | 4 | 5; recommendation: 'keep' | 'review' | 'reject' } {
  if (Object.values(signals).some((value) => !Number.isFinite(value))) {
    throw new RangeError('Quality signals must be finite numbers.');
  }

  const sharpness = Math.max(0, Math.min(100, signals.sharpness));
  const eyesOpenEar = Math.max(0, Math.min(1, signals.eyesOpenEar));
  const smileDegree = Math.max(0, Math.min(1, signals.smileDegree));
  const exposureScore = signals.exposureScore <= 1.0 ? signals.exposureScore * 100 : Math.min(100, signals.exposureScore);
  const eyeScore = eyesOpenEar >= 0.22 ? 100 : (eyesOpenEar / 0.22) * 80;
  const smileBonus = smileDegree * 20;
  const rawScore = (sharpness * 0.45) + (exposureScore * 0.25) + (eyeScore * 0.20) + (smileBonus * 0.10);
  const overall = Math.min(100, Math.max(0, Math.round(rawScore)));

  let stars: 1 | 2 | 3 | 4 | 5 = 1;
  let recommendation: 'keep' | 'review' | 'reject' = 'reject';

  if (overall >= 85 && !isEyesClosed(eyesOpenEar)) {
    stars = 5;
    recommendation = 'keep';
  } else if (overall >= 70 && !isEyesClosed(eyesOpenEar)) {
    stars = 4;
    recommendation = 'keep';
  } else if (overall >= 55) {
    stars = 3;
    recommendation = 'review';
  } else if (overall >= 40) {
    stars = 2;
    recommendation = 'reject';
  } else {
    stars = 1;
    recommendation = 'reject';
  }

  return { overall, stars, recommendation };
}
