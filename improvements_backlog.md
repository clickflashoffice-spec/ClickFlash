# ClickFlash Improvements Backlog (Living Artifact)

> **Antigravity V4 Continuous Discovery Engine**  
> Prioritized ranking of architectural, performance, security, and developer experience enhancements.  
> **Scoring Index**: `ROI = (Impact [1-10] × Confidence [0.0-1.0]) / (Effort [1-10] × Risk [1-5])`

---

## Summary Matrix

| ID | Title | Category | Impact (1-10) | Effort (1-10) | Risk (1-5) | ROI Score | Status |
|---|---|---|---|---|---|---|---|
| **QW-001** | NativeWind SafeAreaView Type Augmentation | Quick Win | 8 | 1 | 1 | **8.00** | Completed |
| **QW-002** | Master Vitest Forks Pool Permanent Config | Quick Win | 9 | 1 | 1 | **9.00** | Completed |
| **QW-003** | Shared Packages Pre-Build in GitHub CI | Quick Win | 9 | 1 | 1 | **9.00** | Completed |
| **QW-004** | Docker Redis Authentication & Healthcheck | Quick Win | 7 | 1 | 1 | **7.00** | Completed |
| **ARCH-001** | SQLite Write Queue (`DbWriteQueue`) Journal | Architecture | 9 | 4 | 2 | **1.01** | Completed |
| **ARCH-002** | Modular Split of AgentStudioView (1,200 LOC) | Architecture | 8 | 3 | 1 | **2.40** | Completed |
| **ARCH-003** | Real Rust Core Implementation (`@clickflash/mobile-pro`) | Architecture | 10 | 8 | 3 | **0.38** | Completed |
| **ARCH-004** | RxDB / ElectricSQL Kiosk-to-Cloud Sync Layer | Architecture | 9 | 7 | 3 | **0.40** | Completed |
| **SEC-001** | Hardware DPAPI/TPM Master SQLite Key Custody | Security | 10 | 4 | 2 | **1.13** | Completed |
| **SEC-002** | Biometric Air-Gap CI AST Linter Guard | Security | 9 | 3 | 1 | **2.70** | Completed |
| **SEC-003** | Fastify LAN Endpoint HMAC Request Signing | Security | 8 | 3 | 2 | **1.20** | Completed |
| **PERF-001** | Turborepo Remote Caching in GitHub Actions | Performance | 8 | 2 | 1 | **3.60** | Completed |
| **PERF-002** | Sharp Stream Concurrency Pool & Backpressure | Performance | 9 | 4 | 2 | **1.01** | Completed |
| **PERF-003** | OpenTelemetry Distributed Tracing across Nodes | Observability | 8 | 5 | 2 | **0.72** | Completed |
| **PERF-004** | Gallery & Management Bundle Code-Splitting | Performance | 8 | 3 | 2 | **1.20** | Completed |
| **FRONTEND-005** | Gallery Prop-Drilling Elimination (`CustomerGalleryContext`) | Architecture | 8 | 3 | 1 | **2.40** | Completed |
| **DX-001** | Consolidated `pnpm test:fast` Test Runner | Developer Exp | 7 | 2 | 1 | **3.15** | Completed |
| **LINT-001** | Master OS ESLint 106-Error Remediation | Code Quality | 8 | 2 | 1 | **3.80** | In Progress |
| **PERF-005** | Self-Service & Photographer Acyclic Vite Chunking | Performance | 7 | 1 | 1 | **6.65** | In Progress |
| **PERF-006** | AI Pipeline Multi-Path Vector Index Detection | Observability | 7 | 2 | 1 | **3.15** | In Progress |

---

## 1. Quick Wins

### [QW-001] NativeWind SafeAreaView Type Augmentation
- **Target**: `apps/mobile/pro/nativewind-env.d.ts`
- **Rationale**: On Linux/CI environments, `SafeAreaView` from `react-native-safe-area-context` fails TypeScript compilation when `className` is passed without module augmentation.
- **Acceptance Criteria**:
  - `declare module 'react-native-safe-area-context' { interface NativeSafeAreaViewProps { className?: string; } }` declared.
  - `pnpm --filter @clickflash/mobile-pro run typecheck` passes with exit code 0.
- **Status**: Completed in `feat/v4-deep-optimizations`.

### [QW-002] Master Vitest Forks Pool Configuration
- **Target**: `apps/desktop/master/vitest.config.ts`
- **Rationale**: Node.js worker-threads pool causes intermittent Windows Access Violations (0xC0000005) when loading native C++ SQLite bindings. `pool: 'forks'` isolates native addon memory and eliminates thread crashes.
- **Acceptance Criteria**:
  - `pool: 'forks'` configured in `vitest.config.ts`.
  - All 60 test suites (274 tests) pass deterministically under 45 seconds.
