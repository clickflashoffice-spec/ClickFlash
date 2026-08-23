# ADR-009: Generative Media & 2D-to-3D Figurine Pipeline

## Status
Accepted

## Context
Standard 2D photo prints have declining novelty and low margins. Guests increasingly demand viral social media assets (reels, TikTok slideshows) and premium high-margin physical collectibles (custom 3D figurines, holographic displays). Traditional 3D capture requires expensive multi-camera photogrammetry booths ($50k+ each) that are impractical for field photographers.

## Decision
ClickFlash implements an automated AI Generative Media Pipeline:

1. **2D-to-3D Single-Shot / Multi-Angle Mesh Generation**:
   - Converts standard 2D resort photos into watertight `.OBJ`/`.STL` 3D meshes using generative depth estimation and neural radiance / diffusion priors.
   - Normalizes poses, removes background artifacts, and inspects mesh topology for 3D printing feasibility.
2. **Holographic 3D Web Gallery Display**:
   - The Guest Gallery (`apps/gallery`) natively renders real-time 3D models using Three.js / WebGL with holographic depth shaders and AR Quick Look for iOS/Android.
3. **Automated Print-Farm Fulfillment API**:
   - Dispatches validated watertight 3D models directly to binder-jet and full-color resin 3D printing fulfillment partners for physical drop-shipping.
4. **Beat-Matched Social Reels Curation**:
   - Automatically assembles 9:16 vertical video reels synchronizing photo transitions to upbeat music tracks with animated transitions and brand watermarks.

## Consequences
- **Positive**:
  - Unlocks $49-$149 high-margin 3D figurine SKUs with zero hardware photogrammetry booth CapEx.
  - Viral social sharing via automated beat-matched reels driving organic resort promotion.
- **Negative**:
  - Generative 3D reconstruction requires cloud GPU processing (5-15s per model).
  - Physical 3D fulfillment introduces 3-5 day shipping lead times requiring guest order tracking.
