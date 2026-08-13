export const AI_CONFIG = {
  // Active legacy/indexed contract. Changing this requires a separate
  // storage/index migration and backfill.
  FACE_VECTOR_DIMENSION_ACTIVE: 128 as const,
  // Intended future width; it is not active or indexed yet.
  FACE_VECTOR_DIMENSION_TARGET: 512 as const,
  SIMILARITY_THRESHOLD_DEFAULT: 0.68,
  BLUR_LAPLACIAN_THRESHOLD: 100.0,
  EAR_BLINK_THRESHOLD: 0.20,
  CULLING_STAR_RATING_THRESHOLDS: {
    FIVE_STAR: 85,
    FOUR_STAR: 70,
    THREE_STAR: 50,
    TWO_STAR: 30,
    ONE_STAR: 0,
  },
  MAX_ON_DEVICE_BATCH_SIZE: 16,
};