- **Status**: Completed in `feat/master-v3-hardening`.

### [QW-003] Shared Packages Pre-Build in GitHub CI
- **Target**: `.github/workflows/ci.yml`
- **Rationale**: Fresh runners lack compiled `.d.ts` artifacts for sibling packages (`@clickflash/logger`, `@clickflash/errors`, `@clickflash/validation`), leading to module resolution errors.
- **Acceptance Criteria**:
  - `pnpm --filter "./packages/*" --filter "!@clickflash/wasm-sharpness" run build` executed before typechecking.
- **Status**: Completed in commit `6f380726`.

### [QW-004] Docker Redis Authentication & Healthcheck
- **Target**: `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.prod.yml`
- **Rationale**: Redis was previously exposed without password protection and healthcheck failed without `-a`.
- **Acceptance Criteria**:
  - `--requirepass ${REDIS_PASSWORD:-clickflash_redis_dev_secret}` added to command.
  - `redis-cli -a ... ping` in healthcheck.
- **Status**: Completed in `feat/master-v3-hardening`.

---

## 2. High-Impact Architecture

### [ARCH-001] SQLite Write Queue (`DbWriteQueue`) Durable Journal
- **Target**: `apps/desktop/master/backend/services/DbWriteQueue.ts`
- **Rationale**: In the event of a power outage at a resort, queued writes stored purely in JavaScript memory are lost.
- **Acceptance Criteria**:
  - Write-ahead append-only JSONL log (`queue-journal.jsonl`) written synchronously before memory enqueue.
  - On startup, replay pending journal entries to SQLite.
  - Truncate journal upon successful SQLite batch transaction.
- **Status**: Completed (Dual-durability: sync WAL journal + pending_writes table recovery).

### [ARCH-002] Modular Split of `AgentStudioView.tsx`
- **Target**: `apps/management/src/views/AgentStudioView.tsx`
- **Rationale**: `AgentStudioView.tsx` has grown to over 1,200 lines, containing 5 distinct domains:
  1. `PromptRegistryTab` (System prompts, token metrics, model parameters)
  2. `SQLiteQueueTab` (Edge queue depth, compaction status, flush latency)
  3. `TaskRunnerTab` (Background tasks, execution graphs, cancellation)
  4. `VisionCullingTab` (ArcFace embeddings, sharpness scores, SAM3 masks)
  5. `YieldArbitrageTab` (Dynamic pricing curves, demand surges, revenue uplift)
- **Acceptance Criteria**:
  - Split into `apps/management/src/views/agent-studio/` directory.
  - Main view reduced to clean tab orchestrator (<90 lines).
  - Strict typecheck and zero UI regression.
- **Status**: Completed in `refactor/frontend-4-agent-studio`.

### [ARCH-003] Real Rust Core Implementation (`@clickflash/mobile-pro`)
- **Target**: `apps/mobile/pro/clickflash-rust-core`
- **Rationale**: Currently a JavaScript facade. Needs real Rust UniFFI / React Native JSI bindings for high-throughput image hashing and BLE RSSI telemetry parsing.
- **Acceptance Criteria**:
  - UniFFI scaffolding compiling to `.so` and `.dylib`.
  - Zero-copy photo buffer hashing and L2 normalization in native Rust.
- **Status**: Completed (`Cargo.toml`, `clickflash.udl`, `lib.rs`, zero-copy buffer hashing and L2 normalization).

### [ARCH-004] RxDB / ElectricSQL Kiosk-to-Cloud Sync Layer
- **Target**: `apps/desktop/master/backend/services/SyncManager.ts`
- **Rationale**: Support conflict-free replicated data types (CRDT) for offline kiosk-to-cloud synchronization.
- **Acceptance Criteria**:
  - Intercept `/graphql` WebSocket upgrades.
  - Implement foundational `handleRxDBReplication` handler for CRDT operations over WebSockets.
- **Status**: Completed (`SyncManager.ts`).

---

## 3. Security Hardening

### [SEC-001] Hardware DPAPI / TPM Master SQLite Key Custody
- **Target**: `apps/desktop/master/backend/database/db.ts`, `apps/desktop/master/backend/utils/dpapi.ts`
- **Rationale**: Prevent extraction of the 256-bit AES database encryption key from process environment variables.
- **Acceptance Criteria**:
  - Windows DPAPI (`ProtectedData.Protect` / `Unprotect`) wrapper used to encrypt key at rest (`DB_ENCRYPTION_KEY="DPAPI:..."`).
  - Key unlocked in-memory only during master process lifecycle.
- **Status**: Completed (`dpapi.ts`, `dpapi.test.ts`, `db.ts`, `scripts/protect-key.ts`).

