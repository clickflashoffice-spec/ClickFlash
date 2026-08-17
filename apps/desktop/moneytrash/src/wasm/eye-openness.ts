/**
 * ClickFlash V7.0 - Eye-Openness & Blink Scoring Engine
 * 
 * Mathematical computer vision evaluation of Eye Aspect Ratio (EAR):
 * - Formula: EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 * - Calibrated ocular opening curve mapping to 0-100 score
 * - Micro-expression classification: OPEN, SQUINT, WINK, BLINK_CLOSED
 * - Group photo multi-subject ocular synchronization check
 */

import type { EyeOpennessMetrics, EyeState, Point2D } from './types';

export class EyeOpennessAnalyzer {
  // Calibrated EAR thresholds based on empirical biometric testing
  private static readonly EAR_OPEN_THRESHOLD = 0.27;
  private static readonly EAR_SQUINT_THRESHOLD = 0.20;
  private static readonly EAR_CLOSED_THRESHOLD = 0.16;

  /**
   * Computes Eye Aspect Ratio (EAR) for a 6-point eye landmark polygon.
   * Point order:
   * p0: lateral corner (outer)
   * p1: top lid outer
   * p2: top lid inner
   * p3: medial corner (inner)
   * p4: bottom lid inner
   * p5: bottom lid outer
   */
  public computeEyeAspectRatio(eyePoints: Point2D[]): number {
    if (eyePoints.length < 6) return 0;

    const p0 = eyePoints[0];
    const p1 = eyePoints[1];
    const p2 = eyePoints[2];
    const p3 = eyePoints[3];
    const p4 = eyePoints[4];
    const p5 = eyePoints[5];

    // Vertical distances
    const v1 = Math.hypot(p1.x - p5.x, p1.y - p5.y);
    const v2 = Math.hypot(p2.x - p4.x, p2.y - p4.y);

    // Horizontal distance
    const h = Math.hypot(p0.x - p3.x, p0.y - p3.y);

    if (h === 0) return 0;
    const ear = (v1 + v2) / (2.0 * h);
    return Number(ear.toFixed(4));
  }

  /**
   * Maps EAR value to a calibrated 0-100 openness score.
   */
  public earToScore(ear: number): number {
    if (ear <= EyeOpennessAnalyzer.EAR_CLOSED_THRESHOLD) {
      // Closed / mid-blink range (0 - 25)
      return Math.min(25, Math.max(0, Math.round((ear / EyeOpennessAnalyzer.EAR_CLOSED_THRESHOLD) * 25)));
    } else if (ear < EyeOpennessAnalyzer.EAR_SQUINT_THRESHOLD) {
      // Half-closed / severe squint range (26 - 59)
      const range = EyeOpennessAnalyzer.EAR_SQUINT_THRESHOLD - EyeOpennessAnalyzer.EAR_CLOSED_THRESHOLD;
      const progress = (ear - EyeOpennessAnalyzer.EAR_CLOSED_THRESHOLD) / range;
      return Math.round(26 + progress * 33);
    } else if (ear < EyeOpennessAnalyzer.EAR_OPEN_THRESHOLD) {
      // Natural squint / smiling eye range (60 - 84)
      const range = EyeOpennessAnalyzer.EAR_OPEN_THRESHOLD - EyeOpennessAnalyzer.EAR_SQUINT_THRESHOLD;
      const progress = (ear - EyeOpennessAnalyzer.EAR_SQUINT_THRESHOLD) / range;
      return Math.round(60 + progress * 24);
    } else {
      // Fully open / alert eyes (85 - 100)
      const excess = Math.min(0.12, ear - EyeOpennessAnalyzer.EAR_OPEN_THRESHOLD);
      return Math.min(100, Math.round(85 + (excess / 0.12) * 15));
    }
  }

  /**
   * Analyzes left and right 6-point eye contours and returns comprehensive metrics.
   */
  public analyzeEyeLandmarks(leftEyePoints: Point2D[], rightEyePoints: Point2D[]): EyeOpennessMetrics {
    const leftEAR = this.computeEyeAspectRatio(leftEyePoints);
    const rightEAR = this.computeEyeAspectRatio(rightEyePoints);

    const leftEyeOpennessScore = this.earToScore(leftEAR);
    const rightEyeOpennessScore = this.earToScore(rightEAR);

    const combinedEyeScore = Math.round((leftEyeOpennessScore + rightEyeOpennessScore) / 2);

    let eyeState: EyeState = 'OPEN';
    const leftClosed = leftEyeOpennessScore < 45;
    const rightClosed = rightEyeOpennessScore < 45;
    const isWink = (leftClosed && !rightClosed) || (!leftClosed && rightClosed);

    if (leftClosed && rightClosed) {
      eyeState = 'BLINK_CLOSED';
    } else if (isWink) {
      eyeState = 'WINK';
    } else if (leftEyeOpennessScore < 70 || rightEyeOpennessScore < 70) {
      eyeState = 'SQUINT';
    } else {
      eyeState = 'OPEN';
    }

    const areBothEyesOpen = leftEyeOpennessScore >= 60 && rightEyeOpennessScore >= 60;

    return {
      leftEyeAspectRatio: leftEAR,
      rightEyeAspectRatio: rightEAR,
      leftEyeOpennessScore,
      rightEyeOpennessScore,
      combinedEyeScore,
      eyeState,
      areBothEyesOpen
    };
  }

  /**
   * Generates synthetic 6-point eye contour points for testing.
   */
  public createSyntheticEyePoints(
    centerX: number,
    centerY: number,
    eyeWidth: number,
    openingRatio = 0.32 // 0.32 = open, 0.12 = closed blink
  ): Point2D[] {
    const halfW = eyeWidth / 2;
    const halfH = (eyeWidth * openingRatio) / 2;

    return [
      { x: centerX - halfW, y: centerY },                 // p0: outer corner
      { x: centerX - halfW * 0.5, y: centerY - halfH },   // p1: top lid outer
      { x: centerX + halfW * 0.5, y: centerY - halfH },   // p2: top lid inner
      { x: centerX + halfW, y: centerY },                 // p3: inner corner
      { x: centerX + halfW * 0.5, y: centerY + halfH },   // p4: bottom lid inner
      { x: centerX - halfW * 0.5, y: centerY + halfH },   // p5: bottom lid outer
    ];
  }

  /**
   * Aggregates eye scores across all detected faces in a group photograph.
   * A group shot is rejected if any key subject has closed eyes.
   */
  public evaluateGroupEyeReadiness(faceEyeMetrics: EyeOpennessMetrics[]): {
    allSubjectsOpen: boolean;
    lowestEyeScore: number;
    averageEyeScore: number;
    blinkCount: number;
  } {
    if (faceEyeMetrics.length === 0) {
      return {
        allSubjectsOpen: true,
        lowestEyeScore: 100,
        averageEyeScore: 100,
        blinkCount: 0
      };
    }

    let sum = 0;
    let minScore = 100;
    let blinkCount = 0;

    for (const m of faceEyeMetrics) {
      sum += m.combinedEyeScore;
      if (m.combinedEyeScore < minScore) minScore = m.combinedEyeScore;
      if (m.eyeState === 'BLINK_CLOSED' || !m.areBothEyesOpen) blinkCount++;
    }

    const averageEyeScore = Math.round(sum / faceEyeMetrics.length);
    const allSubjectsOpen = blinkCount === 0 && minScore >= 55;

    return {
      allSubjectsOpen,
      lowestEyeScore: minScore,
      averageEyeScore,
      blinkCount
    };
  }
}

export const eyeOpennessAnalyzer = new EyeOpennessAnalyzer();
