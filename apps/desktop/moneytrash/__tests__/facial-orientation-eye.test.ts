/**
 * ClickFlash V7.0 - Facial Landmark Orientation & Eye-Openness Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { FacialLandmarkAnalyzer, facialLandmarkAnalyzer } from '../src/wasm/facial-landmarks';
import { EyeOpennessAnalyzer, eyeOpennessAnalyzer } from '../src/wasm/eye-openness';

describe('FacialLandmarkAnalyzer (3D Pose Angles & Frontality)', () => {
  const analyzer = new FacialLandmarkAnalyzer();

  it('correctly scores a perfectly frontal face with near 100% frontality', () => {
    const box = { x: 100, y: 100, width: 200, height: 200 };
    const landmarks = analyzer.createSyntheticFrontalLandmarks(box.x, box.y, box.width, box.height);

    const pose = analyzer.estimatePoseFrom5Points(landmarks);

    expect(pose.poseCategory).toBe('FRONTAL');
    expect(pose.frontalityScore).toBeGreaterThanOrEqual(90);
    expect(Math.abs(pose.yaw)).toBeLessThan(10);
    expect(Math.abs(pose.roll)).toBeLessThan(5);
  });

  it('detects profile and turned-away face orientations', () => {
    const box = { x: 100, y: 100, width: 200, height: 200 };
    const profileLandmarks = analyzer.createSyntheticProfileLandmarks(box.x, box.y, box.width, box.height, 'right');

    const pose = analyzer.estimatePoseFrom5Points(profileLandmarks);

    expect(pose.poseCategory).toBe('PROFILE');
    expect(pose.frontalityScore).toBeLessThan(65);
    expect(Math.abs(pose.yaw)).toBeGreaterThan(25);
  });

  it('detects severe roll tilt when head is heavily angled', () => {
    const landmarks = {
      leftEyeCenter: { x: 100, y: 120 },
      rightEyeCenter: { x: 200, y: 180 }, // 30+ degree roll tilt
      noseTip: { x: 150, y: 170 },
      leftMouthCorner: { x: 120, y: 220 },
      rightMouthCorner: { x: 180, y: 250 }
    };

    const pose = analyzer.estimatePoseFrom5Points(landmarks);

    expect(Math.abs(pose.roll)).toBeGreaterThan(20);
    expect(pose.frontalityScore).toBeLessThan(80);
  });

  it('estimates pose from 68-point landmarks correctly', () => {
    const landmarks68 = {
      jawline: Array(17).fill({ x: 0, y: 0 }),
      rightEyebrow: Array(5).fill({ x: 0, y: 0 }),
      leftEyebrow: Array(5).fill({ x: 0, y: 0 }),
      noseBridge: Array(4).fill({ x: 0, y: 0 }),
      noseTip: [{ x: 150, y: 150 }, { x: 150, y: 155 }, { x: 150, y: 160 }, { x: 145, y: 160 }, { x: 155, y: 160 }],
      leftEye: [{ x: 110, y: 120 }, { x: 120, y: 115 }, { x: 130, y: 115 }, { x: 140, y: 120 }, { x: 130, y: 125 }, { x: 120, y: 125 }],
      rightEye: [{ x: 160, y: 120 }, { x: 170, y: 115 }, { x: 180, y: 115 }, { x: 190, y: 120 }, { x: 180, y: 125 }, { x: 170, y: 125 }],
      outerLips: [{ x: 125, y: 210 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 175, y: 210 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
      innerLips: Array(8).fill({ x: 0, y: 0 })
    };

    const pose = analyzer.estimatePoseFrom68Points(landmarks68);

    expect(pose.frontalityScore).toBeGreaterThanOrEqual(80);
    expect(pose.poseCategory).toBe('FRONTAL');
  });
});

describe('EyeOpennessAnalyzer (Eye Aspect Ratio & Blink Classification)', () => {
  const analyzer = new EyeOpennessAnalyzer();

  it('computes high EAR and OPEN state for normal alert eyes', () => {
    const leftEye = analyzer.createSyntheticEyePoints(120, 100, 30, 0.35);
    const rightEye = analyzer.createSyntheticEyePoints(180, 100, 30, 0.35);

    const metrics = analyzer.analyzeEyeLandmarks(leftEye, rightEye);

    expect(metrics.eyeState).toBe('OPEN');
    expect(metrics.areBothEyesOpen).toBe(true);
    expect(metrics.leftEyeAspectRatio).toBeGreaterThan(0.25);
    expect(metrics.combinedEyeScore).toBeGreaterThanOrEqual(80);
  });

  it('classifies closed eyes as BLINK_CLOSED with low scores', () => {
    const leftEye = analyzer.createSyntheticEyePoints(120, 100, 30, 0.10); // closed
    const rightEye = analyzer.createSyntheticEyePoints(180, 100, 30, 0.10); // closed

    const metrics = analyzer.analyzeEyeLandmarks(leftEye, rightEye);

    expect(metrics.eyeState).toBe('BLINK_CLOSED');
    expect(metrics.areBothEyesOpen).toBe(false);
    expect(metrics.combinedEyeScore).toBeLessThan(35);
  });

  it('detects a single-eye WINK state correctly', () => {
    const leftEye = analyzer.createSyntheticEyePoints(120, 100, 30, 0.35); // open
    const rightEye = analyzer.createSyntheticEyePoints(180, 100, 30, 0.10); // closed

    const metrics = analyzer.analyzeEyeLandmarks(leftEye, rightEye);

    expect(metrics.eyeState).toBe('WINK');
    expect(metrics.leftEyeOpennessScore).toBeGreaterThanOrEqual(80);
    expect(metrics.rightEyeOpennessScore).toBeLessThan(35);
  });

  it('evaluates group photo eye readiness and flags photos with blinking guests', () => {
    const openGuest = analyzer.analyzeEyeLandmarks(
      analyzer.createSyntheticEyePoints(100, 100, 30, 0.32),
      analyzer.createSyntheticEyePoints(150, 100, 30, 0.32)
    );
    const blinkingGuest = analyzer.analyzeEyeLandmarks(
      analyzer.createSyntheticEyePoints(250, 100, 30, 0.08),
      analyzer.createSyntheticEyePoints(300, 100, 30, 0.08)
    );

    const groupResult = analyzer.evaluateGroupEyeReadiness([openGuest, blinkingGuest]);

    expect(groupResult.allSubjectsOpen).toBe(false);
    expect(groupResult.blinkCount).toBe(1);
    expect(groupResult.lowestEyeScore).toBeLessThan(35);
  });

  it('passes group photo eye readiness when all guests have open eyes', () => {
    const guest1 = analyzer.analyzeEyeLandmarks(
      analyzer.createSyntheticEyePoints(100, 100, 30, 0.32),
      analyzer.createSyntheticEyePoints(150, 100, 30, 0.32)
    );
    const guest2 = analyzer.analyzeEyeLandmarks(
      analyzer.createSyntheticEyePoints(250, 100, 30, 0.30),
      analyzer.createSyntheticEyePoints(300, 100, 30, 0.30)
    );

    const groupResult = analyzer.evaluateGroupEyeReadiness([guest1, guest2]);

    expect(groupResult.allSubjectsOpen).toBe(true);
    expect(groupResult.blinkCount).toBe(0);
    expect(groupResult.lowestEyeScore).toBeGreaterThanOrEqual(70);
  });
});
