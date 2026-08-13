# Mobile Pro App Override Rules

> **Target**: `apps/mobile-pro` (Expo React Native, Android D7000 Tether)

## Domain Context
Android-only field application that tethers to a Nikon D7000 via USB-OTG/PTP for immediate ingest and RAW/JPEG pairing.

## Specific Constraints
- **Platform**: Android ONLY. Stable package identity `com.clickflash.pro`. Requires API 26+.
- **Native Modules**: Heavy reliance on custom Kotlin Android USB Host/PTP modules (`camera-tether`).
- **Data Safety**: NEVER delete the camera-card original. Must preserve untouched original and generate deterministic recipes.
- **Architecture**: Roaming Capture-to-Delivery Automation. Uses destination-intent and receipt tables with checksum-bound proofs.

## AI Instructions
Focus on Android hardware integration (USB/PTP), SQLite durability on mobile, battery/thermal efficiency, and strict image integrity.
