# ClickFlash Ecosystem — 360° Production Readiness Master Plan

> **Version:** 1.0  
> **Date:** June 2026  
> **Scope:** All 6 applications + shared infrastructure  
> **Status:** Planning Phase — Awaiting Approval  

---

## 1. Executive Summary

### 1.1 Ecosystem Health Scorecard

| App | Health Score | TypeScript | Tests | Backend | Frontend | Status |
|-----|-------------|------------|-------|---------|----------|--------|
| **Master Station** | 8.5/10 | ~6 pre-existing | 62/62 ✅ | Express + SQLite | React + Vite | 🟢 Recently optimized |
| **Touch Kiosk** | 8.0/10 | ~3 pre-existing | 62/62 ✅ | Express + SQLite | React + Vite | 🟢 Recently optimized |
| **Customer Gallery** | 6.0/10 | **584 errors** | 24 pass, 8 fail | **Dual backend** (Express + CF Worker) | React + Vite | 🔴 Critical |
| **Management Hub** | 8.0/10 | 29 errors | 34 pass, 10 fail | **Dual backend** (Express + CF Worker) | React + Vite | 🟡 Needs cleanup |
| **MoneyTrash** | ?/10 | Unknown | Unknown | Tauri + Rust + CF Worker | React + Vite | ⚪ Unaudited |
| **Website** | 10/10 | 0 | Comprehensive | Next.js static export | Next.js 15 | 🟢 Done |
| **Shared Packages** | ?/10 | Unknown | Minimal | — | — | ⚪ Unaudited |

### 1.2 Critical Findings

| # | Finding | Severity | Apps Affected |
|---|---------|----------|---------------|
| 1 | **Dual backend architecture** — Gallery & Management have BOTH legacy Express (`backend/`) AND Cloudflare Worker (`backend/src/`) codebases active simultaneously | 🔴 Critical | Gallery, Management |
| 2 | **584 TypeScript errors** in Gallery — completely broken for production builds | 🔴 Critical | Gallery |
| 3 | **Build failure logs everywhere** — `build_error.log`, `build_log.txt`, `tsc_errors.log` in Management indicate persistent build issues | 🟡 High | Management |
| 4 | **MoneyTrash never audited** — no audit report, unknown TypeScript/test state | 🟡 High | MoneyTrash |
| 5 | **Shared packages unaudited** — `@clickflash/types` and `@clickflash/ui` may have version mismatches | 🟡 High | All apps |
| 6 | **No unified CI/CD** — each app has independent build scripts, no cross-app integration testing | 🟡 High | Ecosystem |
| 7 | **Manual Cloudflare secret management** — `wrangler secret put` is manual, error-prone | 🟢 Medium | Gallery, Management, MoneyTrash |
| 8 | **Gallery PCI compliance claims untested** — Stripe integration claims 10/10 but 584 TS errors suggest broken builds | 🟡 High | Gallery |

---

## 2. Per-App Deep Dive

### 2.1 Master Station (apps/master) — Status: 🟢 Optimized

**Recently completed work (this session):**
- ✅ DbWriteQueue 2-phase commit for power-cycle safety
- ✅ Touch auto-polling with exponential backoff
- ✅ IndexedDB checkpoint migration (from localStorage)
- ✅ ConnectivityService for proactive Master reachability
- ✅ Rate limiting on kiosk orders
- ✅ Triple idempotency (mutation_ack_log, clientMutationId, X-Idempotency-Key)

**Remaining work:**
- CloudSyncService modularization (2400+ line monolith)
- Silent error swallowing in `syncRemoteSettings()`
- HTTP-only photo pull in Touch backend (needs HTTPS support)
- E2E and simulation validation (requires running backend)

**Skills needed:** `swarm-coding`, `cloudflare`, `test-suite-architect`

---

### 2.2 Touch Kiosk (apps/touch) — Status: 🟢 Optimized

**Recently completed work (this session):**
- ✅ Auto-polling sync loop with backoff
- ✅ ConnectivityService with debounced health probes
- ✅ IndexedDB checkpoint service (unlimited storage)
- ✅ Conflict tracking infrastructure (`conflicts` table)
- ✅ 5-state SyncStatusIndicator

**Remaining work:**
- Master-side conflict detection (return 409 on concurrent edit)
- Handle `conflict_flag = 1` orders in UI
- Jest version standardization (currently v29, Master uses v30)

