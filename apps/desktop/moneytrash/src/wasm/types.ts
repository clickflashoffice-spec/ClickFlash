/**
 * ClickFlash V7.0 - WASM & AI Culling Pipeline Types
 * 
 * High-performance data contracts for edge vision processing:
 * - Blur detection & multi-scale gradient analysis
 * - Facial landmark orientation (Pitch, Yaw, Roll)
 * - Eye-openness & Eye Aspect Ratio (EAR) scoring
 * - Perceptual hashing & duplicate burst grouping
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// 1. BLUR & SHARPNESS DETECTION
// ============================================================================

export type BlurMethod = 'laplacian_variance' | 'tenengrad_gradient' | 'frequency_fft' | 'composite';

export interface BlurMetrics {
  /** Laplacian variance of luminance channel (0-100 scale normalized) */
  laplacianVarianceScore: number;
  /** Tenengrad gradient energy metric (0-100) */
  tenengradScore: number;
  /** High frequency energy density (0-100) */
  highFrequencyEnergy: number;
  /** Composite overall sharpness score (0-100) */
  sharpnessScore: number;
  /** Motion blur score (100 - sharpnessScore) */
  blurScore: number;
  /** Subject / Face ROI sharpness vs background sharpness ratio */
  subjectBackgroundContrast: number;
  /** Whether the image passes the sharpness threshold */
  isSharp: boolean;
}

// ============================================================================
// 2. FACIAL LANDMARKS & HEAD POSE ORIENTATION
// ============================================================================

export interface EyeLandmarks {
  leftCorner: Point2D;
  rightCorner: Point2D;
  topLid1: Point2D;
  topLid2: Point2D;
  bottomLid1: Point2D;
  bottomLid2: Point2D;
  pupil?: Point2D;
}

export interface FaceLandmarks68 {
  jawline: Point2D[];        // 17 points (0-16)
  rightEyebrow: Point2D[];   // 5 points (17-21)
  leftEyebrow: Point2D[];    // 5 points (22-26)
  noseBridge: Point2D[];     // 4 points (27-30)
  noseTip: Point2D[];        // 5 points (31-35)
  rightEye: Point2D[];       // 6 points (36-41)
  leftEye: Point2D[];        // 6 points (42-47)
  outerLips: Point2D[];      // 12 points (48-59)
  innerLips: Point2D[];      // 8 points (60-67)
}

export interface FaceLandmarks5 {
  leftEyeCenter: Point2D;
  rightEyeCenter: Point2D;
  noseTip: Point2D;
  leftMouthCorner: Point2D;
  rightMouthCorner: Point2D;
}

export interface HeadPoseAngles {
  /** Pitch angle in degrees: nod up (+), nod down (-) */
  pitch: number;
  /** Yaw angle in degrees: turn right (+), turn left (-) */
  yaw: number;
  /** Roll angle in degrees: tilt right (+), tilt left (-) */
  roll: number;
  /** Frontality score from 0 (extreme profile/back of head) to 100 (direct frontal gaze) */
  frontalityScore: number;
  /** Pose classification */
  poseCategory: 'FRONTAL' | 'SLIGHT_ANGLE' | 'PROFILE' | 'EXTREME_TILT' | 'BACK_OF_HEAD';
}

// ============================================================================
// 3. EYE-OPENNESS & BLINK SCORING
// ============================================================================

export type EyeState = 'OPEN' | 'SQUINT' | 'WINK' | 'BLINK_CLOSED';

export interface EyeOpennessMetrics {
  /** Left Eye Aspect Ratio (EAR) */
  leftEyeAspectRatio: number;
  /** Right Eye Aspect Ratio (EAR) */
  rightEyeAspectRatio: number;
  /** Left eye openness percentage (0-100) */
  leftEyeOpennessScore: number;
  /** Right eye openness percentage (0-100) */
  rightEyeOpennessScore: number;
  /** Combined eye openness score (0-100) */
  combinedEyeScore: number;
  /** Classified state of the eyes */
  eyeState: EyeState;
  /** True if both eyes are sufficiently open for commercial delivery */
  areBothEyesOpen: boolean;
}

export interface FaceAnalysisResult {
  faceId: string;
  boundingBox: BoundingBox;
  confidence: number;
  landmarks5?: FaceLandmarks5;
  landmarks68?: FaceLandmarks68;
  pose: HeadPoseAngles;
  eyes: EyeOpennessMetrics;
  faceSharpnessScore: number;
  smileScore: number;
  overallFaceQuality: number;
}

// ============================================================================
// 4. DUPLICATE & BURST SHOT GROUPING
// ============================================================================

export interface PerceptualHash {
  /** 64-bit Difference Hash (dHash) hex string */
  dHash: string;
  /** 64-bit Average Hash (aHash) hex string */
  aHash: string;
  /** 64-bit DCT-based Perceptual Hash (pHash) hex string */
  pHash: string;
}

export interface ShotMetadata {
  photoId: string;
  filePath: string;
  timestampMs: number;
  galleryId?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface EvaluatedShot extends ShotMetadata {
  blurMetrics: BlurMetrics;
  faces: FaceAnalysisResult[];
  perceptualHash: PerceptualHash;
  compositeQualityScore: number;
  isHeroCandidate: boolean;
  cullRecommendation: 'KEEP_HERO' | 'KEEP_SECONDARY' | 'EMOTIONAL_RESCUE' | 'DISCARD_DUPLICATE' | 'DISCARD_DEFECT';
  cullReason: string;
}

export interface DuplicateGroup {
  groupId: string;
  shots: EvaluatedShot[];
  heroShotId: string;
  similarityScore: number; // 0.0 - 1.0 (1.0 = identical)
  burstDurationMs: number;
  totalShots: number;
  recommendedKeepCount: number;
}

// ============================================================================
// 5. CULLING ENGINE OPTIONS & BATCH RESULT
// ============================================================================

export interface CullingOptions {
  /** Minimum sharpness threshold for non-action photos (default: 50) */
  minSharpnessScore?: number;
  /** Minimum eye openness threshold (default: 60) */
  minEyeOpennessScore?: number;
  /** Minimum frontality score for portrait photos (default: 45) */
  minFrontalityScore?: number;
  /** Maximum Hamming distance to consider two photos duplicates (default: 10 out of 64 bits) */
  duplicateHammingThreshold?: number;
  /** Maximum time window between shots to consider a burst (in ms, default: 3000ms) */
  burstWindowMs?: number;
  /** Enable emotional rescue bypass for joyful/action candid moments */
  enableEmotionalBypass?: boolean;
  /** Concurrency level for parallel analysis */
  concurrency?: number;
}

export interface CullingBatchResult {
  totalProcessed: number;
  heroCount: number;
  secondaryKeepCount: number;
  emotionalRescueCount: number;
  duplicateDiscardCount: number;
  defectDiscardCount: number;
  groups: DuplicateGroup[];
  evaluatedShots: EvaluatedShot[];
  durationMs: number;
  peakThroughputFps: number;
}
