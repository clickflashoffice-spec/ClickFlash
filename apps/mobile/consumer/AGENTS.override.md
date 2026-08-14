# Mobile Customer App Override Rules

> **Target**: `apps/mobile-customer` (Expo React Native, Camera + Face AI)

## Domain Context
Customer-facing mobile application.

## Specific Constraints
- **Camera/AI**: Integrates Expo SDK `CameraView` with on-device TensorFlow.js for 128D face vector extraction.
- **Privacy**: Face data extraction must happen purely on-device without sending images to the cloud for processing.

## AI Instructions
Prioritize mobile-first UI patterns, strict permission handling for cameras, and optimized TensorFlow.js execution to prevent UI thread blocking.
