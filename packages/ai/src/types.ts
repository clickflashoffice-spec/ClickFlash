export interface FaceVector {
  dimensions: number;
  data: Float32Array | number[];
  modelVersion: string;
}

export interface AIScore {
  sharpness: number;      // 0-100
  exposure: number;       // 0-100
  composition: number;    // 0-100
  overall: number;        // 0-100
  faceCount: number;
  hasClosedEyes: boolean;
  isBlurry: boolean;
  grade: 'A+' | 'A' | 'B' | 'C' | 'REJECT';
  reason: string;
}

export interface EditParams {
  brightness: number;     // -100 to 100
  contrast: number;       // -100 to 100
  saturation: number;     // -100 to 100
  sharpness: number;      // 0 to 100
  temperature: number;    // -100 to 100 (cool to warm)
  tint: number;           // -100 to 100 (green to magenta)
  highlights: number;     // -100 to 100
  shadows: number;        // -100 to 100
  vibrance: number;       // -100 to 100
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  rotation: number;       // degrees
}

export interface TagResult {
  tags: string[];
  peopleCount: number;
  scene: string;
  mood: string;
  weather: string;
  timeOfDay: string;
  activities: string[];
  clothingColors: string[];
  accessories: string[];
  confidence: number;     // 0-1
}

export type CurationStatus = 'PENDING' | 'HIGHLIGHT' | 'APPROVED' | 'REJECTED';

export interface CurationResult {
  photoId: string;
  status: CurationStatus;
  score: AIScore;
  tags: TagResult;
  processedAt: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: 'gemini-2.0-flash' | 'gemini-2.0-pro' | 'gemini-1.5-flash';
  maxTokens?: number;
  temperature?: number;
}

export interface AIOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
  model: string;
  tokensUsed?: number;
}

export interface QualityGateEvaluation {
  passed: boolean;
  brandSafetyScore: number;
  hallucinationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  approvalRequired: boolean;
  routing: 'AUTO_PUBLISH' | 'HITL_REVIEW' | 'REJECT';
  violations: string[];
  tokenCostEstimate: {
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
  };
}

export interface QualityGateOptions {
  bannedTerms?: RegExp[];
  requiredKeywords?: RegExp[];
  maxDailySpendUsd?: number;
  maxDailyBudgetUsd?: number;
  currentDailySpendUsd?: number;
  costPer1kInputTokens?: number;
  costPer1kOutputTokens?: number;
  minBrandSafetyScore?: number;
}


