// =============================================================================
// MAGIC SHOT VFX & SPATIAL MEDIA TYPES
// =============================================================================

export type MagicShotCategory = 'character_composite' | 'atmospheric_vfx' | 'ride_action_burst' | 'spatial_3d_portal' | 'seasonal_holiday';

export type MagicShotLayerType = 'background' | 'foreground_subject' | 'overlay_particle' | 'animated_character' | 'lighting_filter';

export interface MagicShotLayer {
  id: string;
  type: MagicShotLayerType;
  assetUrl: string;
  zIndex: number;
  opacity: number;
  blendMode?: 'normal' | 'screen' | 'multiply' | 'overlay' | 'lighten';
  position: {
    x: number; // Normalized 0.0 to 1.0
    y: number; // Normalized 0.0 to 1.0
    scale: number;
    rotationDeg?: number;
  };
  animationTimeline?: {
    durationSec: number;
    loop: boolean;
    keyframes?: Array<{
      time: number;
      x: number;
      y: number;
      scale: number;
      opacity: number;
    }>;
  };
}

export interface MagicShotTemplate {
  id: string;
  destinationId: string;
  attractionId?: string;
  name: string;
  description: string;
  category: MagicShotCategory;
  thumbnailUrl: string;
  samplePreviewUrl: string;
  layers: MagicShotLayer[];
  requiredPoseGuidance?: string;
  depthThreshold?: number; // 0.0 to 1.0 for foreground subject separation
  watermarkEnabled: boolean;
  premiumUpsellPriceCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepthMapMetadata {
  depthMapUrl: string;
  nearPlane: number;
  farPlane: number;
  focalLengthPx?: number;
  monocularModelVersion: string;
  confidenceScore: number;
}

export interface MagicShotRenderRequest {
  photoId: string;
  albumId: string;
  destinationId: string;
  templateId: string;
  sourcePhotoUrl: string;
  guestId?: string;
  renderVideoReel?: boolean;
  resolution?: '1080p' | '4k';
}

export interface MagicShotRenderResult {
  renderId: string;
  photoId: string;
  templateId: string;
  outputImageUrl: string;
  outputVideoReelUrl?: string;
  depthMetadata?: DepthMapMetadata;
  renderDurationMs: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

export interface SpatialMediaPayload {
  photoId: string;
  baseImageUrl: string;
  depthMapUrl: string;
  parallaxIntensity: number;
  aspectRatio: number;
  magicShotTemplateId?: string;
}