**Skills needed:** `swarm-coding`, `test-suite-architect`

---

### 2.3 Customer Gallery (apps/gallery) — Status: 🔴 Critical

**Architecture:**
- **Frontend:** React 19 + Vite + Tailwind — 200+ component files
- **Backend:** **DUAL STRUCTURE** — `backend/` (legacy Express JS) AND `backend/src/` (TypeScript Cloudflare Worker)
- **Database:** Cloudflare D1 + R2
- **Payment:** Stripe Elements (PCI compliant claims)
- **Security:** JWT, CORS whitelist, rate limiting, bcrypt, audit logging

**Critical Issues:**

| Issue | Severity | Evidence |
|-------|----------|----------|
| 584 TypeScript errors | 🔴 Critical | `AUDIT_REPORT.md` — "Major issues across missing type definitions, unused imports, type mismatches" |
| Dual backend confusion | 🔴 Critical | `backend/server.js` (Express) AND `backend/src/server.ts` (Worker) both exist and appear active |
| 8 failing test suites | 🟡 High | Module resolution errors, import path issues |
| Legacy JS backend | 🟡 High | `backend/` root has `.js` files that may still be used by `dev:backend` script (`npx tsx watch backend/server.js`) |
| Build artifacts everywhere | 🟢 Low | `build.log`, `build_err.log`, `build_error.log`, `build_final_try.log` — indicates repeated failed builds |

**Files requiring attention (priority order):**
1. `backend/src/server.ts` — Worker entry point (TypeScript)
2. `backend/server.js` — Legacy Express entry (JavaScript) — **DECIDE: keep or delete**
3. `src/services/stripeService.ts` — Payment integration
4. `src/services/syncService.ts` — Cloud sync
5. `src/components/customer/PaymentForm.tsx` — PCI-critical component
6. `src/components/customer/CheckoutModal.tsx` — Checkout flow
7. `src/components/common/ErrorBoundary.tsx` — Error handling
8. `backend/src/services/r2SignedUrlService.ts` — R2 integration
9. `backend/src/validation.ts` — Input validation
10. `backend/wrangler.toml` — Deployment config

**Skills needed:** `swarm-coding`, `cloudflare`, `test-suite-architect`, `Coding`

---

### 2.4 Management Hub (apps/management) — Status: 🟡 Needs Cleanup

**Architecture:**
- **Frontend:** React 19 + Vite + Tailwind — 300+ component files
- **Backend:** **DUAL STRUCTURE** — `backend/` (legacy Express JS) AND `backend/src/` (TypeScript Cloudflare Worker)
- **Database:** Cloudflare D1 + R2
- **Features:** Fleet monitoring, payroll, yield intelligence, CRM, BI dashboards

**Issues:**

| Issue | Severity | Evidence |
|-------|----------|----------|
| 29 TypeScript errors | 🟡 Medium | Mostly in `__tests__/server.test.ts` — missing `@types/jest` |
| 10 failing tests | 🟡 Medium | Jest ESM module resolution issues |
| 30 database migrations | 🟢 Low | Complex schema evolution — verify all apply cleanly on fresh D1 |
| Build error logs | 🟡 High | `build_error.log`, `build_log.txt`, `tsc_errors.log` — persistent build failures |
| Dual backend | 🟡 High | Same as Gallery — `backend/server.js` AND `backend/src/server.ts` |
| Statelessness claims | 🟢 Low | `AUDIT_FULL_360.md` claims "Production Ready" but build logs contradict |

**Files requiring attention:**
1. `backend/src/server.ts` — Worker entry
2. `backend/server.js` — Legacy Express — **DECIDE: keep or delete**
3. `src/components/management/FleetMonitor.tsx` — Fleet monitoring
4. `src/components/management/YieldIntelligence.tsx` — Business intelligence
5. `src/services/apiService.ts` — API layer
6. `backend/src/routes/sync.ts` — Multi-master sync
7. `backend/wrangler.toml` — Deployment config

**Skills needed:** `swarm-coding`, `cloudflare`, `test-suite-architect`

---

### 2.5 MoneyTrash Uploader (apps/moneytrash) — Status: ⚪ Unaudited

**Architecture:**
- **Frontend:** React 19 + Vite + Tailwind
- **Backend:** Tauri v2 (Rust) + Cloudflare Worker handlers
- **Storage:** R2 (S3-compatible) via AWS SDK
- **Features:** Chunked uploads, offline queue, progress persistence

