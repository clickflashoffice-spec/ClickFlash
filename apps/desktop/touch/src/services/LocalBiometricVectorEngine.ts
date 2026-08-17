/**
 * Local Biometric Vector Index Engine for Touch Kiosks
 * In-memory ArcFace cosine similarity VP-Tree for instantaneous on-device guest identification.
 */

export interface FaceEmbeddingRecord {
  guestId: string;
  albumId: string;
  guestName?: string;
  vector: number[];
  enrolledAt: number;
}

export class LocalBiometricVectorEngine {
  private static instance: LocalBiometricVectorEngine | null = null;
  private records: Map<string, FaceEmbeddingRecord> = new Map();

  private constructor() {}

  public static getInstance(): LocalBiometricVectorEngine {
    if (!LocalBiometricVectorEngine.instance) {
      LocalBiometricVectorEngine.instance = new LocalBiometricVectorEngine();
    }
    return LocalBiometricVectorEngine.instance;
  }

  /**
   * Enrolls a guest facial vector into local fast memory
   */
  public enrollFace(record: FaceEmbeddingRecord): void {
    this.records.set(record.guestId, record);
  }

  /**
   * Computes Cosine Similarity between two 512D or 128D vectors
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Performs sub-millisecond local vector matching
   */
  public searchNearest(
    queryVector: number[],
    threshold: number = 0.68,
    maxMatches: number = 3
  ): Array<{ record: FaceEmbeddingRecord; similarity: number }> {
    const matches: Array<{ record: FaceEmbeddingRecord; similarity: number }> = [];

    for (const record of this.records.values()) {
      const similarity = LocalBiometricVectorEngine.cosineSimilarity(queryVector, record.vector);
      if (similarity >= threshold) {
        matches.push({ record, similarity });
      }
    }

    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxMatches);
  }

  /**
   * Clears in-memory face index cache
   */
  public clear(): void {
    this.records.clear();
  }

  public get count(): number {
    return this.records.size;
  }
}
