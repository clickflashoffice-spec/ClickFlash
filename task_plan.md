# Task Plan: ClickFlash Phase 19 — Biometric Security & Workforce Management

## Goal
Implement Phase 19 of the ClickFlash Ecosystem: Photographer clock-in/out with Face Scan from the mobile app (`apps/mobile-photographer`) and deep integration of workforce shift tracking, biometric verification, and settings across `apps/master`, `apps/cloud-backend`, `apps/management`, and `apps/touch`.

## Current Phase
Phase 1: Planning & Architecture (In Progress - Awaiting User Approval)

## Phases

### Phase 1: Planning & Architecture [/]
- [x] Read `goal.md`, `roadmap.md`, and `task.md`
- [x] Query `alaeddine-mcp` tools and analyze codebase architecture
- [x] Audit `apps/mobile-photographer/src/services/ShiftService.ts`, `SyncService.ts`, and `cloud-backend/src/index.ts`
- [x] Create project planning files (`task_plan.md`, `findings.md`, `progress.md`)
- [x] Create `implementation_plan.md` artifact and request user approval

### Phase 2: Cloudflare Backend D1 Schema & Workforce API (`apps/cloud-backend`) [ ]
- [ ] Create D1 migration `004_workforce_biometrics.sql` adding `biometric_method`, `biometric_confidence`, `face_vector_hash`, and `station_id` to `shifts` and `photographers` tables
- [ ] Upgrade `/api/shifts` (`POST` and `GET`) in `apps/cloud-backend/src/index.ts` to accept and return full biometric shift metadata and filter by station/date
- [ ] Add `/api/photographers/enroll-face` and `/api/photographers/:id/face-vector` endpoints in `cloud-backend`
- [ ] Add unit/integration verification for new worker endpoints

### Phase 3: Mobile Photographer Face Scan & Enrollment Engine (`apps/mobile-photographer`) [ ]
- [ ] Install/Configure `@tensorflow/tfjs`, `@tensorflow/tfjs-react-native`, `@tensorflow-models/blazeface`, and `@tensorflow-models/mobilenet` in `apps/mobile-photographer/package.json` (mirroring `apps/mobile-customer`)
- [ ] Create `FaceBiometricService.ts` to extract 128D face vectors and compare them against enrolled photographer profiles
- [ ] Create `FaceEnrollmentScreen.tsx` (`app/enroll-face.tsx`) allowing photographers to scan and register their face vector
- [ ] Upgrade `ShiftService.ts` and `schedule.tsx` (`app/schedule.tsx`) to perform real camera-based Face Scan verification during clock-in/out (`biometricVerified: true`, `biometricMethod: 'FACE_VECTOR'`, `confidence`, and GPS coordinates)
- [ ] Ensure offline LAN synchronization (`SyncService.ts`) proxies biometric shift records cleanly to `apps/master` when internet is unavailable

### Phase 4: Studio Master Offline Hub & Settings Integration (`apps/master`) [ ]
- [ ] Upgrade `apps/master/src/main/db/FaceVectorDatabase.ts` and local SQLite schema to store enrolled photographer face vectors and shift records locally
- [ ] Upgrade `apps/master/src/main/ipc/` and proxy routes (`/api/shifts/proxy`, `/api/photographers/proxy`) so Master validates and stores biometric shifts offline and syncs up to Cloudflare when online
- [ ] Upgrade Master Settings UI (`apps/master/src/components/settings/SettingsPage.tsx` and `Photographers.tsx`) to view real-time clock-in/out logs, inspect biometric verification status, and manage face enrollments

### Phase 5: Management Web App Workforce & Shift Dashboard (`apps/management`) [ ]
- [ ] Create `WorkforceDashboard.tsx` (`apps/management/src/pages/Workforce.tsx` or `components/workforce/`) showing real-time photographer attendance across all resort stations
- [ ] Display shift log table with GPS map pin links, timestamps, shift durations, and `biometricVerified` badges (`FACE_VECTOR` vs `LOCAL_AUTH` fallback)
- [ ] Add biometric enforcement rules in global settings (enforce Face Scan vs allow LocalAuthentication passcodes)

### Phase 6: E2E Verification & Release Ledger Update [ ]
- [ ] Run `npm run lint:all` and `npm run test:all` (verify `packages/validation`, `apps/touch`, `apps/master`, and mobile services pass)
- [ ] Verify offline-to-online shift synchronization flow
- [ ] Update `walkthrough.md` and `task.md` with concrete verification evidence