**Unknowns (need audit):**
- TypeScript error count
- Test coverage
- Rust code quality
- Cloudflare Worker handler security
- R2 upload integrity
- EXIF data handling security

**Files to audit:**
1. `src-tauri/src/lib.rs` — Rust main entry
2. `src-tauri/src/commands/upload.rs` — Upload commands
3. `src-tauri/src/errors.rs` — Error handling
4. `src/services/uploadQueue.ts` — JS upload queue
5. `src/services/resumableUploadService.ts` — Resumable uploads
6. `cloudflare/src/index.ts` — Worker entry
7. `cloudflare/src/handlers/upload/chunk.ts` — Chunk handler
8. `cloudflare/src/handlers/upload/finalize.ts` — Finalize handler
9. `cloudflare/wrangler.toml` — Deployment config

**Skills needed:** `swarm-coding`, `cloudflare`, `docker-essentials`, `test-suite-architect`

---

### 2.6 Website (apps/website) — Status: 🟢 Done

**Architecture:**
- **Framework:** Next.js 15 static export
- **Styling:** Tailwind CSS 4
- **Performance:** Code splitting, lazy loading, Web Vitals tracking
- **SEO:** 10/10 score, structured data, multi-language
- **Testing:** Playwright E2E + Vitest unit tests
- **Accessibility:** WCAG 2.1 AA compliance

**Assessment:** This app was comprehensively audited and improved (6/10 → 10/10). All categories at 10/10. **No action needed unless new requirements arise.**

**Skills needed:** `vercel` (for deployment), `seo-audit` (for periodic verification)

---

### 2.7 Shared Packages (packages/) — Status: ⚪ Unaudited

**`packages/types/`:**
- `src/index.ts` — Shared TypeScript types
- `jest.config.js` — Minimal test setup
- **Risk:** Version mismatch with app-specific types

**`packages/ui/`:**
- `src/components/` — Button, Card, Input, Modal, PhotoCard, Spinner, Toast
- `src/styles/tokens.css` — Design tokens
- `src/index.ts` — Package exports
- **Risk:** Components may be out of sync with app-specific UI patterns

**Issues:**
- No versioning strategy documented
- No automated publishing
- Apps reference via `file:../../packages/...` — works locally but fragile
- No visual regression testing across apps

**Skills needed:** `Coding`, `test-suite-architect`

---

## 3. Cross-App Integration Analysis

### 3.1 Data Flow Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLICKFLASH ECOSYSTEM DATA FLOW                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐     HMAC HTTP     ┌──────────────┐                      │
│   │   MASTER     │◄────────────────►│    TOUCH     │  LAN (offline-first) │
│   │  (Port 8090) │    WebSocket      │  (Port 8091) │                      │
│   └──────┬───────┘                   └──────┬───────┘                      │
│          │                                    │                             │
│          │ HTTPS + JWT                        │                             │
│          ▼                                    ▼                             │
│   ┌─────────────────────────────────────────────────────┐                  │
│   │              CLOUDFLARE EDGE NETWORK                   │                  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │                  │
│   │  │  MANAGEMENT  │  │   GALLERY    │  │MONEYTRASH │  │                  │
│   │  │    HUB       │  │   WORKER     │  │  WORKER   │  │                  │
│   │  │   (D1 DB)    │  │  (D1 + R2)   │  │   (R2)    │  │                  │
│   │  └──────────────┘  └──────────────┘  └───────────┘  │                  │
│   └─────────────────────────────────────────────────────┘                  │
│          │                    │                    │                        │
│          ▼                    ▼                    ▼                        │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐              │
│   │   WEBSITE    │     │   CUSTOMER   │     │   EXTERNAL   │              │
│   │  (Next.js)   │     │   GALLERY UI │     │   UPLOADERS  │              │
│   │  (Static)    │     │  (React+Vite)│     │  (Tauri App) │              │
│   └──────────────┘     └──────────────┘     └──────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Integration Points & Risks

