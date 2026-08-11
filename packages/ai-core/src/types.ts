export interface AIQualityScore {
  sharpness: number; // Laplacian variance
  eyeOpennessScore: number; // EAR ratio (0-1)
  smileScore: number; // Mouth geometry (0-1)
  exposureScore: number; // Histogram check (0-1)
  overallQuality: number; // 1-100 score
  autoStarRating: 1 | 2 | 3 | 4 | 5;
  isBlurry: boolean;
  hasBlinks: boolean;
  facesDetected: number;
}

export interface FaceEmbeddingVector {
  dimensions: 128 | 512;
  vector: number[];
  modelName: 'MobileNetV2' | 'InsightFaceArcFace' | 'MediaPipeMesh';
  confidence: number;
  extractedAt: number;
}

export type AlbumCategory = 
  | 'BEST_SMILES' 
  | 'GROUP_SHOTS' 
  | 'ACTION_MOMENTS' 
  | 'GOLDEN_HOUR' 
  | 'CANDID_MOMENTS';

export interface SmartAlbumItem {
  id: string;
  category: AlbumCategory;
  title: string;
  subtitle: string;
  coverImageUri: string;
  photoCount: number;
  qualityScore: number;
}

export type QualityVerdictType = 'PASS' | 'WARN_BLUR' | 'WARN_BLINK' | 'WARN_EXPOSURE' | 'CRITICAL_DEFECT';

export interface PhotoInsuranceResult {
  photoId: string;
  verdict: QualityVerdictType;
  isInsured: boolean;
  laplacianScore: number;
  earBlinkRatio: number;
  exposureScore: number;
  overallConfidence: number;
  recommendedAction?: string;
  timestamp: number;
}

export interface SentinelTelemetry {
  masterOnline: boolean;
  lastHeartbeat: number;
  bufferedPhotosCount: number;
  journalEntriesCount: number;
  gpuVramUsageMb?: number;
  cpuLoadPercent?: number;
  isThrottled: boolean;
  uptimeSeconds: number;
}

