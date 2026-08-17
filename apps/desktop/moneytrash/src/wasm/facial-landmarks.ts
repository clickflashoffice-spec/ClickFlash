/**
 * ClickFlash V7.0 - Facial Landmark Orientation & Pose Analysis
 * 
 * 3D Head Pose Angle (Pitch, Yaw, Roll) estimation from 2D facial landmarks:
 * - 5-Point Core Landmarks (Eyes, Nose Tip, Mouth Corners)
 * - 68-Point Dense Dlib-compatible Landmarks
 * - Frontality & Eye-Line Alignment Scoring (0-100)
 * - Profile / Turn-Away / Back-of-Head Detection
 */

import type { FaceLandmarks5, FaceLandmarks68, HeadPoseAngles, Point2D } from './types';

export class FacialLandmarkAnalyzer {
  /**
   * Estimates 3D Head Pose (Pitch, Yaw, Roll) from 5-point facial landmarks.
   */
  public estimatePoseFrom5Points(landmarks: FaceLandmarks5): HeadPoseAngles {
    const { leftEyeCenter, rightEyeCenter, noseTip, leftMouthCorner, rightMouthCorner } = landmarks;

    // 1. Roll Angle (Tilt in image plane)
    const deltaX = rightEyeCenter.x - leftEyeCenter.x;
    const deltaY = rightEyeCenter.y - leftEyeCenter.y;
    const rollRad = Math.atan2(deltaY, deltaX);
    const roll = Number((rollRad * (180 / Math.PI)).toFixed(1));

    // 2. Yaw Angle (Turn left/right)
    // Distance from left eye to nose vs right eye to nose
    const distLeftEyeToNose = Math.hypot(noseTip.x - leftEyeCenter.x, noseTip.y - leftEyeCenter.y);
    const distRightEyeToNose = Math.hypot(rightEyeCenter.x - noseTip.x, rightEyeCenter.y - noseTip.y);
    const eyeSpan = Math.hypot(deltaX, deltaY);

    let yaw = 0;
    if (eyeSpan > 0) {
      const asymmetryRatio = (distRightEyeToNose - distLeftEyeToNose) / eyeSpan;
      // Map ratio to degrees (~ -75 to +75 deg)
      yaw = Number((asymmetryRatio * 75).toFixed(1));
    }

    // 3. Pitch Angle (Nod up/down)
    const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
    const mouthCenterY = (leftMouthCorner.y + rightMouthCorner.y) / 2;
    const eyeToNoseDist = noseTip.y - eyeCenterY;
    const noseToMouthDist = mouthCenterY - noseTip.y;
    const totalFaceHeight = mouthCenterY - eyeCenterY;

    let pitch = 0;
    if (totalFaceHeight > 0) {
      // Golden ratio vertical proportion is ~ 0.52 / 0.48
      const verticalRatio = (eyeToNoseDist - noseToMouthDist) / totalFaceHeight;
      pitch = Number((verticalRatio * 55).toFixed(1));
    }

    return this.classifyPose(pitch, yaw, roll);
  }

  /**
   * Estimates 3D Head Pose from dense 68-point facial landmarks.
   */
  public estimatePoseFrom68Points(landmarks: FaceLandmarks68): HeadPoseAngles {
    const leftEyeCenter = this.computeCentroid(landmarks.leftEye);
    const rightEyeCenter = this.computeCentroid(landmarks.rightEye);
    const noseTip = landmarks.noseTip[2] || landmarks.noseTip[0]; // Point 33 or 30
    const leftMouthCorner = landmarks.outerLips[0]; // Point 48
    const rightMouthCorner = landmarks.outerLips[6]; // Point 54

    return this.estimatePoseFrom5Points({
      leftEyeCenter,
      rightEyeCenter,
      noseTip,
      leftMouthCorner,
      rightMouthCorner
    });
  }

  /**
   * Classifies pose category and computes frontality score (0 - 100).
   */
  public classifyPose(pitch: number, yaw: number, roll: number): HeadPoseAngles {
    const absYaw = Math.abs(yaw);
    const absPitch = Math.abs(pitch);
    const absRoll = Math.abs(roll);

    // Frontality score drops quadratically as head turns away from camera
    const yawPenalty = Math.pow(absYaw / 40, 1.8) * 55;
    const pitchPenalty = Math.pow(absPitch / 35, 1.6) * 30;
    const rollPenalty = Math.pow(absRoll / 30, 1.4) * 15;

    const totalPenalty = yawPenalty + pitchPenalty + rollPenalty;
    const frontalityScore = Math.min(100, Math.max(0, Math.round(100 - totalPenalty)));

    let poseCategory: HeadPoseAngles['poseCategory'] = 'FRONTAL';
    if (absYaw > 55 || absPitch > 50) {
      poseCategory = 'BACK_OF_HEAD';
    } else if (absYaw > 28) {
      poseCategory = 'PROFILE';
    } else if (absRoll > 25) {
      poseCategory = 'EXTREME_TILT';
    } else if (absYaw > 12 || absPitch > 12) {
      poseCategory = 'SLIGHT_ANGLE';
    }

    return {
      pitch,
      yaw,
      roll,
      frontalityScore,
      poseCategory
    };
  }

  /**
   * Helper to compute polygon centroid.
   */
  private computeCentroid(points: Point2D[]): Point2D {
    if (points.length === 0) return { x: 0, y: 0 };
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }

  /**
   * Generates ideal frontal 5-point landmarks inside a bounding box for synthetic testing.
   */
  public createSyntheticFrontalLandmarks(boxX: number, boxY: number, boxW: number, boxH: number): FaceLandmarks5 {
    return {
      leftEyeCenter: { x: boxX + boxW * 0.32, y: boxY + boxH * 0.38 },
      rightEyeCenter: { x: boxX + boxW * 0.68, y: boxY + boxH * 0.38 },
      noseTip: { x: boxX + boxW * 0.50, y: boxY + boxH * 0.58 },
      leftMouthCorner: { x: boxX + boxW * 0.36, y: boxY + boxH * 0.76 },
      rightMouthCorner: { x: boxX + boxW * 0.64, y: boxY + boxH * 0.76 }
    };
  }

  /**
   * Generates synthetic turned-away/profile landmarks for test validation.
   */
  public createSyntheticProfileLandmarks(boxX: number, boxY: number, boxW: number, boxH: number, turnDirection: 'left' | 'right'): FaceLandmarks5 {
    const isLeft = turnDirection === 'left';
    return {
      leftEyeCenter: { x: boxX + (isLeft ? boxW * 0.10 : boxW * 0.40), y: boxY + boxH * 0.38 },
      rightEyeCenter: { x: boxX + (isLeft ? boxW * 0.50 : boxW * 0.90), y: boxY + boxH * 0.38 },
      noseTip: { x: boxX + (isLeft ? boxW * 0.15 : boxW * 0.85), y: boxY + boxH * 0.58 },
      leftMouthCorner: { x: boxX + (isLeft ? boxW * 0.18 : boxW * 0.45), y: boxY + boxH * 0.76 },
      rightMouthCorner: { x: boxX + (isLeft ? boxW * 0.45 : boxW * 0.80), y: boxY + boxH * 0.76 }
    };
  }
}

export const facialLandmarkAnalyzer = new FacialLandmarkAnalyzer();