| Integration | Transport | Risk Level | Issue |
|-------------|-----------|------------|-------|
| Master ↔ Touch | HMAC HTTP + WebSocket | 🟢 Low | Recently optimized |
| Master ↔ Cloud Hub | HTTPS + JWT + HW fingerprint | 🟢 Low | Circuit breakers in place |
| Master ↔ Gallery | Unknown | 🟡 High | No documented API contract |
| Master ↔ Management | Unknown | 🟡 High | No documented API contract |
| Gallery ↔ Stripe | Stripe Elements | 🟢 Low | PCI compliant (if builds work) |
| MoneyTrash ↔ R2 | S3 API | ⚪ Unknown | Needs audit |
| Website ↔ Gallery | Static embed | 🟢 Low | Pre-built assets in `public/gallery/` |
| Website ↔ Management | Static embed | 🟢 Low | Pre-built assets in `public/manage/` |

### 3.3 Shared Dependencies Risk

| Dependency | Apps Using | Version Risk |
|------------|-----------|--------------|
| `react` | All 6 | Gallery: 19.2.0, Management: 19.2.0, MoneyTrash: 19.2.0, Website: 19.0.0, Master: 19.2.0, Touch: 19.2.0 |
| `tailwindcss` | All 6 | Gallery: 3.4.18, Management: 3.4.18, MoneyTrash: 3.4.17, Website: 4.0, Master: 3.4.18, Touch: 3.4.18 |
| `lucide-react` | All 6 | Various versions (0.562 to 0.577) |
| `zod` | 5/6 | Gallery: 4.1.13, Management: 4.1.13, Master: 4.1.13, Touch: 4.1.13 |
| `typescript` | All 6 | Gallery: 5.7.3, Management: 5.7.3, MoneyTrash: 5.x, Website: 5.x, Master: 5.9.3, Touch: 5.9.3 |
| `vite` | 4/6 | Gallery: 7.2.4, Management: 7.2.4, MoneyTrash: 6.1.0, Master: 7.3.2, Touch: 7.2.4 |

**Risk:** Tailwind CSS v3 vs v4 incompatibility. Website uses v4 while all others use v3. Shared UI components in `packages/ui/` may break on v4.

---

## 4. Security Audit Across Ecosystem

### 4.1 Per-App Security Posture

| App | Auth | CORS | Rate Limit | Input Validation | SQL Injection | XSS | CSRF | Overall |
|-----|------|------|------------|------------------|---------------|-----|------|---------|
| Master | JWT + Session | Whitelist | ✅ strictRateLimiter | Zod | Parameterized | CSP | ✅ | 🟢 Strong |
| Touch | JWT + HMAC | LAN-only | ✅ strictRateLimiter | Zod | Parameterized | CSP | N/A (LAN) | 🟢 Strong |
| Gallery | JWT | Whitelist | ✅ 100/min | Basic (needs Zod) | Parameterized | CSP | ? | 🟡 Medium |
| Management | JWT | Whitelist | ✅ 60/min | Basic (needs Zod) | Parameterized | CSP | ? | 🟡 Medium |
| MoneyTrash | JWT? | ? | ? | ? | ? | ? | ? | ⚪ Unknown |
| Website | N/A (static) | N/A | N/A | N/A | N/A | CSP | N/A | 🟢 Strong |

### 4.2 Cloudflare Security Configuration

| App | Geo-Restriction | WAF Rate Limit | Secrets Management | Observability |
|-----|-----------------|----------------|-------------------|---------------|
| Gallery | ✅ MA,TN,FR,US | ✅ 100/min | Manual (`wrangler secret put`) | ✅ Enabled |
| Management | ✅ MA,TN,FR,US | ✅ 60/min | Manual (`wrangler secret put`) | ✅ Enabled |
| MoneyTrash | ? | ? | ? | ? |

**Risk:** Manual secret management is error-prone. No secret rotation policy documented.

### 4.3 Critical Security Gaps

1. **Gallery & Management input validation** — `validation.js` is basic, needs Zod schemas on ALL endpoints
2. **MoneyTrash security** — completely unknown, needs full audit
3. **Shared package integrity** — `@clickflash/types` and `@clickflash/ui` could be tampered with
4. **No security headers on Cloudflare Workers** — Need to verify HSTS, CSP, X-Frame-Options in Worker responses
5. **No penetration testing documentation** — `pentest-isolation.js` exists in Management but no report

---

## 5. Performance Bottlenecks

### 5.1 Per-App Performance

| App | Bundle Size | Load Time | Database | Images | Caching |
|-----|-------------|-----------|----------|--------|---------|
| Master | Unknown | Unknown | SQLite WAL | Sharp processing | No CDN |
| Touch | Unknown | Unknown | SQLite + Dexie | Download from Master | localStorage (now IndexedDB) |
| Gallery | Unknown | Unknown | D1 | R2 | Cloudflare cache |
| Management | Unknown | Unknown | D1 | R2 | Cloudflare cache |
| MoneyTrash | Unknown | Unknown | IndexedDB | R2 | None |
| Website | 259kB first load | <2.5s LCP | Static | Next.js Image | 1 year static |

