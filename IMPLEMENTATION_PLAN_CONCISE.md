# ClickFlash Phase 19 — Biometric Security & Workforce Management
## Concise Implementation Plan

---

### Current State Analysis (from deep scan)

**Mobile Photographer App** (`apps/mobile-pro`):
- `ShiftService.ts` — Uses Expo `LocalAuthentication` (FaceID/TouchID), logs shifts with GPS, syncs via `SyncService`
- `SyncService.ts` — Routes to Master PC (port 8090) via LAN, falls back to Cloudflare D1, queues offline
- **Missing**: Real 128D face vector extraction (currently uses device LocalAuth only), TensorFlow.js Blazeface integration

**Cloudflare Worker** (`apps/cloud-backend`):
- `photographers.ts` — Has `/api/shifts` POST/GET, `/api/photographers/enroll-face`, `/api/photographers/:id/face-vector`
- D1 schema already supports: `biometric_method`, `biometric_confidence`, `face_vector_hash`, `station_id`
- **Missing**: D1 migration to add these columns if not present

**Master Electron** (`apps/master`):
- `FaceVectorDatabase.ts` — SQLite-vss placeholder (guest selfie matching, NOT photographer shift biometrics)
- **Missing**: Photographer face vector storage, shift log IPC proxy, Settings UI for biometric enforcement

**Management Web** (`apps/management`):
- **Missing**: WorkforceDashboard page, real-time shift logs with GPS map pins, biometric badges, enforcement rules

---

### Implementation Plan

#### Phase 1: Cloudflare Backend — D1 Schema & API (✅ Mostly Done)
- [ ] Verify migration `004_workforce_biometrics.sql` exists and applies columns
- [ ] Add integration tests for new endpoints in `apps/cloud-backend/test/`

#### Phase 2: Mobile Photographer — Face Scan Engine
- [ ] Add deps: `@tensorflow/tfjs`, `@tensorflow/tfjs-react-native`, `@tensorflow-models/blazeface`, `@tensorflow-models/mobilenet`
- [ ] Create `FaceBiometricService.ts` — extract 128D vectors, compare against enrolled profiles
- [ ] Create `FaceEnrollmentScreen.tsx` (`app/enroll-face.tsx`) — camera-based enrollment UI
- [ ] Upgrade `ShiftService.ts` & `app/schedule.tsx` — real camera Face Scan during clock-in/out
- [ ] Ensure `SyncService.ts` proxies biometric shifts offline→Master correctly

#### Phase 3: Master Electron — Offline Hub & Settings
- [ ] Extend `FaceVectorDatabase.ts` schema: add `photographer_vectors` table (separate from guest selfies)
- [ ] Add IPC handlers: `shifts:proxy`, `photographers:proxy` for offline validation/storage
- [ ] Upgrade Settings UI: `SettingsPage.tsx`, `Photographers.tsx` — clock logs, biometric status, face enrollment mgmt

#### Phase 4: Management Web — Workforce Dashboard
- [ ] Create `WorkforceDashboard.tsx` — real-time attendance across stations
- [ ] Shift log table: GPS map pins, timestamps, durations, `FACE_VECTOR` vs `LOCAL_AUTH` badges
- [ ] Global settings: enforce Face Scan vs allow LocalAuth fallback

#### Phase 5: Verification Gates
- [ ] `npm run lint:all` — zero errors
- [ ] `npm run typecheck:all` — zero errors
- [ ] `pnpm --filter clickflash-master test` — pass
- [ ] `pnpm --filter clickflash-touch test` — pass
- [ ] `pnpm --filter star-master-management test` — pass
- [ ] `pnpm --filter star-master-customer test` — pass
- [ ] Verify offline→online shift sync flow end-to-end
- [ ] Update `walkthrough.md` and `task.md` with evidence

---

### Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| TensorFlow.js React Native native module build failures | Pre-build Expo config, test 4-ABI APK assembly early |
| SQLite-vss native module on Windows | Use `better-sqlite3` with prebuilt binaries; validate clean-machine |
| Biometric data privacy | Store only hashed vectors (`face_vector_hash`), never raw embeddings |
| Offline queue durability | Already implemented in `OfflineQueueService` — verify with integration tests |

---

### Approval Required

This plan is ready for execution. **Reply "APPROVED" to proceed with Phase 2 implementation.**