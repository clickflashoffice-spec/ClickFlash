/**
 * ClickFlash Computer Vision & Biometric Vector Bridge
 * Provides mathematical vector similarity and automated photo quality scoring algorithms.
 */

export interface PhotoQualityMetrics {
  photoId: string;
  sharpnessScore: number;     // 0 - 100 (Laplacian variance normalized)
  exposureScore: number;      // 0 - 100 (Histogram balance)
  compositionScore: number;   // 0 - 100 (Rule of thirds / saliency)
  eyesOpenConfidence: number; // 0.0 - 1.0
  smileConfidence: number;    // 0.0 - 1.0
  faceCount: number;
}

export type PhotoGrade = 'A+' | 'A' | 'B' | 'C' | 'REJECT';

export interface CullingResult {
  photoId: string;
  overallScore: number;
  grade: PhotoGrade;
  isHeroShot: boolean;
  rejectReasons: string[];
}

export interface FaceMatchResult {
  matched: boolean;
  similarityScore: number;
  distance: number;
  thresholdUsed: number;
}

export class VisionBridge {
  /**
   * Computes the Cosine Similarity between two 512-dimensional ArcFace vectors.
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) {
      throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Matches a guest selfie embedding against a gallery photo embedding.
   * ArcFace default cosine threshold is 0.68 for 99.8% verification accuracy.
   */
  static matchFace(selfieVec: number[], candidateVec: number[], threshold: number = 0.68): FaceMatchResult {
    const similarity = VisionBridge.cosineSimilarity(selfieVec, candidateVec);
    const distance = 1 - similarity;

    return {
      matched: similarity >= threshold,
      similarityScore: Math.round(similarity * 1000) / 1000,
      distance: Math.round(distance * 1000) / 1000,
      thresholdUsed: threshold
    };
  }

  /**
   * Evaluates and grades a photo based on automated culling metrics.
   */
  static evaluateCulling(metrics: PhotoQualityMetrics): CullingResult {
    const rejectReasons: string[] = [];

    // Critical sharpness check
    if (metrics.sharpnessScore < 40) {
      rejectReasons.push('Blurry / Out of focus');
    }

    // Blink detection
    if (metrics.eyesOpenConfidence < 0.6 && metrics.faceCount > 0) {
      rejectReasons.push('Subject blinking / closed eyes');
    }

    // Harsh exposure
    if (metrics.exposureScore < 30) {
      rejectReasons.push('Severe over/underexposure');
    }

    // Weighted overall score calculation (0 - 100)
    const overallScore = Math.round(
      metrics.sharpnessScore * 0.4 +
      metrics.exposureScore * 0.25 +
      metrics.compositionScore * 0.2 +
      (metrics.eyesOpenConfidence * 100) * 0.15
    );

    let grade: PhotoGrade = 'REJECT';
    if (rejectReasons.length === 0) {
      if (overallScore >= 90 && metrics.smileConfidence > 0.8) {
        grade = 'A+';
      } else if (overallScore >= 80) {
        grade = 'A';
      } else if (overallScore >= 65) {
        grade = 'B';
      } else {
        grade = 'C';
      }
    }

    return {
      photoId: metrics.photoId,
      overallScore,
      grade,
      isHeroShot: grade === 'A+' || (grade === 'A' && metrics.smileConfidence > 0.85),
      rejectReasons
    };
  }
}