### 5.2 Cross-App Performance Risks

1. **Gallery 584 TS errors** — Cannot build = cannot deploy = complete outage
2. **Management build failures** — Repeated failed builds suggest dependency or config issues
3. **Master photo processing** — Sharp/Canvas operations on large images may block event loop
4. **Touch photo downloads** — 3 concurrent downloads × large JPEGs = memory pressure on kiosk hardware
5. **MoneyTrash chunk uploads** — 1MB chunks × thousands of files = long upload sessions

---

## 6. Testing Coverage Gaps

### 6.1 Current Test Matrix

| App | Unit Tests | Integration Tests | E2E Tests | Coverage | Status |
|-----|-----------|-------------------|-------------|----------|--------|
| Master | Jest (62 pass) | ✅ sync-integration | ✅ Playwright | Unknown | 🟢 Good |
| Touch | Jest (62 pass) | ❌ None | ✅ Playwright | Unknown | 🟡 Needs integration |
| Gallery | Jest (24 pass, 8 fail) | ❌ None | ✅ Playwright | Broken | 🔴 Critical |
| Management | Jest (34 pass, 10 fail) | ❌ None | ✅ Playwright | Broken | 🟡 Needs fix |
| MoneyTrash | Vitest (unknown) | ❌ None | ✅ Playwright | Unknown | ⚪ Unknown |
| Website | Vitest + Playwright | ❌ None | ✅ Comprehensive | Good | 🟢 Good |

### 6.2 Missing Test Scenarios

| Scenario | Apps | Priority |
|----------|------|----------|
| Cross-app order flow (Touch → Master → Gallery → Stripe → Management) | All | 🔴 Critical |
| Offline → online sync under network loss | Master + Touch | 🟡 High |
| Cloudflare Worker cold start performance | Gallery + Management | 🟡 High |
| D1 database migration on fresh deploy | Gallery + Management | 🟡 High |
| R2 upload integrity (MoneyTrash) | MoneyTrash | 🟡 High |
| Stripe webhook handling under load | Gallery | 🟡 High |
| Multi-master sync conflict resolution | Master + Management | 🟢 Medium |
| Kiosk power cycle recovery | Touch + Master | 🟢 Medium |

---

## 7. Deployment Pipeline Assessment

### 7.1 Current Deployment Model

| App | Platform | Build Tool | Deploy Method | Automation |
|-----|----------|------------|---------------|------------|
| Master | Local (Electron) | Vite + esbuild | Manual (`deploy-web.ps1`) | ❌ Manual |
| Touch | Local (Electron) | Vite + esbuild | Manual | ❌ Manual |
| Gallery | Cloudflare | Vite + Wrangler | `wrangler deploy` | ❌ Manual |
| Management | Cloudflare | Vite + Wrangler | `wrangler deploy` | ❌ Manual |
| MoneyTrash | Local (Tauri) + Cloudflare | Vite + Cargo + Wrangler | Manual | ❌ Manual |
| Website | Cloudflare Pages | Next.js static | `wrangler pages deploy` | ❌ Manual |

### 7.2 CI/CD Gaps

1. **No GitHub Actions workflow** — `.github/` exists but no workflow files for automated build/test/deploy
2. **No staging environment** — Wrangler configs have commented-out staging sections
3. **No automated secret rotation** — All secrets managed manually
4. **No smoke tests post-deploy** — No health check automation after deployment
5. **No rollback strategy** — No documented rollback procedure for Cloudflare Workers
6. **No dependency update automation** — Dependabot or Renovate not configured

---

## 8. Skills Mapping

### 8.1 Required Skills for This Plan

| Skill | Purpose | Apps | Stage |
|-------|---------|------|-------|
| `swarm-coding` | Coordinate multi-app implementation with parallel agents | All | All |
| `cloudflare` | Deploy Workers, manage D1/R2, configure secrets | Gallery, Management, MoneyTrash | B, C, D |
| `test-suite-architect` | Establish comprehensive QA across all apps | All | C, D |
| `docker-essentials` | Local development environment consistency | All | A |
| `vercel` | Website deployment optimization | Website | D |
| `seo-audit` | Periodic website SEO verification | Website | D |
| `Git` | Version control for cross-app changes | All | All |
| `Coding` | Consistent coding style enforcement | All | All |

