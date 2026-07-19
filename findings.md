# Findings Log: ClickFlash Phase 19

## Architectural Findings & Current State

### 1. Mobile Photographer (`apps/mobile-photographer`)
- **Current Biometric Implementation (`ShiftService.ts`)**: Currently calls `verifyBiometrics()`, which invokes `LocalAuthentication.authenticateAsync({ promptMessage: 'Verify Identity for Shift', fallbackLabel: 'Use Passcode' })`. This only checks whether the person holding the phone can unlock the device (passcode or device owner's biometrics). It does **not** extract a face embedding/128D vector or verify identity against a registered photographer profile.
- **Sync Model (`SyncService.ts`)**: `ShiftService` logs `ShiftEvent` objects (`id`, `photographerId`, `type: 'CLOCK_IN' | 'CLOCK_OUT'`, `timestamp`, `latitude`, `longitude`, `biometricVerified`, `syncStatus`). It pushes them either directly to `cloud-backend` (`https://clickflash-api.yourdomain.workers.dev/api/shifts`) when online, or falls back to the Master PC LAN WebSocket/HTTP proxy (`http://${masterIp}:${port}/api/shifts/proxy`).

### 2. Cloud Backend (`apps/cloud-backend`)
- **Current Shift Schema & Routes (`schema.sql` and `src/index.ts`)**:
  - `shifts` table has columns: `id`, `photographer_id`, `type`, `timestamp`, `latitude`, `longitude`, `biometric_verified`.
  - API endpoints `/api/shifts` (`POST` and `GET`) currently store and retrieve raw shift events but lack filtering by `station_id` or storing `biometric_method`, `biometric_confidence`, and `face_vector_hash`.
  - Missing endpoints for face enrollment (`/api/photographers/enroll-face`).

### 3. Master Studio Core (`apps/master`)
- **Existing Face Capabilities**: `apps/master/src/main/db/FaceVectorDatabase.ts` and `localFaceService.ts` already exist for local offline guest/face search routing (`@tensorflow/tfjs` + `face-api` / SQLite vector matching).
- **Required Extension**: We must extend Master's local DB and proxy routes to store enrolled photographer face embeddings locally so `mobile-photographer` can verify shifts and match face vectors over LAN even when resort WiFi is disconnected.

### 4. Management Web App (`apps/management`)
- Currently has general settings and monitor pages (`fleet monitor`, `command palette`), but needs a dedicated **Workforce Management Dashboard** (`Workforce.tsx`) to display shift logs, real-time GPS check-ins, and face verification badges across all hotel/resort stations.