### [SEC-002] Biometric Air-Gap CI AST Linter Guard
- **Target**: `packages/config/eslint` / `.agents/rules/security-policy.md`
- **Rationale**: Guarantee that no code changes ever introduce raw ArcFace 512D float embeddings into `metadata.json`, WebSocket broadcasts, or public cloud endpoints.
- **Acceptance Criteria**:
  - Custom ESLint rule or AST scan flagging any export of `descriptor` or vector arrays to kiosk sync payloads.
- **Status**: Completed (`scripts/check-biometric-airgap.mjs` + `test:security-guards` in CI).

### [SEC-003] Fastify LAN Endpoint HMAC Request Signing
- **Target**: `apps/desktop/master/backend/middleware/lanSigningMiddleware.ts`
- **Rationale**: Authenticate all Touch Kiosk LAN requests to Master OS Fastify & Express endpoints via HMAC-SHA256 headers with constant-time verification.
- **Acceptance Criteria**:
  - Unified `verifyLanSignatureCore` with `crypto.timingSafeEqual`.
  - Fastify `preHandler` hook and Express middleware exported.
  - 100% test coverage with replay protection and private network checks.
- **Status**: Completed (`lanSigningMiddleware.ts` + `lanSigningMiddleware.test.ts` 12/12 passing).

---

## 4. Performance & Observability

### [PERF-001] Turborepo Remote Caching in GitHub Actions
- **Target**: `.github/workflows/ci.yml`
- **Rationale**: Accelerate monorepo build and test runs from 2.5 minutes down to <30 seconds via remote hash caching.
- **Acceptance Criteria**:
  - GitHub Actions cache for `.turbo` and `node_modules/.cache/turbo`.
  - CI security guard step enabled on all PRs/pushes.
- **Status**: Completed (`.github/workflows/ci.yml`).

### [PERF-002] Sharp Stream Concurrency Pooling with Backpressure
- **Target**: `apps/desktop/master/backend/workers/photoWorker.ts`
- **Rationale**: Prevent CPU starvation during rapid multi-camera tethered burst ingestion (e.g. 10 fps roller coaster cameras).
- **Acceptance Criteria**:
  - Constrain libvips thread pool via `sharp.concurrency(1)` per worker thread.
  - Cascaded derivative generation: derive `thumb` (400x400) and `tiny` (100x100 webp) from 2048px intermediate preview, eliminating 2 full-res file decodes.
- **Status**: Completed (`photoWorker.ts`).

### [FRONTEND-005] Gallery Prop-Drilling Elimination (`CustomerGalleryContext`)
- **Target**: `apps/gallery/src/components/customer/`
- **Rationale**: Clean up 10+ prop drillings across `CustomerLayout`, `CustomerGallery`, and `PhotoCard`.
- **Status**: Completed (`CustomerGalleryContext.tsx`, `CustomerGallery.tsx`, `CustomerLayout.tsx`).

### [PERF-004] Web Bundler Code-Splitting & Acyclic Chunking
- **Target**: `apps/gallery/vite.config.ts`, `apps/management/vite.config.ts`
- **Rationale**: Prevent monolithic bundle bloat and eliminate circular chunk warnings (`vendor-core <-> vendor-react`) by co-locating `scheduler` and `use-sync-external-store` with React dependencies.
- **Status**: Completed (`apps/gallery/vite.config.ts`, `apps/management/vite.config.ts`).

### [DX-001] Consolidated `pnpm test:fast` Test Runner
- **Target**: `package.json`
- **Rationale**: Provide sub-15s local developer testing across security guards, shared packages, and core unit tests without launching headless browser instances.
- **Status**: Completed (`package.json`, runs in ~8s with 100% pass rate).


### [PERF-003] OpenTelemetry Distributed Tracing across Nodes
- **Target**: pps/desktop/master, pps/management
- **Rationale**: No unified tracing between Kiosk, Master Edge Node, and Cloud Backend.
- **Status**: Completed (OpenTelemetry Web and Node SDKs installed, 	elemetry.ts injected).

### [ARCH-004] RxDB / ElectricSQL Kiosk-to-Cloud Sync Layer
- **Target**: pps/desktop/master/backend/services/SyncManager.ts
- **Rationale**: Current sync logic relies on manual timestamp diffing and batch HTTP calls, which often conflict under partitioned network scenarios (e.g. resort internet drops).
- **Status**: Completed (RxDB GraphQL Replication over WebSockets implemented).

## V5 Prioritized Improvements (Phase 2 Audits)