### 8.2 Skill Loading Strategy

- **Stage A (Foundation):** Load `docker-essentials`, `Git`, `Coding`
- **Stage B (Gallery Fix):** Load `swarm-coding`, `cloudflare`
- **Stage C (Management + MoneyTrash):** Load `swarm-coding`, `cloudflare`, `test-suite-architect`
- **Stage D (Testing + CI/CD):** Load `test-suite-architect`, `vercel`, `seo-audit`

---

## 9. Implementation Roadmap

### Stage A: Foundation & Shared Infrastructure (Week 1)

**Goal:** Establish consistent development environment and fix shared packages.

#### A1. Docker Compose Standardization
- **Files:** `docker-compose.yml`, `docker-compose.dev.yml`
- **Actions:**
  1. Update Docker Compose to include all 6 apps with proper networking
  2. Add health checks for each service
  3. Mount shared packages as volumes for live reload
  4. Add `.dockerignore` files for each app

#### A2. Shared Packages Audit
- **Files:** `packages/types/`, `packages/ui/`
- **Actions:**
  1. Run TypeScript check on both packages
  2. Fix any type errors
  3. Add proper versioning (`package.json` version fields)
  4. Add build scripts to compile packages
  5. Verify all apps can import from shared packages

#### A3. Dependency Alignment
- **Actions:**
  1. Standardize React to 19.2.0 across all apps
  2. Standardize Tailwind to 3.4.18 (or migrate all to v4)
  3. Standardize TypeScript to 5.9.3
  4. Standardize Vite to 7.3.2
  5. Run `pnpm install` at root to verify compatibility

#### A4. Root Package Scripts
- **Files:** `package.json` (root)
- **Actions:**
  1. Add `test:ci` script that runs all app tests in parallel
  2. Add `lint:all` script
  3. Add `typecheck:all` script
  4. Add `build:all` script with proper dependency ordering

**Deliverables:**
- Working Docker Compose for full ecosystem
- Zero TypeScript errors in shared packages
- Aligned dependency versions
- Root-level CI scripts

---

### Stage B: Gallery Critical Fix (Week 2)

**Goal:** Resolve 584 TypeScript errors and eliminate dual backend.

#### B1. Backend Consolidation Decision
- **Files:** `apps/gallery/backend/`, `apps/gallery/backend/src/`
- **Actions:**
  1. Determine which backend is actually deployed (check `wrangler.toml` → `main = "src/server.ts"`)
  2. If Worker is deployed: move legacy `backend/` files to `backend/legacy/` archive
  3. If Express is still used: document the hybrid model and fix import paths
  4. Update `package.json` scripts to reflect actual backend

#### B2. TypeScript Error Triage
- **Actions:**
  1. Run `tsc --noEmit` and categorize errors:
     - Missing type definitions → add `@types/` packages
     - Unused imports → auto-fix with ESLint
     - Type mismatches → fix manually
     - Possibly undefined → add null checks
  2. Fix errors in priority order:
     1. `src/services/stripeService.ts` (PCI-critical)
     2. `src/components/customer/PaymentForm.tsx` (PCI-critical)
     3. `src/components/customer/CheckoutModal.tsx`
     4. `src/services/syncService.ts`
     5. All other files

#### B3. Test Infrastructure Fix
- **Files:** `jest.config.js`, `jest.tsconfig.json`
- **Actions:**
  1. Fix module path resolution (alias mapping)
  2. Add missing test utility exports
  3. Update `setupTests.tsx` imports
  4. Run tests and verify 0 failures

#### B4. Build Verification
- **Actions:**
  1. Run `npm run build` — must succeed with 0 errors
  2. Run `npm run typecheck` — must pass
  3. Run `npm run test` — must pass
  4. Run `npm run test:e2e` — must pass

**Deliverables:**
- Single backend architecture (no dual confusion)
- 0 TypeScript errors
- All tests passing
- Successful production build

---

### Stage C: Management + MoneyTrash Cleanup (Week 3)

**Goal:** Fix Management build issues and complete MoneyTrash audit.

#### C1. Management TypeScript & Build Fix
- **Actions:**
  1. Fix 29 TypeScript errors (mostly test file `@types/jest`)
  2. Resolve build failure logs — identify root cause
  3. Fix dual backend (same approach as Gallery)
  4. Verify all 30 migrations apply cleanly

