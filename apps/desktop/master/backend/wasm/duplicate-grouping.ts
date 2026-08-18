/**
 * ClickFlash V7.0 - Duplicate Shot Grouping & Burst Clustering Engine
 * 
 * High-speed perceptual visual hashing and intelligent burst curation:
 * - 64-bit Gradient Difference Hash (dHash) & Average Hash (aHash)
 * - Temporal Burst Clustering (millisecond-window grouping)
 * - Intra-Group Hero Selection (Sharpness, Eye Openness, Head Pose, Smile)
 * - Redundancy Culling & Emotional Memory Rescue
 */

import type {
  DuplicateGroup,
  EvaluatedShot,
  PerceptualHash,
} from './types';

export class DuplicateGroupingEngine {
  /**
   * Computes 64-bit Difference Hash (dHash) from a 9x8 grayscale image buffer.
   * 
   * @param smallGrayscale 72-byte Uint8Array (9 columns x 8 rows)
   */
  public computeDHashFrom9x8(smallGrayscale: Uint8Array): string {
    if (smallGrayscale.length < 72) {
      return '0000000000000000';
    }

    let binaryString = '';
    // 8 rows, each row has 9 columns => 8 comparisons per row = 64 bits total
    for (let row = 0; row < 8; row++) {
      const rowOffset = row * 9;
      for (let col = 0; col < 8; col++) {
        const leftPixel = smallGrayscale[rowOffset + col];
        const rightPixel = smallGrayscale[rowOffset + col + 1];
        binaryString += leftPixel < rightPixel ? '1' : '0';
      }
    }

    // Convert 64-bit binary string to 16-character hex string
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = binaryString.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }
    return hex.padStart(16, '0');
  }

  /**
   * Computes 64-bit Average Hash (aHash) from an 8x8 grayscale image buffer.
   * 
   * @param smallGrayscale 64-byte Uint8Array (8 columns x 8 rows)
   */
  public computeAHashFrom8x8(smallGrayscale: Uint8Array): string {
    if (smallGrayscale.length < 64) {
      return '0000000000000000';
    }

    let sum = 0;
    for (let i = 0; i < 64; i++) {
      sum += smallGrayscale[i];
    }
    const mean = sum / 64;

    let binaryString = '';
    for (let i = 0; i < 64; i++) {
      binaryString += smallGrayscale[i] >= mean ? '1' : '0';
    }

    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = binaryString.substring(i, i + 4);
      hex += parseInt(nibble, 2).toString(16);
    }
    return hex.padStart(16, '0');
  }

  /**
   * Fast Perceptual Hash generator from filename / simulated inputs.
   */
  public generateHashFromMetadata(photoId: string, timestampMs: number): PerceptualHash {
    let hashVal = 0;
    for (let i = 0; i < photoId.length; i++) {
      hashVal = (hashVal << 5) - hashVal + photoId.charCodeAt(i);
      hashVal |= 0;
    }
    
    // Group near-timestamp photos to share similar high bits
    const timeCluster = Math.floor(timestampMs / 3000);
    const combined = Math.abs(hashVal ^ timeCluster);
    
    const hex1 = combined.toString(16).padStart(8, '0');
    const hex2 = ((combined * 31) >>> 0).toString(16).padStart(8, '0');
    const dHash = `${hex1}${hex2}`;
    const aHash = `${hex2}${hex1}`;
    const pHash = `${hex1.split('').reverse().join('')}${hex2}`;

    return { dHash, aHash, pHash };
  }

  /**
   * Computes Hamming Distance between two 16-character hex hashes (64-bit space).
   * Result: 0 (identical) to 64 (completely opposite).
   */
  public computeHammingDistance(hexA: string, hexB: string): number {
    if (hexA.length !== hexB.length) return 64;

    let distance = 0;
    for (let i = 0; i < hexA.length; i++) {
      const valA = parseInt(hexA[i], 16) || 0;
      const valB = parseInt(hexB[i], 16) || 0;
      let xor = valA ^ valB;
      // Count set bits
      while (xor > 0) {
        distance += xor & 1;
        xor >>= 1;
      }
    }
    return distance;
  }

  /**
   * Computes similarity percentage from Hamming distance (0.0 to 1.0).
   */
  public computeSimilarity(hexA: string, hexB: string): number {
    const dist = this.computeHammingDistance(hexA, hexB);
    return Number(Math.max(0, 1 - dist / 64).toFixed(3));
  }

  /**
   * Clusters evaluated shots into duplicate burst groups and selects the best hero shot per group.
   * 
   * @param shots List of evaluated shots
   * @param hammingThreshold Max Hamming distance to be considered a duplicate (default: 10)
   * @param burstWindowMs Max timestamp difference in ms for temporal burst grouping (default: 3000ms)
   */
  public groupDuplicates(
    shots: EvaluatedShot[],
    hammingThreshold = 10,
    burstWindowMs = 3000
  ): DuplicateGroup[] {
    if (shots.length === 0) return [];

    // Sort temporally
    const sorted = [...shots].sort((a, b) => a.timestampMs - b.timestampMs);
    const groups: DuplicateGroup[] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (assigned.has(current.photoId)) continue;

      const cluster: EvaluatedShot[] = [current];
      assigned.add(current.photoId);

      for (let j = i + 1; j < sorted.length; j++) {
        const candidate = sorted[j];
        if (assigned.has(candidate.photoId)) continue;

        const timeDiff = Math.abs(candidate.timestampMs - current.timestampMs);
        if (timeDiff > burstWindowMs) break; // Exceeded temporal burst window

        const dist = this.computeHammingDistance(current.perceptualHash.dHash, candidate.perceptualHash.dHash);
        if (dist <= hammingThreshold) {
          cluster.push(candidate);
          assigned.add(candidate.photoId);
        }
      }

      // Rank shots inside this cluster to select the Hero Shot
      const ranked = this.rankBurstCluster(cluster);
      const heroShotId = ranked[0].photoId;

      // Update cull recommendations for intra-group shots
      for (let k = 0; k < ranked.length; k++) {
        const item = ranked[k];
        if (k === 0) {
          if (item.cullRecommendation === 'EMOTIONAL_RESCUE') {
            // Preserve emotional rescue status
            item.isHeroCandidate = true;
          } else if (item.cullRecommendation === 'DISCARD_DEFECT') {
            // Preserve defect status
            item.isHeroCandidate = false;
          } else {
            item.cullRecommendation = 'KEEP_HERO';
            item.cullReason = 'Selected as peak quality Hero shot of the burst series.';
            item.isHeroCandidate = true;
          }
        } else if (item.cullRecommendation === 'EMOTIONAL_RESCUE') {
          // Keep emotional rescue
        } else if (k === 1 && cluster.length >= 4 && item.compositeQualityScore >= 70) {
          item.cullRecommendation = 'KEEP_SECONDARY';
          item.cullReason = 'Kept as secondary alternate angle/moment from high-speed burst.';
        } else if (item.blurMetrics.sharpnessScore < 40 || item.cullRecommendation === 'DISCARD_DEFECT') {
          item.cullRecommendation = 'DISCARD_DEFECT';
          item.cullReason = 'Discarded: Sub-threshold sharpness or defect in burst comparison.';
        } else {
          item.cullRecommendation = 'DISCARD_DUPLICATE';
          item.cullReason = `Discarded: Near-duplicate of Hero shot (${heroShotId}) with lower quality score.`;
        }
      }

      const minTimestamp = Math.min(...cluster.map(c => c.timestampMs));
      const maxTimestamp = Math.max(...cluster.map(c => c.timestampMs));
      const burstDurationMs = maxTimestamp - minTimestamp;

      // Calculate average pairwise similarity
      let totalSim = 0;
      let pairCount = 0;
      for (let a = 0; a < cluster.length; a++) {
        for (let b = a + 1; b < cluster.length; b++) {
          totalSim += this.computeSimilarity(cluster[a].perceptualHash.dHash, cluster[b].perceptualHash.dHash);
          pairCount++;
        }
      }
      const similarityScore = pairCount > 0 ? Number((totalSim / pairCount).toFixed(3)) : 1.0;

      const keepCount = cluster.filter(c => c.cullRecommendation === 'KEEP_HERO' || c.cullRecommendation === 'KEEP_SECONDARY' || c.cullRecommendation === 'EMOTIONAL_RESCUE').length;

      groups.push({
        groupId: `burst-grp-${current.photoId}-${i}`,
        shots: ranked,
        heroShotId,
        similarityScore,
        burstDurationMs,
        totalShots: cluster.length,
        recommendedKeepCount: keepCount
      });
    }

    return groups;
  }

  /**
   * Ranks shots in a burst cluster based on multi-factor quality:
   * - Sharpness (35%)
   * - Eye Openness (25%)
   * - Head Pose Frontality (20%)
   * - Smile Intensity (20%)
   */
  public rankBurstCluster(cluster: EvaluatedShot[]): EvaluatedShot[] {
    return [...cluster].sort((a, b) => {
      // 1. Defect shots (closed eyes or blurry) are penalized heavily
      const aHasBlink = a.faces.some(f => f.eyes.eyeState === 'BLINK_CLOSED');
      const bHasBlink = b.faces.some(f => f.eyes.eyeState === 'BLINK_CLOSED');
      if (aHasBlink && !bHasBlink) return 1;
      if (!aHasBlink && bHasBlink) return -1;

      // 2. Compare Composite Quality Score
      return b.compositeQualityScore - a.compositeQualityScore;
    });
  }
}

export const duplicateGroupingEngine = new DuplicateGroupingEngine();
