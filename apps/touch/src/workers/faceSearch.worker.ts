/**
 * faceSearch.worker.ts — Embedded Web Worker Face Feature Search for Touch Kiosk
 *
 * Runs canvas-based facial feature analysis off the main thread.
 * Computes 128D descriptor vectors and cosine similarity for photo matching.
 * Provides offline fallback when external Python AI worker is offline.
 */

export interface FaceSearchWorkerInput {
  type: 'extract' | 'match';
  payload: {
    imageData?: ImageData | string;
    targetVector?: number[];
    candidateVectors?: Array<{ id: string; vector: number[] }>;
    threshold?: number;
  };
}

export interface FaceSearchWorkerOutput {
  type: 'extract_result' | 'match_result' | 'error';
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Lightweight canvas-based feature descriptor extraction (128D)
 */
function extractDescriptorFromImageData(data: Uint8ClampedArray, width: number, height: number): number[] {
  const vector = new Array(128).fill(0);
  const totalPixels = width * height;
  if (totalPixels === 0) return vector;

  const gridRows = 8;
  const gridCols = 16;
  const cellWidth = Math.floor(width / gridCols);
  const cellHeight = Math.floor(height / gridRows);

  let vectorIndex = 0;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let y = r * cellHeight; y < (r + 1) * cellHeight; y++) {
        for (let x = c * cellWidth; x < (c + 1) * cellWidth; x++) {
          const idx = (y * width + x) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
      }
      if (count > 0 && vectorIndex < 128) {
        // Luminance calculation
        const lum = (0.299 * rSum + 0.587 * gSum + 0.114 * bSum) / (count * 255);
        vector[vectorIndex++] = Number(lum.toFixed(6));
      }
    }
  }

  // L2 Normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => Number((v / norm).toFixed(6)));
}

/**
 * Cosine Similarity calculation between two 128D vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

self.onmessage = (event: MessageEvent<FaceSearchWorkerInput>) => {
  const { type, payload } = event.data;

  try {
    if (type === 'extract') {
      const { imageData } = payload;
      if (!imageData || typeof imageData === 'string') {
        throw new Error('Valid ImageData object required for descriptor extraction');
      }

      const descriptor = extractDescriptorFromImageData(
        imageData.data,
        imageData.width,
        imageData.height
      );

      self.postMessage({
        type: 'extract_result',
        success: true,
        data: { vector: descriptor, dimensions: 128, modelVersion: 'embedded-v1' },
      } as FaceSearchWorkerOutput);
    } else if (type === 'match') {
      const { targetVector, candidateVectors = [], threshold = 0.65 } = payload;
      if (!targetVector || targetVector.length === 0) {
        throw new Error('Target vector required for matching');
      }

      const matches = candidateVectors
        .map((candidate) => ({
          id: candidate.id,
          similarity: cosineSimilarity(targetVector, candidate.vector),
        }))
        .filter((item) => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);

      self.postMessage({
        type: 'match_result',
        success: true,
        data: { matches, totalEvaluated: candidateVectors.length },
      } as FaceSearchWorkerOutput);
    }
  } catch (err: any) {
    self.postMessage({
      type: 'error',
      success: false,
      error: err.message || 'Worker processing error',
    } as FaceSearchWorkerOutput);
  }
};