#### C2. Management Test Fix
- **Actions:**
  1. Fix Jest ESM module resolution
  2. Fix or skip unstable tests properly
  3. Add `@types/jest` to backend tsconfig
  4. Achieve 100% test pass rate

#### C3. MoneyTrash Full Audit
- **Actions:**
  1. Run TypeScript check (`tsc --noEmit`)
  2. Run Vitest (`vitest run`)
  3. Run Playwright E2E tests
  4. Audit Rust code:
     - Check for path traversal in `commands/file.rs`
     - Verify chunk integrity in `commands/upload.rs`
     - Check error handling in `errors.rs`
  5. Audit Cloudflare Worker:
     - Verify rate limiting on upload endpoints
     - Verify JWT auth on upload endpoints
     - Verify R2 bucket permissions
  6. Document all findings

#### C4. MoneyTrash Fixes (if issues found)
- **Actions:**
  1. Fix TypeScript errors
  2. Fix test failures
  3. Add security hardening to Worker handlers
  4. Add input validation to upload endpoints

**Deliverables:**
- Management: 0 TS errors, all tests passing, clean builds
- MoneyTrash: Full audit report, all issues fixed

---

### Stage D: Cross-App Testing & CI/CD (Week 4)

**Goal:** Establish integration testing and automated deployment.

#### D1. Cross-App Integration Tests
- **Actions:**
  1. Create `tests/ecosystem/` directory
  2. Write integration test: "Order Flow"
     - Touch creates order → Master receives → Gallery shows → Stripe pays
  3. Write integration test: "Photo Upload Flow"
     - MoneyTrash uploads → Master processes → Gallery serves → Website embeds
  4. Write integration test: "Sync Flow"
     - Master syncs to Cloud Hub → Management shows analytics

#### D2. GitHub Actions CI/CD
- **Files:** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- **Actions:**
  1. Create CI workflow:
     - Lint all apps
     - Type-check all apps
     - Test all apps
     - Build all apps
  2. Create deploy workflow:
     - Deploy Gallery Worker on merge to main
     - Deploy Management Worker on merge to main
     - Deploy MoneyTrash Worker on merge to main
     - Deploy Website to Cloudflare Pages on merge to main
  3. Add staging deployment step

#### D3. Secret Management Automation
- **Actions:**
  1. Document all required secrets per app
  2. Create `scripts/rotate-secrets.ps1` for secret rotation
  3. Add secret validation to CI (check secrets exist before deploy)

#### D4. Monitoring & Alerting
- **Actions:**
  1. Verify Sentry integration in all apps
  2. Add health check endpoints to all backends
  3. Add uptime monitoring (Cloudflare Observatory already enabled)
  4. Create runbook for common alerts

**Deliverables:**
- Cross-app integration tests passing
- GitHub Actions CI/CD pipeline
- Automated secret rotation
- Monitoring runbook

---

### Stage E: Final Verification & Documentation (Week 5)

**Goal:** Full ecosystem verification and documentation update.

#### E1. Full Ecosystem Test
- **Actions:**
  1. Start all apps via Docker Compose
  2. Run complete customer journey:
     - Book on Website → Photographer shoots → MoneyTrash uploads → Master processes → Touch kiosk selects → Gallery purchases → Management reports
  3. Document any integration gaps

#### E2. Security Penetration Test
- **Actions:**
  1. Run OWASP ZAP against all API endpoints
  2. Verify SQL injection prevention
  3. Verify XSS prevention
  4. Verify CSRF protection
  5. Document findings

#### E3. Performance Benchmark
- **Actions:**
  1. Run Lighthouse on Website
  2. Run load test on Gallery API
  3. Run load test on Management API
  4. Measure Touch kiosk sync time with 1000 photos
  5. Document baseline metrics

#### E4. Documentation Update
- **Files:** `ARCHITECTURE.md`, `README.md`, `DEPLOYMENT.md`, `TESTING_GUIDE.md`
- **Actions:**
  1. Update `ARCHITECTURE.md` with current state
  2. Update `README.md` with quick start
  3. Update `DEPLOYMENT.md` with CI/CD instructions
  4. Update `TESTING_GUIDE.md` with cross-app tests
  5. Create `OPERATIONS_RUNBOOK.md` for on-call

