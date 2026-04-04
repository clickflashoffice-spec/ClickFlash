# ClickFlash Master App — 360° Full Audit & Implementation Plan

**Version:** 2.0
**Date:** 2026-04-03
**Scope:** `apps/master` — Electron desktop application
**Status:** In Progress

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Security Audit](#2-security-audit)
3. [Code Quality Audit](#3-code-quality-audit)
4. [Performance Audit](#4-performance-audit)
5. [Test Coverage Audit](#5-test-coverage-audit)
6. [Error Handling Audit](#6-error-handling-audit)
7. [API & Data Integrity Audit](#7-api--data-integrity-audit)
8. [Features Audit](#8-features-audit)
9. [Dependency Health Audit](#9-dependency-health-audit)
10. [Deployment & Packaging Audit](#10-deployment--packaging-audit)
11. [Implementation Priority Matrix](#11-implementation-priority-matrix)
12. [Fix Tracker](#12-fix-tracker)

---

## 1. Architecture Overview

### Stack
| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 39.2.7 |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Backend | Express.js (forked child process in production) |
| Database | SQLite (better-sqlite3-multiple-ciphers) |
| Workers | 6 backend workers (photo, face, ML, folder, thumbnail, watermark) + 2 frontend workers |
| AI/ML | TensorFlow.js, Google Generative AI (Gemini) |
| Image Processing | Sharp, @napi-rs/canvas |
| Realtime | WebSocket server |

### File Counts
| Category | Count |
|----------|-------|
| React Components (.tsx) | ~212 |
| TypeScript Files (.ts) | ~337 |
| Backend Routes | 29 |
| Backend Services | 25 |
| Frontend Services | 48 |
| Backend Workers | 6 |
| Frontend Workers | 2 |
| SQL Migrations | 31 |
| Test Files | 34 |
| Middleware | 8 |

### Process Architecture (Production)
```
electron-main.js (Main Process)
  ├── BrowserWindow (Renderer — React app)
  ├── child_process.fork() → backend/server.ts (Express :8090)
  │     ├── WorkerPool → photoWorker, faceWorker, etc.
  │     └── SQLite database
  └── preload.js (Context Bridge)
```

---

## 2. Security Audit

### 2.1 Electron Security (CRITICAL)

#### 2.1.1 Context Isolation & Node Integration
- **File:** `electron-main.js` lines 80-95
- [ ] **AUDIT:** Verify `contextIsolation: true` is set
- [ ] **AUDIT:** Verify `nodeIntegration: false` is set
- [ ] **AUDIT:** Verify `sandbox: true` is set where possible
- [ ] **AUDIT:** Check `webSecurity` flag — must NOT be `false` in production
- [ ] **AUDIT:** Review `allowRunningInsecureContent` — must be `false`

#### 2.1.2 Preload Script Security
- **File:** `preload.js`
- [ ] **AUDIT:** Verify only specific IPC channels are exposed via contextBridge
- [ ] **AUDIT:** Check no `require()` or `process` is leaked to renderer
- [ ] **AUDIT:** Validate all IPC arguments are typed and validated
- [ ] **AUDIT:** Ensure no shell/exec commands exposed to renderer

#### 2.1.3 IPC Handler Validation
- **File:** `electron-main.js` (all `ipcMain.handle` calls)
- [ ] **AUDIT:** List ALL registered IPC channels
- [ ] **AUDIT:** Validate every handler sanitizes/validates input arguments
- [ ] **AUDIT:** Check for path traversal in file-access IPC handlers
- [ ] **AUDIT:** Verify no `shell.openExternal()` with unvalidated URLs
- [ ] **AUDIT:** Check `dialog.showOpenDialog` / `dialog.showSaveDialog` constraints

#### 2.1.4 Admin Override / Shortcuts
- **File:** `electron-main.js` (ADMIN_SHORTCUT)
- [ ] **AUDIT:** Admin shortcut (`Ctrl+Alt+Shift+X`) — is PIN validated server-side?
- [ ] **AUDIT:** Is PIN brute-force protected (lockout/rate limit)?
- [ ] **AUDIT:** Default PIN `000000` — is it forced to change on first use?
- [ ] **AUDIT:** Are admin actions logged to audit trail?

#### 2.1.5 Auto-Updater Security
- **File:** `src/main/autoUpdater.ts`
- [ ] **AUDIT:** Update URL — is it HTTPS only?
- [ ] **AUDIT:** Is code signature verification enabled?
- [ ] **AUDIT:** Can update URL be changed at runtime (MITM vector)?
- [ ] **AUDIT:** Is update download integrity verified (checksum)?

#### 2.1.6 Navigation & Window Security
- [ ] **AUDIT:** `will-navigate` event handler — blocks navigation to external URLs?
- [ ] **AUDIT:** `new-window` / `window.open` — are new windows restricted?
- [ ] **AUDIT:** CSP headers set in `session.webRequest.onHeadersReceived`?
- [ ] **AUDIT:** DevTools disabled in production build?

---

### 2.2 Backend Authentication & Authorization

#### 2.2.1 Auth Middleware
- **File:** `backend/middleware/auth.ts`
- [ ] **AUDIT:** JWT secret — is it generated per-install or hardcoded?
- [ ] **AUDIT:** JWT expiry — what's the token lifetime?
- [ ] **AUDIT:** Refresh token rotation — is it implemented?
- [ ] **AUDIT:** Token storage — httpOnly cookie or localStorage?
- [ ] **AUDIT:** Session invalidation — can tokens be revoked?

#### 2.2.2 Session Management
- **File:** `backend/middleware/session.ts`
- [ ] **AUDIT:** Session fixation protection
- [ ] **AUDIT:** Session timeout configuration
- [ ] **AUDIT:** Concurrent session limits
- [ ] **AUDIT:** Session data encryption at rest

#### 2.2.3 Role-Based Access Control
- **Files:** `backend/middleware/role.ts`, `backend/middleware/permissions.ts`
- [ ] **AUDIT:** List all defined roles and permissions
- [ ] **AUDIT:** Verify every route has appropriate role/permission guard
- [ ] **AUDIT:** Check for privilege escalation vectors (role change endpoints)
- [ ] **AUDIT:** Verify permission checks are server-side (not just frontend)

#### 2.2.4 CORS Policy
- **File:** `backend/middleware/cors.ts`
- [ ] **AUDIT:** Allowed origins — is wildcard `*` used?
- [ ] **AUDIT:** Credentials mode — `Access-Control-Allow-Credentials`
- [ ] **AUDIT:** Preflight cache duration
- [ ] **AUDIT:** Allowed methods and headers — minimized?

#### 2.2.5 CSRF Protection
- **Files:** `backend/middleware/csrf.ts`, `backend/shared/csrf.ts`
- [ ] **AUDIT:** Is CSRF token generated per-session?
- [ ] **AUDIT:** Is CSRF validated on all state-changing requests (POST/PUT/DELETE)?
- [ ] **AUDIT:** Double-submit cookie pattern or synchronizer token?

#### 2.2.6 Rate Limiting
- **Files:** `backend/middleware/rateLimiting.ts`, `backend/shared/rateLimiter.ts`
- [ ] **AUDIT:** Which endpoints are rate limited?
- [ ] **AUDIT:** Rate limit thresholds — are they appropriate?
- [ ] **AUDIT:** Auth endpoints — stricter rate limits for login/PIN?
- [ ] **AUDIT:** Rate limit bypass via header manipulation?

---

### 2.3 Input Validation & Injection

#### 2.3.1 SQL Injection Surface
- **Files:** All files in `backend/routes/`, `backend/services/`
- [ ] **AUDIT:** Grep all SQL queries — verify ALL use parameterized statements
- [ ] **AUDIT:** Check for string interpolation in SQL (`${variable}` or `+ variable`)
- [ ] **AUDIT:** Review dynamic table/column names — are they allowlisted?
- [ ] **AUDIT:** Check `backend/migrations/` — any injectable DDL?

#### 2.3.2 Path Traversal
- **Files:** `backend/routes/files.ts`, `backend/routes/export.ts`, `backend/services/ExportService.ts`
- [ ] **AUDIT:** File serving endpoints — path traversal with `../`
- [ ] **AUDIT:** Export directory — validated against allowlist?
- [ ] **AUDIT:** Photo storage paths — user-controlled portions sanitized?
- [ ] **AUDIT:** Backup service — arbitrary write paths?

#### 2.3.3 Command Injection
- **Files:** All backend files using `exec()`, `spawn()`, `fork()`
- [ ] **AUDIT:** Grep for `child_process` usage in backend services
- [ ] **AUDIT:** Verify no user input flows into shell commands
- [ ] **AUDIT:** Check `backend/scripts/` — any callable from API?
- [ ] **AUDIT:** PDF-to-Printer integration — print command injection?

#### 2.3.4 XSS Prevention
- **Files:** Frontend components rendering user data
- [ ] **AUDIT:** Check for `dangerouslySetInnerHTML` usage
- [ ] **AUDIT:** Check photo metadata display — EXIF data can contain XSS payloads
- [ ] **AUDIT:** Check album/photo name rendering — sanitized?
- [ ] **AUDIT:** Check marketing template rendering — HTML injection?

#### 2.3.5 Request Validation
- **File:** `backend/middleware/validate.ts`, `backend/schemas/auth.ts`
- [ ] **AUDIT:** Which routes use validation middleware?
- [ ] **AUDIT:** Which routes LACK validation (gap analysis)?
- [ ] **AUDIT:** Validation library — Zod, Joi, or manual?
- [ ] **AUDIT:** File upload validation — type, size, content sniffing?

---

### 2.4 Data Security

#### 2.4.1 Secrets Management
- [ ] **AUDIT:** `.env.example` — list all required secrets
- [ ] **AUDIT:** Hardcoded secrets in source code (API keys, passwords, tokens)
- [ ] **AUDIT:** Stripe secret key — where stored, how accessed?
- [ ] **AUDIT:** Database encryption — `better-sqlite3-multiple-ciphers` — is cipher enabled?
- [ ] **AUDIT:** `backend/cloud-config.json` — contains secrets?

#### 2.4.2 Sensitive Data Exposure
- [ ] **AUDIT:** API responses — do they leak internal IDs, stack traces, or SQL?
- [ ] **AUDIT:** Error messages — information disclosure?
- [ ] **AUDIT:** Logs — do they contain PII, passwords, or tokens?
- [ ] **AUDIT:** Frontend bundle — secrets in `import.meta.env`?

#### 2.4.3 Backup Security
- **File:** `src/main/backupService.ts`
- [ ] **AUDIT:** Backup files — encrypted at rest?
- [ ] **AUDIT:** Backup destination — user-writable only?
- [ ] **AUDIT:** Backup retention — auto-cleanup of old backups?
- [ ] **AUDIT:** Database backup — includes sensitive data without encryption?

---

### 2.5 Network Security

#### 2.5.1 LAN Communication
- **File:** `backend/shared/lanSigningMiddleware.ts`
- [ ] **AUDIT:** LAN request signing — algorithm and key management
- [ ] **AUDIT:** Master-Touch pairing — mutual authentication?
- [ ] **AUDIT:** Sync traffic — encrypted in transit (TLS on LAN)?

#### 2.5.2 Cloud Communication
- **Files:** `backend/routes/cloud.ts`, `backend/services/cloudSyncService.ts`
- [ ] **AUDIT:** Cloud API calls — TLS certificate pinning?
- [ ] **AUDIT:** Cloud credentials — rotation policy?
- [ ] **AUDIT:** Sync data — encrypted before upload?

#### 2.5.3 WebSocket Security
- **Files:** `backend/routes/realtime.ts`, `backend/services/realtimeService.ts`
- [ ] **AUDIT:** WebSocket authentication — token required on connect?
- [ ] **AUDIT:** Message validation — all incoming messages validated?
- [ ] **AUDIT:** Rate limiting on WebSocket messages?
- [ ] **AUDIT:** Origin checking on WebSocket upgrade?

---

## 3. Code Quality Audit

### 3.1 TypeScript Strictness

- [ ] **RUN:** `npx tsc --noEmit` — document all errors
- [ ] **AUDIT:** `tsconfig.json` — `strict: true` enabled?
- [ ] **AUDIT:** Count `any` type usage across codebase
- [ ] **AUDIT:** Count `// @ts-ignore` and `// @ts-expect-error` usage
- [ ] **AUDIT:** Check `as unknown as X` unsafe casts

### 3.2 Component Complexity

#### Large Components (>300 lines) — Candidates for Splitting
- [ ] **AUDIT:** `src/components/albums/editor2/canvas/EditorCanvas.tsx`
- [ ] **AUDIT:** `src/components/albums/editor2/AlbumEditor.tsx`
- [ ] **AUDIT:** `src/components/dashboard/` — widget complexity
- [ ] **AUDIT:** `src/components/settings/` — 30 files, check for god components
- [ ] **AUDIT:** `src/components/orders/` — 11 files, check form complexity
- [ ] **AUDIT:** `src/components/common/` — 39 files, check for dead components

### 3.3 Dead Code & Unused Exports

- [ ] **RUN:** ESLint with `no-unused-vars`, `no-unused-imports`
- [ ] **AUDIT:** Unused service files — cross-reference with route imports
- [ ] **AUDIT:** Unused components — cross-reference with router/page imports
- [ ] **AUDIT:** Stale batch scripts at root (16 `.bat` files) — which are still needed?
- [ ] **AUDIT:** Root-level test/debug scripts (12 `.js` files) — cleanup candidates
- [ ] **AUDIT:** Markdown docs (12 `.md` files) — which are outdated?

### 3.4 Code Duplication

- [ ] **AUDIT:** `src/services/` vs `src/services/api/` — duplicate service pattern?
- [ ] **AUDIT:** Frontend `analyticsService.ts` vs `api/analyticsService.ts`
- [ ] **AUDIT:** `backend/shared/` vs `backend/middleware/` — overlapping auth/validation
- [ ] **AUDIT:** Multiple export patterns (barrel files vs direct imports)

### 3.5 Naming & Conventions

- [ ] **AUDIT:** File naming consistency (camelCase vs PascalCase vs kebab-case)
- [ ] **AUDIT:** Component naming matches filename?
- [ ] **AUDIT:** Service method naming conventions (get/fetch/load consistency)
- [ ] **AUDIT:** Route naming conventions (REST compliance)

### 3.6 React Patterns

- [ ] **AUDIT:** Unnecessary re-renders — missing `useMemo`/`useCallback` in hot paths
- [ ] **AUDIT:** Context provider scope — are contexts too broad?
- [ ] **AUDIT:** State colocation — global state that should be local?
- [ ] **AUDIT:** Effect cleanup — all `useEffect` return cleanup functions where needed?
- [ ] **AUDIT:** Key prop usage — proper keys in lists (no index keys for dynamic lists)?

---

## 4. Performance Audit

### 4.1 Bundle Size

- [ ] **RUN:** `npx vite-bundle-analyzer` — identify largest chunks
- [ ] **AUDIT:** Target: no single chunk > 500KB
- [ ] **AUDIT:** TensorFlow.js — tree-shaken or full import? (~4MB if full)
- [ ] **AUDIT:** Three.js — used? If not, remove (~600KB)
- [ ] **AUDIT:** Chart libraries — how many are imported? (ApexCharts, Recharts, etc.)
- [ ] **AUDIT:** Sharp — only in backend? (must not be in frontend bundle)

### 4.2 Lazy Loading

- [ ] **AUDIT:** `React.lazy()` used for:
  - [ ] Album Editor (heavy — canvas, tools, AI)
  - [ ] Dashboard widgets (charts, 3D)
  - [ ] Settings pages (30 files)
  - [ ] Marketing components
  - [ ] Modals (12 files)
- [ ] **AUDIT:** Route-level code splitting in React Router
- [ ] **AUDIT:** Dynamic imports for heavy libraries (TensorFlow, PDF, etc.)

### 4.3 Image Processing Performance

- [ ] **AUDIT:** Sharp operations — run in worker threads? (not main thread)
- [ ] **AUDIT:** Thumbnail generation — batch or on-demand?
- [ ] **AUDIT:** Photo loading — progressive JPEG / WebP support?
- [ ] **AUDIT:** Canvas rendering — `OffscreenCanvas` used where possible?
- [ ] **AUDIT:** Face detection — ML inference in worker? Memory limits?

### 4.4 Database Performance

- [ ] **AUDIT:** SQLite WAL mode enabled? (concurrent reads)
- [ ] **AUDIT:** Indexes — check all WHERE/JOIN columns have indexes
- [ ] **AUDIT:** Query complexity — any N+1 patterns?
- [ ] **AUDIT:** Connection pooling — single connection or pool?
- [ ] **AUDIT:** Large table queries — pagination enforced?

### 4.5 Memory Management

- [ ] **AUDIT:** Worker lifecycle — are workers terminated when idle?
- [ ] **AUDIT:** Image buffers — properly freed after processing?
- [ ] **AUDIT:** WebSocket connections — cleanup on disconnect?
- [x] **FIXED:** Undo/redo history capped at 50
- [x] **FIXED:** Retouch actions capped at 200
- [ ] **AUDIT:** Event listeners — removed on component unmount?
- [ ] **AUDIT:** Intervals/timeouts — cleared on cleanup?

### 4.6 Startup Performance

- [ ] **AUDIT:** Backend startup time — measure from fork to health OK
- [ ] **AUDIT:** Frontend initial load — Time to Interactive
- [ ] **AUDIT:** Database migration time on first launch
- [ ] **AUDIT:** Worker pool initialization — lazy or eager?
- [ ] **AUDIT:** Splash screen duration — is it hiding real slowness?

---

## 5. Test Coverage Audit

### 5.1 Current Coverage Map

| Area | Test Files | Coverage Level |
|------|-----------|---------------|
| Backend checkout | 1 | Minimal |
| Backend services | 2 (Transfer, Album) | Low |
| Backend shared | 1 (validateImage) | Minimal |
| Editor hooks | 3 (AI, State, PhotoData) | Moderate |
| Frontend services/api | 6 | Low-Moderate |
| Frontend hooks | 4 (debounce, history, storage, network) | Moderate |
| Frontend components | 2 (Login.face, FaceEnrollment) | Very Low |
| E2E tests | 13 specs | Moderate |
| **Total** | **34 files** | **Low** |

### 5.2 Critical Gaps (Zero Coverage)

#### Backend — HIGH PRIORITY
- [ ] **NEED TESTS:** `backend/middleware/auth.ts` — authentication logic
- [ ] **NEED TESTS:** `backend/middleware/permissions.ts` — authorization
- [ ] **NEED TESTS:** `backend/middleware/rateLimiting.ts` — rate limiting
- [ ] **NEED TESTS:** `backend/middleware/csrf.ts` — CSRF validation
- [ ] **NEED TESTS:** `backend/routes/auth.ts` — login/logout/token
- [ ] **NEED TESTS:** `backend/routes/galleryAuth.ts` — gallery auth flow
- [ ] **NEED TESTS:** `backend/routes/orders.ts` — order CRUD
- [ ] **NEED TESTS:** `backend/routes/export.ts` — file export
- [ ] **NEED TESTS:** `backend/routes/files.ts` — file serving
- [ ] **NEED TESTS:** `backend/routes/sync.ts` — multi-master sync
- [ ] **NEED TESTS:** `backend/services/stripeService.ts` — payment processing
- [ ] **NEED TESTS:** `backend/services/faceService.ts` — face recognition
- [ ] **NEED TESTS:** `backend/services/cloudSyncService.ts` — cloud sync
- [ ] **NEED TESTS:** `backend/services/LedgerService.ts` — financial ledger

#### Frontend — HIGH PRIORITY
- [ ] **NEED TESTS:** `src/context/AuthContext.tsx` — auth state management
- [ ] **NEED TESTS:** `src/components/albums/editor2/AlbumEditor.tsx` — main editor
- [ ] **NEED TESTS:** `src/components/albums/editor2/canvas/EditorCanvas.tsx` — canvas
- [ ] **NEED TESTS:** `src/components/albums/editor2/utils/ExportManager.ts` — export
- [ ] **NEED TESTS:** `src/components/albums/editor2/utils/CanvasFilterEngine.ts` — filters
- [ ] **NEED TESTS:** `src/components/orders/` — order management (11 files, 0 tests)
- [ ] **NEED TESTS:** `src/services/apiService.ts` — core API client

#### E2E — MEDIUM PRIORITY
- [ ] **NEED E2E:** Payment/checkout end-to-end flow
- [ ] **NEED E2E:** Cloud sync round-trip
- [ ] **NEED E2E:** Multi-master sync conflict resolution
- [ ] **NEED E2E:** Backup create + restore cycle
- [ ] **NEED E2E:** Auto-updater flow (mock server)

### 5.3 Test Infrastructure
- [ ] **AUDIT:** Jest config — coverage thresholds set?
- [ ] **AUDIT:** Playwright config — browser targets, parallelism
- [ ] **AUDIT:** CI integration — tests run on every PR?
- [ ] **AUDIT:** Mock quality — are mocks realistic? (3 mock files in `__mocks__/`)
- [ ] **AUDIT:** Test database — isolated per test or shared?

---

## 6. Error Handling Audit

### 6.1 React Error Boundaries

- **File:** `src/components/error-boundaries/` (1 file)
- [ ] **AUDIT:** How many error boundaries exist?
- [ ] **AUDIT:** Does every major route segment have a boundary?
- [ ] **AUDIT:** Album editor — error boundary around canvas?
- [ ] **AUDIT:** Dashboard — error boundary per widget?
- [ ] **AUDIT:** Fallback UI — informative or generic?
- [ ] **AUDIT:** Error reporting — errors sent to Sentry?

### 6.2 Backend Error Handling

- [ ] **AUDIT:** Global error handler middleware — exists?
- [ ] **AUDIT:** Async route handlers — wrapped in try/catch?
- [ ] **AUDIT:** Database errors — handled gracefully?
- [ ] **AUDIT:** Worker crash recovery — WorkerPool restarts failed workers?
- [ ] **AUDIT:** Migration failure — blocks startup or silent failure?

### 6.3 Electron Error Handling

- [ ] **AUDIT:** `process.on('uncaughtException')` — handler exists?
- [ ] **AUDIT:** `process.on('unhandledRejection')` — handler exists?
- [x] **FIXED:** Backend crash recovery — respawn logic in electron-main.js
- [ ] **AUDIT:** Renderer crash — `webContents.on('render-process-gone')` handled?
- [ ] **AUDIT:** GPU crash — `app.on('gpu-process-crashed')` handled?

### 6.4 Network Error Handling

- [ ] **AUDIT:** API calls — retry logic with backoff?
- [ ] **AUDIT:** Offline detection — `navigator.onLine` + ping?
- [ ] **AUDIT:** WebSocket reconnection — automatic with backoff?
- [ ] **AUDIT:** Cloud sync failure — queued for retry?
- [ ] **AUDIT:** Timeout handling — all HTTP requests have timeouts?

### 6.5 User-Facing Error UX

- [ ] **AUDIT:** Toast notifications — used for transient errors?
- [ ] **AUDIT:** Form validation — inline error messages?
- [ ] **AUDIT:** Loading states — skeleton screens or spinners?
- [ ] **AUDIT:** Empty states — helpful messages when no data?
- [x] **FIXED:** Fatal error screen in Electron main process

---

## 7. API & Data Integrity Audit

### 7.1 Route Completeness

#### All 29 Backend Routes
| Route File | Auth | Validation | Tests |
|-----------|------|------------|-------|
| `analytics.ts` | [ ] Verify | [ ] Verify | None |
| `assistance.ts` | [ ] Verify | [ ] Verify | None |
| `auth.ts` | N/A (login) | [ ] Verify | None |
| `cloud.ts` | [ ] Verify | [ ] Verify | None |
| `collections.ts` | [ ] Verify | [ ] Verify | None |
| `culling.ts` | [ ] Verify | [ ] Verify | None |
| `dashboard.ts` | [ ] Verify | [ ] Verify | None |
| `export.ts` | [ ] Verify | [ ] Verify | None |
| `faces.ts` | [ ] Verify | [ ] Verify | None |
| `files.ts` | [ ] Verify | [ ] Verify | None |
| `gallery.ts` | [ ] Verify | [ ] Verify | None |
| `galleryAuth.ts` | N/A | [ ] Verify | None |
| `galleryCheckout.ts` | [ ] Verify | [ ] Verify | 1 test |
| `health.ts` | N/A | N/A | None |
| `ledger.ts` | [ ] Verify | [ ] Verify | None |
| `marketing.ts` | [ ] Verify | [ ] Verify | None |
| `notification.ts` | [ ] Verify | [ ] Verify | None |
| `orders.ts` | [ ] Verify | [ ] Verify | None |
| `pairing.ts` | [ ] Verify | [ ] Verify | None |
| `realtime.ts` | [ ] Verify | [ ] Verify | None |
| `resortAnalytics.ts` | [ ] Verify | [ ] Verify | None |
| `sessionTypes.ts` | [ ] Verify | [ ] Verify | None |
| `sync.ts` | [ ] Verify | [ ] Verify | None |
| `system.ts` | [ ] Verify | [ ] Verify | None |
| `system/hardware.ts` | [ ] Verify | [ ] Verify | None |
| `system/health.ts` | [ ] Verify | [ ] Verify | None |
| `system/maintenance.ts` | [ ] Verify | [ ] Verify | None |
| `system/network.ts` | [ ] Verify | [ ] Verify | None |
| `system/operations.ts` | [ ] Verify | [ ] Verify | None |

### 7.2 Database Schema Integrity

- **31 migration files** in `backend/migrations/`
- [ ] **AUDIT:** Migrations are sequential (032-062) — verify no gaps
- [ ] **AUDIT:** Each migration is idempotent (can re-run safely)?
- [ ] **AUDIT:** Foreign key constraints — enabled in SQLite?
- [ ] **AUDIT:** Indexes on frequently queried columns
- [ ] **AUDIT:** Schema versioning — tracked in a migrations table?
- [ ] **AUDIT:** Rollback support — down migrations exist?

### 7.3 Data Validation

- [ ] **AUDIT:** Request body validation on ALL POST/PUT routes
- [ ] **AUDIT:** Query parameter validation (pagination limits, sort fields)
- [ ] **AUDIT:** File upload validation (type, size, content-type sniffing)
- [ ] **AUDIT:** Image metadata sanitization (EXIF injection)
- [ ] **AUDIT:** JSON payload size limits (express.json limit)

### 7.4 Multi-Master Sync

- **Files:** `backend/routes/sync.ts`, `backend/services/cloudSyncService.ts`
- [ ] **AUDIT:** Conflict resolution strategy — last-write-wins? CRDT? Manual?
- [ ] **AUDIT:** Data consistency — eventual consistency guarantees?
- [ ] **AUDIT:** Sync idempotency — duplicate syncs handled?
- [ ] **AUDIT:** Sync authentication — signed requests?
- [ ] **AUDIT:** Sync ordering — vector clocks or timestamps?
- [ ] **AUDIT:** Partial sync failure — transaction rollback?

### 7.5 Payment Processing

- **Files:** `backend/routes/galleryCheckout.ts`, `backend/services/stripeService.ts`
- [ ] **AUDIT:** Stripe webhook signature verification
- [ ] **AUDIT:** Idempotency keys — prevent double charges?
- [ ] **AUDIT:** Product price verification — server-side price check before charge?
- [ ] **AUDIT:** Refund flow — implemented and tested?
- [ ] **AUDIT:** PCI compliance — no card data stored locally?

---

## 8. Features Audit

### 8.1 Album Editor (`src/components/albums/editor2/`)

**84 files — the most complex feature area**

#### Canvas & Rendering
- [ ] **AUDIT:** `canvas/EditorCanvas.tsx` — memo optimization (partially fixed)
- [ ] **AUDIT:** `renderer/` — rendering pipeline quality
- [ ] **AUDIT:** Canvas resolution — handles Retina/HiDPI?
- [ ] **AUDIT:** Large image handling — downsampled for editing?

#### Editing Tools
- [ ] **AUDIT:** `tools/` — crop, straighten, retouch completeness
- [ ] **AUDIT:** Crop — aspect ratio presets complete?
- [ ] **AUDIT:** Retouch — heal/clone tool accuracy
- [ ] **AUDIT:** Straighten — angle detection quality
- [ ] **AUDIT:** Filter engine — `utils/CanvasFilterEngine.ts` correctness

#### State Management
- [x] **FIXED:** `hooks/useEditorState.ts` — undo/redo capped at 50
- [ ] **AUDIT:** `hooks/useEditsState.ts` — edit persistence
- [ ] **AUDIT:** `hooks/usePhotoState.ts` — photo selection
- [ ] **AUDIT:** `hooks/useZoomPan.ts` — zoom/pan smoothness
- [ ] **AUDIT:** `EditorContext.tsx` — context scope appropriate?

#### AI Features
- [ ] **AUDIT:** `hooks/useAIEditor.ts` — Gemini integration
- [ ] **AUDIT:** AI auto-enhance — quality and reliability
- [ ] **AUDIT:** AI suggestions — UX and accuracy
- [ ] **AUDIT:** Fallback when AI service unavailable

#### Export
- [x] **FIXED:** `utils/ExportManager.ts` — AbortSignal support added
- [ ] **AUDIT:** Export format support (JPEG, PNG, TIFF?)
- [ ] **AUDIT:** Export quality settings — configurable?
- [ ] **AUDIT:** Export metadata — EXIF preserved/updated?

#### Keyboard Shortcuts
- [ ] **AUDIT:** `utils/KeyboardShortcuts.ts` — completeness
- [ ] **AUDIT:** Conflict detection — shortcuts don't clash with Electron globals?
- [ ] **AUDIT:** Accessibility — all tools keyboard-accessible?

#### Presets
- [x] **FIXED:** `utils/PresetManager.ts` — per-preset try/catch + truncation
- [ ] **AUDIT:** Preset sharing — export/import format?
- [ ] **AUDIT:** Built-in presets — quality and variety

### 8.2 Photo Culling (`src/components/culling/`)

- [ ] **AUDIT:** Culling workflow completeness (select, reject, rate)
- [ ] **AUDIT:** AI-assisted culling — `src/services/smartCullingService.ts`
- [ ] **AUDIT:** Batch operations — select all, invert, etc.
- [ ] **AUDIT:** Performance with 1000+ photos
- [ ] **AUDIT:** Keyboard navigation (arrow keys, star ratings)

### 8.3 Dashboard (`src/components/dashboard/`)

- [ ] **AUDIT:** 18 files — widget inventory
- [ ] **AUDIT:** Real-time data refresh — WebSocket or polling?
- [ ] **AUDIT:** Chart rendering performance
- [ ] **AUDIT:** Data accuracy — matches backend calculations?
- [ ] **AUDIT:** Responsive layout — works at all window sizes?

### 8.4 Orders (`src/components/orders/`)

- [ ] **AUDIT:** Order lifecycle (create → process → fulfill → archive)
- [ ] **AUDIT:** Order validation — prevents invalid states?
- [ ] **AUDIT:** Print integration — PDF generation quality
- [ ] **AUDIT:** Fulfillment slip service — `backend/services/FulfillmentSlipService.ts`
- [ ] **AUDIT:** Order search and filtering

### 8.5 Settings (`src/components/settings/`)

- [ ] **AUDIT:** 30 files — settings inventory
- [ ] **AUDIT:** System settings — `settings/system/` subdirectory
- [ ] **AUDIT:** Permission matrix — `PermissionsMatrix.tsx`
- [ ] **AUDIT:** Settings persistence — database or config file?
- [ ] **AUDIT:** Settings validation — invalid values rejected?
- [ ] **AUDIT:** Settings migration — version upgrades preserve settings?

### 8.6 Marketing (`src/components/marketing/`)

- [ ] **AUDIT:** Marketing automation features
- [ ] **AUDIT:** Email service integration — `backend/services/emailService.ts`
- [ ] **AUDIT:** Template management
- [ ] **AUDIT:** Contact management and consent (GDPR)

### 8.7 Face Recognition

- **Files:** `backend/workers/faceWorker.ts`, `backend/workers/MLWorker.ts`, `backend/services/faceService.ts`
- [ ] **AUDIT:** Face detection accuracy
- [ ] **AUDIT:** Face matching/grouping algorithm
- [ ] **AUDIT:** Privacy — face data storage and deletion
- [ ] **AUDIT:** Performance — processing time per photo
- [ ] **AUDIT:** Worker crash recovery

### 8.8 Booking System (`src/components/bookings/`)

- [ ] **AUDIT:** 3 files — feature completeness
- [ ] **AUDIT:** Calendar integration
- [ ] **AUDIT:** Booking confirmation flow
- [ ] **AUDIT:** Availability checking

### 8.9 MoneyTrash Integration (`src/components/moneytrash/`)

- [ ] **AUDIT:** 6 files — photo upload integration
- [ ] **AUDIT:** Transfer service — `backend/services/TransferService.ts`
- [ ] **AUDIT:** Upload progress and retry
- [ ] **AUDIT:** Archive service — `backend/services/ArchiveService.ts`

---

## 9. Dependency Health Audit

### 9.1 Critical Dependencies

| Package | Risk Area | Check |
|---------|----------|-------|
| `electron` 39.2.7 | Security patches, EOL | [ ] Check advisories |
| `better-sqlite3-multiple-ciphers` | Native module, crypto | [ ] Version + CVEs |
| `sharp` | Native module, image processing | [ ] Version + CVEs |
| `@napi-rs/canvas` | Native module | [ ] Version + compatibility |
| `@tensorflow/tfjs` | ML, large bundle | [ ] Version + tree-shaking |
| `stripe` / `@stripe/stripe-js` | Payment | [ ] Version + PCI |
| `express` | Web server | [ ] Version + CVEs |
| `jsonwebtoken` | Auth | [ ] Version + algorithm |
| `bcryptjs` | Password hashing | [ ] Version + rounds |

### 9.2 Audit Actions

- [ ] **RUN:** `pnpm audit` — list all HIGH/CRITICAL CVEs
- [ ] **RUN:** `npx depcheck` — find unused dependencies
- [ ] **AUDIT:** Duplicate libraries (multiple chart libs, etc.)
- [ ] **AUDIT:** Native module rebuild compatibility (Electron version match)
- [ ] **AUDIT:** License compliance — any GPL in production bundle?

---

## 10. Deployment & Packaging Audit

### 10.1 Electron Builder Config

- **File:** `electron-builder.yml`
- [x] **FIXED:** `base: './'` in vite.config.ts for file:// protocol
- [x] **FIXED:** `asarUnpack` includes `node_modules/**/*` for fork() compatibility
- [x] **FIXED:** Tailwind/PostCSS configs committed
- [ ] **AUDIT:** Code signing — `forceCodeSigning: false` → should be true for production
- [ ] **AUDIT:** `requestedExecutionLevel: requireAdministrator` — is admin needed?
- [ ] **AUDIT:** Missing `build/icon.ico` — default Electron icon used
- [ ] **AUDIT:** Missing `helper_scripts/` — build warning
- [ ] **AUDIT:** `deleteAppDataOnUninstall: true` — is this desired? (destroys user data)
- [ ] **AUDIT:** NSIS installer — `createDesktopShortcut: false` — intended?

### 10.2 Build Pipeline

- [ ] **AUDIT:** Vite build output — check for source maps in production
- [ ] **AUDIT:** Backend esbuild — bundle all dependencies?
- [ ] **AUDIT:** Worker bundling — esbuild config for 6 workers
- [ ] **AUDIT:** Build reproducibility — same input → same output?
- [ ] **AUDIT:** Build artifacts — `.gitignore` covers `dist/`, `release/`?

### 10.3 Auto-Update

- [ ] **AUDIT:** Update server URL configured?
- [ ] **AUDIT:** Update channel (stable/beta/alpha)?
- [ ] **AUDIT:** Signature verification?
- [ ] **AUDIT:** Rollback mechanism on failed update?
- [ ] **AUDIT:** Update notification UX

### 10.4 Production Environment

- [ ] **AUDIT:** `NODE_ENV=production` set in backend fork?
- [ ] **AUDIT:** Debug logging disabled in production?
- [ ] **AUDIT:** DevTools — `Ctrl+Shift+I` disabled in production?
- [ ] **AUDIT:** Sentry DSN — configured for production?
- [ ] **AUDIT:** Data directory — `pb_data/` location in production?

---

## 11. Implementation Priority Matrix

### P0 — Critical (Security vulnerabilities, data loss risks)

| # | Issue | Area | Est. Effort |
|---|-------|------|-------------|
| 1 | Audit all IPC handlers for input validation | Electron Security | 4h |
| 2 | Verify `contextIsolation: true` + `nodeIntegration: false` | Electron Security | 1h |
| 3 | Audit SQL injection surface across 29 routes | Backend Security | 8h |
| 4 | Verify JWT secret is not hardcoded | Auth | 1h |
| 5 | Audit file serving for path traversal (files.ts, export.ts) | Backend Security | 3h |
| 6 | Verify Stripe webhook signature validation | Payments | 2h |
| 7 | Audit command injection surface (exec/spawn usage) | Backend Security | 3h |
| 8 | Default admin PIN `000000` — force change on setup | Auth | 2h |
| 9 | Rate limit auth endpoints (login, PIN) | Auth | 2h |
| 10 | Add auth middleware to all routes missing it | Auth | 4h |

### P1 — High (Reliability, data integrity)

| # | Issue | Area | Est. Effort |
|---|-------|------|-------------|
| 11 | Add error boundaries for all major feature areas | Error Handling | 3h |
| 12 | Test coverage for auth middleware | Tests | 4h |
| 13 | Test coverage for payment flow | Tests | 4h |
| 14 | Test coverage for sync/conflict resolution | Tests | 6h |
| 15 | Database migration rollback support | Data Integrity | 4h |
| 16 | Request validation on all POST/PUT routes | Validation | 8h |
| 17 | Backend global error handler middleware | Error Handling | 2h |
| 18 | Worker crash recovery in WorkerPool | Reliability | 3h |
| 19 | WebSocket authentication on connect | Security | 2h |
| 20 | File upload type/size validation | Security | 3h |

### P2 — Medium (Performance, code quality)

| # | Issue | Area | Est. Effort |
|---|-------|------|-------------|
| 21 | Bundle size analysis + lazy loading | Performance | 4h |
| 22 | TensorFlow.js tree-shaking or removal | Performance | 2h |
| 23 | TypeScript strict mode — fix all errors | Code Quality | 8h |
| 24 | Remove dead code and unused services | Code Quality | 4h |
| 25 | Database query performance (indexes, N+1) | Performance | 4h |
| 26 | Code signing for production installer | Deployment | 2h |
| 27 | Icon and branding for installer | Deployment | 1h |
| 28 | Auto-updater configuration | Deployment | 4h |
| 29 | Source map handling in production | Security | 1h |
| 30 | Consolidate duplicate service patterns | Code Quality | 4h |

### P3 — Low (Polish, documentation, minor improvements)

| # | Issue | Area | Est. Effort |
|---|-------|------|-------------|
| 31 | Clean up 16 root-level .bat scripts | Code Quality | 2h |
| 32 | Clean up 12 root-level debug .js scripts | Code Quality | 1h |
| 33 | Update/remove 12 markdown docs | Documentation | 2h |
| 34 | Test coverage for remaining components | Tests | 16h |
| 35 | E2E test for full order lifecycle | Tests | 4h |
| 36 | GDPR compliance review (face data, contact data) | Compliance | 4h |
| 37 | Accessibility audit — keyboard navigation | UX | 4h |
| 38 | Responsive layout at all window sizes | UX | 3h |
| 39 | Settings migration strategy | Robustness | 3h |
| 40 | License compliance check | Legal | 1h |

---

## 12. Fix Tracker

### Already Fixed (This Audit)

| # | Fix | Commit |
|---|-----|--------|
| 1 | Vite `base: './'` for Electron file:// | `796c23f` |
| 2 | Tailwind/PostCSS config files created | `796c23f` |
| 3 | Template literal syntax error in error screen | `796c23f` |
| 4 | Backend asar unpack for child_process.fork | `796c23f` |
| 5 | EditorCanvas memo — shallow comparison instead of JSON.stringify | `446acec` |
| 6 | Undo/redo history capped at 50 | `446acec` |
| 7 | Retouch actions capped at 200 | `446acec` |
| 8 | Path traversal validation on export directory | `446acec` |
| 9 | Filename sanitization in export | `446acec` |
| 10 | ExportManager AbortSignal support | `446acec` |
| 11 | PresetManager per-preset try/catch + truncation | `446acec` |
| 12 | Retouch coordinate validation | `446acec` |
| 13 | localStorage QuotaExceededError handling | `446acec` |

### In Progress

| # | Fix | Status |
|---|-----|--------|
| 14 | Backend auto-start in packaged exe | Built — needs user verification |

### Pending — See Priority Matrix Above

---

## Appendix A: File Inventory

### Backend Routes (29)
```
backend/routes/analytics.ts        backend/routes/assistance.ts
backend/routes/auth.ts             backend/routes/cloud.ts
backend/routes/collections.ts      backend/routes/culling.ts
backend/routes/dashboard.ts        backend/routes/export.ts
backend/routes/faces.ts            backend/routes/files.ts
backend/routes/gallery.ts          backend/routes/galleryAuth.ts
backend/routes/galleryCheckout.ts  backend/routes/health.ts
backend/routes/ledger.ts           backend/routes/marketing.ts
backend/routes/notification.ts     backend/routes/orders.ts
backend/routes/pairing.ts          backend/routes/realtime.ts
backend/routes/resortAnalytics.ts  backend/routes/sessionTypes.ts
backend/routes/sync.ts             backend/routes/system.ts
backend/routes/system/hardware.ts  backend/routes/system/health.ts
backend/routes/system/maintenance.ts backend/routes/system/network.ts
backend/routes/system/operations.ts
```

### Backend Services (25)
```
ArchiveService.ts      DiagnosticSyncService.ts  ExportService.ts
FleetService.ts        FulfillmentService.ts     FulfillmentSlipService.ts
HardwareService.ts     InventoryService.ts       LedgerService.ts
MoneyTrashService.ts   OrderValidationService.ts ResortAnalyticsService.ts
StressTestService.ts   TransferService.ts        VectorIndexService.ts
aiCullingService.ts    albumService.ts           bookingService.ts
cloudSyncService.ts    emailService.ts           faceService.ts
maintenanceService.ts  realtimeService.ts        sessionTypeService.ts
stripeService.ts
```

### Backend Middleware (8)
```
auth.ts  cors.ts  csrf.ts  permissions.ts
rateLimiting.ts  role.ts  session.ts  validate.ts
```

### Backend Workers (6)
```
MLWorker.ts  faceWorker.ts  folderWorker.ts
photoWorker.ts  thumbnailWorker.ts  watermarkWorker.ts
```

### SQL Migrations (31)
```
032 → 062 + fix_login_history_schema.sql
```

---

## Appendix B: Security Middleware Coverage Template

Every route must declare its security requirements:

```typescript
router.get('/endpoint',
  authMiddleware,          // ← Required on all non-public routes
  roleMiddleware('admin'), // ← Required for admin-only routes
  rateLimiter,             // ← Required on auth + expensive routes
  csrfMiddleware,          // ← Required on all state-changing routes
  validateBody(schema),    // ← Required on all POST/PUT routes
  handler
);
```

---

*This audit document is the single source of truth for the master app improvement roadmap. Update the Fix Tracker as items are completed.*