### [FRONTEND-101] Modularize Monolithic UI Components & Optimize React Hooks
- **Target**: `apps/gallery/src/components/customer/CustomerGallery.tsx`, `apps/desktop/touch/src/components/touch/PhotoSelectionScreen.tsx`
- **Rationale**: 500+ line monoliths. Search debouncing uses raw `setTimeout` inside `useEffect`, causing re-renders. Iterating photo arrays blocks render thread.
- **Score**: Impact (4) x Effort (3) x Risk (4) = 48
- **Category**: Tech Debt & Performance

### [FRONTEND-102] Remediate Accessibility (WCAG) Violations in Photo Grids
- **Target**: `CustomerGallery.tsx`, `PhotoCard`
- **Rationale**: Interactive elements use simple `div`s. Missing `tabIndex`, `onKeyDown`, and `aria-labels`. 
- **Score**: Impact (4) x Effort (4) x Risk (5) = 80
- **Category**: Accessibility (WCAG)

### [FRONTEND-103] Implement Internationalization (i18n) for Hardcoded Strings
- **Target**: `CustomerGallery.tsx`, `DashboardView.tsx`
- **Rationale**: Hardcoded English strings bypass `react-i18next`.
- **Score**: Impact (3) x Effort (5) x Risk (5) = 75
- **Category**: Localization & Tech Debt

### [SEC-101] Eliminate Hardcoded Fallback Secrets in Production
- **Target**: `docker-compose.prod.yml`
- **Rationale**: Default fallback secrets (e.g. `:-clickflash_redis_dev_secret`) exist in production files, risking silent OWASP misconfigurations.
- **Score**: Impact (5) x Effort (5) x Risk (4) = 100
- **Category**: Security

### [INFRA-101] Mitigate Supply-Chain Risk in CI/CD
- **Target**: `.github/workflows/ci.yml`
- **Rationale**: Unverified 3rd-party GitHub action uses mutable tags. Pin to SHA or replace.
- **Score**: Impact (4) x Effort (5) x Risk (4) = 80
- **Category**: Infra/DevOps

### [INFRA-102] Container Hardening & Multi-Stage Build
- **Target**: `apps/backend/ai-worker/Dockerfile`
- **Rationale**: Single stage, runs as `root`. Violates principle of least privilege.
- **Score**: Impact (3) x Effort (4) x Risk (4) = 48
- **Category**: Infra/DevOps

### [BACKEND-101] Sync File Ops Blocking Event Loop
- **Target**: `apps/desktop/master/backend/routes/collections.ts`
- **Rationale**: `fs.readFileSync` blocks Express main thread during batch photo ingestion.
- **Score**: Impact (5) x Effort (5) x Risk (4) = 100
- **Category**: Performance / Concurrency

### [BACKEND-102] Missing Transaction Wrapper for Settings Sync
- **Target**: `apps/desktop/master/backend/services/cloudSyncService.ts`
- **Rationale**: Multiple independent `dbManager.run()` queries inside loops without `BEGIN TRANSACTION`. Data corruption risk if failure occurs mid-loop.
- **Score**: Impact (4) x Effort (5) x Risk (4) = 80
- **Category**: Reliability / Data Integrity

### [BACKEND-103] [COMPLETED] Missing Scalability Indexes for D1 Telemetry
- **Target**: `apps/backend/cloud-backend/src/routes/intelligence.ts`, `migrations`
- **Rationale**: Lack of composite indexes on `tenant_id, timestamp DESC` causes full table scans on Cloudflare D1.
- **Score**: Impact (4) x Effort (5) x Risk (5) = 100
- **Category**: Performance / Reliability

### [TEST-101] Cloud Backend Test Coverage Gaps
- **Target**: `apps/backend/cloud-backend/src/routes/gallery.ts`, `workers/sales-swarm.ts`, `utils/*`
- **Rationale**: Current vitest coverage for `cloud-backend` is at ~42.3% statement coverage. Missing coverage for gallery routes and AI sales swarm edge cases. `apps/desktop/master` has better coverage but worker/db process crash handling is currently unhandled or partially verified.
- **Score**: Impact (4) x Effort (3) x Risk (2) = 24
- **Category**: Reliability / Testing

### [CHAOS-101] Automated Edge Node Chaos Engineering
- **Target**: `apps/desktop/master`, `tests/e2e/chaos`
- **Rationale**: We can inject simulated failures (`network_partition`, `camera_tether_drop`, `redis_stream_outage`) using ClickFlash MCP `chaos_edge_fault_injector` and `offline_storage_pressure_tester`. Manual validation shows the circuit breaker drops to `LOCAL_AUTONOMOUS` without data loss, but this must be automated into a continuous chaos testing suite in Playwright E2E or GitHub Actions.
- **Score**: Impact (5) x Effort (4) x Risk (3) = 41
- **Category**: Reliability / Testing