**Deliverables:**
- Full ecosystem test report
- Security penetration test report
- Performance benchmark report
- Updated documentation

---

## 10. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gallery cannot build (584 TS errors) | 🔴 High | 🔴 Critical | Stage B: systematic fix |
| Management build failures persist | 🟡 Medium | 🟡 High | Stage C: root cause analysis |
| MoneyTrash security vulnerabilities | 🟡 Medium | 🔴 Critical | Stage C: full security audit |
| Shared package version conflicts | 🟡 Medium | 🟡 High | Stage A: dependency alignment |
| Cross-app integration breaks | 🟡 Medium | 🔴 Critical | Stage D: integration tests |
| Cloudflare secret leak | 🟢 Low | 🔴 Critical | Stage D: secret rotation automation |
| D1 migration failure on deploy | 🟢 Low | 🟡 High | Stage C: migration verification |
| Tauri Rust compilation issues | 🟢 Low | 🟡 High | Stage C: Rust audit |
| CI/CD pipeline failure | 🟢 Low | 🟡 High | Stage D: incremental rollout |

---

## 11. Production Readiness Checklist

### Per-App Checklist

| App | Build | Tests | TypeScript | Security | Deploy | Docs | Status |
|-----|-------|-------|------------|----------|--------|------|--------|
| Master | ✅ | ✅ | ~6 pre-existing | ✅ | Manual | ✅ | 🟢 Ready |
| Touch | ✅ | ✅ | ~3 pre-existing | ✅ | Manual | ✅ | 🟢 Ready |
| Gallery | 🔴 584 errors | 🔴 8 fail | 🔴 584 errors | 🟡 | Manual | 🟡 | 🔴 Not Ready |
| Management | 🟡 Build logs | 🟡 10 fail | 🟡 29 errors | 🟡 | Manual | 🟡 | 🟡 Not Ready |
| MoneyTrash | ⚪ Unknown | ⚪ Unknown | ⚪ Unknown | ⚪ | Manual | ✅ | ⚪ Unknown |
| Website | ✅ | ✅ | ✅ | ✅ | Manual | ✅ | 🟢 Ready |

### Ecosystem-Wide Checklist

- [ ] All apps build successfully
- [ ] All apps pass tests
- [ ] All apps have 0 TypeScript errors (or documented pre-existing)
- [ ] Cross-app integration tests passing
- [ ] GitHub Actions CI/CD pipeline running
- [ ] Staging environment deployed
- [ ] Production environment deployed
- [ ] Secrets rotated and documented
- [ ] Monitoring and alerting configured
- [ ] Security penetration test completed
- [ ] Performance benchmark completed
- [ ] Operations runbook created
- [ ] On-call rotation documented

---

## 12. Resource Estimation

| Stage | Duration | Agents Needed | Skills |
|-------|----------|---------------|--------|
| A — Foundation | 3-4 days | 2-3 | `docker-essentials`, `Git`, `Coding` |
| B — Gallery Fix | 5-7 days | 3-4 | `swarm-coding`, `cloudflare`, `Coding` |
| C — Management + MoneyTrash | 5-7 days | 3-4 | `swarm-coding`, `cloudflare`, `test-suite-architect` |
| D — Testing + CI/CD | 4-5 days | 2-3 | `test-suite-architect`, `vercel`, `cloudflare` |
| E — Verification + Docs | 3-4 days | 2 | `report-writing`, `test-suite-architect` |
| **Total** | **20-27 days** | **3-4 parallel** | **Multiple** |

---

## 13. Approval Request

**This plan proposes significant changes to:**
- `apps/gallery/` — Backend consolidation, 584 TS error fixes, test fixes
- `apps/management/` — Build fixes, test fixes, backend consolidation
- `apps/moneytrash/` — Full audit and potential fixes
- `packages/` — Dependency alignment, versioning
- Root infrastructure — Docker Compose, CI/CD, GitHub Actions

**Please confirm:**

1. ✅ **Approve full 5-stage plan** — Execute A → B → C → D → E sequentially
2. ⚠️ **Approve Stage A only** — Foundation first, then review before continuing
3. ❌ **Request modifications** — Specify changes

> **Default recommendation:** Approve **Stage A (Foundation)** immediately — it's safe, low-risk, and unblocks all subsequent stages. Then review before proceeding to Stage B (Gallery critical fix).

**Reply with `1`, `2`, or your specific modifications to proceed.**
