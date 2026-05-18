# ClickFlash v5.0 — Next-Phase Roadmap

## Current State (v4.2.1 — completed)

Phase 1-2 hardening and Phase 0 repo cleanup are done. Security headers, rate limiting,
SQL injection prevention, dead code cleanup, strict TypeScript, Sentry instrumentation,
deployment configs, and full repo organization are all verified and committed.

### Phase 0 Cleanup Summary (v4.2.1, 7 commits, 2026-05-15)
- Removed 6,651 tracked artifacts (~3 GB) from git index
- Hardened `.gitignore` with 40+ new patterns
- Archived 120 stale root `.md` files to `docs/archive/`
- Updated CHANGELOG from v1.0.0 through v4.2.0
- Generated 5 new production docs (monitoring, DR, data sync, scripts, PR template)
- Fixed stale references in README.md and ARCHITECTURE.md

---

## PHASE 0: REPO CLEANUP (v4.2.1) ✅ COMPLETE

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Remove 6,651 tracked artifacts from git index | `4b902eb` | ~6,550 deletions |
| 2 | Harden .gitignore + app-level ignores | `0128791` | 3 files |
| 3 | Archive 120 stale root .md files | `eed03a4` | 121 moves + 1 new |
| 4 | Update CHANGELOG v1.0.0 → v4.2.0 | `db27347` | 1 edit |
| 5 | Generate 5 missing production docs | `b76781e` | 5 new files |
| 6 | Fix stale references in README + ARCHITECTURE | `5cf14dd` | 2 edits |
| 7 | Update v5 roadmap with cleanup phase | (this commit) | 1 edit |

**New docs created:**
- `docs/MONITORING.md` — Sentry, health endpoints, audit logs, alert config
- `docs/DISASTER_RECOVERY.md` — Recovery procedures for 7 failure scenarios
- `docs/DATA_SYNC.md` — Master-to-cloud, touch-to-master, offline, R2 protocol
- `scripts/README.md` — Operational scripts documentation
- `.github/pull_request_template.md` — Standardized PR checklist

---

## PHASE 1: CRITICAL SECURITY FIXES (Ship before hotel go-live) ✅ COMPLETE

### P1-S1. Server-Side Price Validation (CRITICAL)
**File:** `apps/gallery/backend/src/server.ts` line 142
**Risk:** Attackers can submit `price: 0.01` per item and pay pennies for photos.
Client-submitted `items[].price` is trusted directly for Stripe checkout total.
**Fix:** Look up prices from D1 `products` or `pricing` table server-side.
Never use client-submitted price data. Validate item IDs exist and are purchasable.
**Effort:** 4 hours | **Impact:** Revenue protection

### P1-S2. Touch Kiosk Bind to Localhost (HIGH)
**File:** `apps/touch/main.js` line 334
**Risk:** HTTP server on `0.0.0.0` with `CORS: *` exposes `/api/ip` (network topology)
and static files to any device on the hotel LAN.
**Fix:** Bind to `127.0.0.1` instead of `0.0.0.0`. Restrict CORS to `http://localhost:*`.
**Effort:** 30 min | **Impact:** Network security

### P1-S3. Remove `bypassCSP: true` from Master Protocol (HIGH)
**File:** `apps/master/electron-main.js` line 45
**Risk:** Custom `clickflash://` protocol bypasses all CSP — any malicious HTML in
`pb_data/` gets unrestricted script execution in the Electron renderer.
**Fix:** Remove `bypassCSP: true`. Use nonce-based CSP if inline scripts needed.
**Effort:** 1 hour | **Impact:** Renderer compromise prevention

### P1-S4. Hash Kiosk Exit Password (HIGH)
**File:** `apps/touch/main.js` line 517
**Risk:** Kiosk exit password stored as plaintext in SQLite. Physical access = read password.
**Fix:** Store bcrypt hash. Verify with `bcrypt.compare()`.
**Effort:** 1 hour | **Impact:** Physical security

### P1-S5. Remove Hardcoded Kiosk Setup Password (HIGH)
**File:** `apps/touch/scripts/setup-kiosk.ps1` line 59
**Risk:** `StarMaster123!` is in source control. Any attacker who reads the repo
can log into the Windows kiosk user account.
**Fix:** Require password as mandatory deployment parameter with no fallback.
**Effort:** 30 min | **Impact:** Physical access control

---

## PHASE 2: ARCHITECTURE STABILIZATION (v4.3.0)

### P2-A1. Unify Dependency Versions ✅ (28c0f0a)
| Package | Current State | Target |
|---------|--------------|--------|
| react-router-dom | master v7 vs management v6 | v7 everywhere |
| electron-builder | master v26 vs touch v24 | v26 everywhere |
| jest | master v30 vs all v29 | v30 everywhere |
| bcrypt variants | bcrypt, bcryptjs v2, bcryptjs v3 | bcryptjs v3 everywhere |
| @sentry/react | master v8 vs others v10 | v10 everywhere |
| @sentry/tracing | gallery + management | DELETE (deprecated since Sentry v8) |
| vite | moneytrash v6 vs others v7 | v7 everywhere |
**Effort:** 1 day | **Impact:** Build reliability, security patch coverage

### P2-A2. Fix Management tsconfig (Strict Is a Lie) ✅ (526dc3b + 28c0f0a)
**File:** `apps/management/backend/tsconfig.json`
Currently sets `strict: true` but explicitly disables `strictNullChecks`,
`strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`,
`noImplicitThis`, `alwaysStrict` — making `strict` meaningless.
**Fix:** Remove the overrides, fix resulting type errors.
**Effort:** 4 hours | **Impact:** Null safety in production

### P2-A3. Remove Gallery's electron-builder ✅ (28c0f0a)
Gallery is a CF Worker PWA — it has `electron-builder` in devDependencies.
Dead dependency from copy-paste.
**Effort:** 5 min

### P2-A4. Clean Up Gallery tsconfig Exclusions ✅
Gallery excluded 12 source files to pass typecheck. Fixed all type errors:
aiSearchService typo, Zod v4 API migration, Stripe SDK method corrections,
Sentry v10 migration, path alias fixes, local CartItem interface extensions.
All 12 `src/` exclusions removed — `tsc --noEmit` passes clean under strict.
**Effort:** 4 hours | **Impact:** Type safety

### P2-A5. Consolidate Shared Packages (partial ✅)
- ~~`@clickflash/shared` and `@clickflash/backup-service` are declared but unused~~ — DELETED (zero imports confirmed)
- ~~`packages/lib` and `packages/utils` referenced in CLAUDE.md don't exist~~ — DELETED empty dirs, updated CLAUDE.md
- Touch duplicates Button, Card, Input, Modal, Spinner from `packages/ui` — refactor to import (remaining)
**Effort:** 1 day | **Impact:** DRY, maintenance burden

### P2-A6. Fix Migration Numbering Conflicts ✅
Management had duplicate migration numbers (two `002_*`, `003_*`, `011_*`, `014_*`, `019_*`)
plus `01_sync_columns.sql` and `v2_crm_hr.sql` with non-standard naming.
Renumbered 7 files to `023_`–`029_` with traceability comments. All 29 migrations now
have unique 3-digit sequential prefixes.
**Effort:** 2 hours | **Impact:** D1 migration reliability

### P2-A7. Sync Touch auditLogger with Master ✅ (ac11a34)
Backported master's log rotation (RETENTION_DAYS=30, MAX_LOG_SIZE_BYTES=50MB,
`rotateLogs()` on init) and `logSecurityEvent()` method to touch's auditLogger.
**Effort:** 30 min | **Impact:** Security observability at kiosk level

---

## PHASE 3: REVENUE & GROWTH (v5.0.0)

### P3-R1. WhatsApp Gallery Delivery ✅
FloatingWhatsApp exists on website. Gallery already generates magic links.
WhatsApp share button added to both OrderManagementView (detail header)
and OrdersList (action menu). Opens `wa.me` deep link with pre-filled
message containing gallery magic link (uses `magic_link_token` or `albumId`).
Button only renders when `albumId` is present on the order.
**Impact:** 3-5x gallery open rate vs email

### P3-R2. Dynamic Pricing Engine ✅ (41bbd29)
D1 migrations add `pricing_overrides` (per-hotel) and `seasonal_rates` (date-range
multipliers) tables to both gallery and management. Gallery worker serves
`GET /api/pricing?hotelId=&date=` to resolve effective prices. Management UI has
full PricingRulesPanel with CRUD for overrides and seasonal multipliers.
Products table enhanced with `status`, `description`, `tier` columns.
**Remaining:** Volume pricing rules, bundle discount logic.
**Impact:** Revenue per hotel, upsell potential

### P3-R3. Multi-Currency Checkout ✅
`AVAILABLE_CURRENCIES` and `useCurrency` hooks already exist. Currency
formatting helpers are wired through gallery and touch.
Stripe checkout now accepts currency from request body (gallery backend
`server.ts`, master `stripeService.ts`). Both validate against allowlist
`[eur, usd, gbp, tnd]` with `eur` as default. Frontend services
(`stripeService.ts`, `stripeEdgeService.ts`) pass selected currency.
`CheckoutModal` reads `useCurrency()` and passes `currency.code` through
`PaymentForm` to the payment intent API call.
**Remaining:** Wire currency selector into touch kiosk order flow.
**Impact:** Conversion rate for international guests

### P3-R4. Abandoned Cart Recovery ✅ (6ef2652)
D1 migration 013 creates `abandoned_carts` table with session-based dedup.
Gallery worker adds `POST /api/cart/snapshot` (public, rate-limited) and
`POST /api/cart/recovered` endpoints. Hourly Cron Trigger queries carts idle
>1 hour and sends Resend recovery emails with gallery deep links.
Frontend `useCartSync` hook debounces (5s) cart snapshots to D1 when email is
known. `markCartRecovered()` called on checkout success to suppress false positives.
**Impact:** 5-15% revenue recovery

### P3-R5. AI Photo-to-Guest Matching (~70% complete)
Face detection UI scaffolding exists in Photos.tsx. Service layer stubbed.
Master has BlazeFace/face-api.js integration for local face detection.
**Remaining:** Pre-compute face embeddings during photo import (batch worker),
build embedding index for fast search, connect touch kiosk face-search UI
to master's face matching API.
**Effort:** 1 week remaining | **Impact:** Massive UX improvement, photographer time savings

---

## PHASE 4: SCALE-UP INFRASTRUCTURE (v5.1.0 — 3 to 30 hotels)

### P4-I1. Database-Backed Hotel Registry
Hotel list is hardcoded in management constants (3 hotels).
Build: self-service hotel onboarding, per-hotel config, tenant isolation.
**Effort:** 1 week

### P4-I2. Automated Provisioning Pipeline
Adding a hotel requires manual config of master, kiosk, env files, bootstrap.json.
Build: onboarding wizard that generates configs and ships pre-configured installers.
**Effort:** 2 weeks

### P4-I3. Hotel GM Self-Service Portal
Hotels cannot currently see revenue, approve kiosk content, or configure preferences.
Build: lightweight hotel-facing dashboard (separate from management app).
**Effort:** 2 weeks

### P4-I4. Fleet-Wide Observability Dashboard
No centralized log aggregation. No distributed tracing across master-touch-gallery.
For 30 hotels, need: Grafana/Datadog dashboard, fleet health overview,
alert rules for offline kiosks, sync failures, payment anomalies.
**Effort:** 1 week

### P4-I5. Multilingual Guest Experience
Gallery and touch have no i18n. European tourists in Tunisia speak French,
German, English, Russian. Add i18next or similar across guest-facing surfaces.
**Effort:** 1 week

---

## PHASE 5: TESTING & CI MATURITY (ongoing)

### P5-T1. Integration Tests for Payment Flow
No test covers the full checkout → webhook → order creation → photo access flow.
This is the highest-risk untested path.
**Effort:** 3 days

### P5-T2. Cross-App E2E Tests
No test verifies the master → cloud sync → gallery → customer view pipeline.
Build ecosystem-level Playwright tests.
**Effort:** 1 week

### P5-T3. Management ESLint Setup ✅
ESLint 10 flat config with TypeScript + React hooks rules. Replaced `echo` stub
with real `eslint src --max-warnings 500`. Fixed all errors: conditional hooks
in VirtualGrid/VirtualList (restructured hook ordering), empty catches, useless
try/catch wrappers, stale inline disable comments. 0 errors, 470 warnings (all
pre-existing `any`/unused-vars/no-console).
**Effort:** 2 hours

### P5-T4. Shared Logger Package
master and touch each have their own `auditLogger.ts` (duplicated).
Management and gallery rely on Sentry alone with no structured logger.
Extract to `@clickflash/logger` package.
**Effort:** 1 day

### P5-T5. Add MoneyTrash to CI Typecheck (NEW)
MoneyTrash app is missing from the `typecheck:ci` job in `.github/workflows/ci.yml`.
All other 5 apps have `tsc --noEmit` steps — moneytrash was never added.
**Fix:** Add `npm --prefix apps/moneytrash run typecheck` step to the CI typecheck job.
**Effort:** 15 min | **Impact:** Prevents type regressions in moneytrash

---

## Deployment Gaps (discovered 2026-05-17)

These must be resolved before first hotel go-live:

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| D1 | Cloud secrets not automated | HIGH | `wrangler secret put` must be run manually for JWT_SECRET, STRIPE_SECRET_KEY, R2 credentials. No `.env.production` template exists. Create a `scripts/provision-secrets.sh` checklist. |
| D2 | D1 migrations not automated | HIGH | No CI step runs `wrangler d1 migrations apply`. Migrations must be applied manually before each deploy. Add to deploy pipeline. |
| D3 | Electron code signing disabled | MEDIUM | `apps/master/electron-builder.yml` and `apps/touch/electron-builder.yml` have no `certificateFile` / `certificatePassword`. Windows SmartScreen will block unsigned installers. |
| D4 | Touch electron-builder version mismatch | LOW | Master uses electron-builder v26, touch uses v24. May cause inconsistent installer behavior. Align to v26 (tracked in P2-A1). |
| D5 | Master migration prefix collisions | LOW | 6 pairs of migrations share the same numeric prefix (001, 002, 005, 025, 046, 053, 056, 057, 058). Run order is alphabetical within prefix — safe but fragile. Renumber on next schema change. |

---

## Priority Matrix

| Priority | Items | Timeline | Status |
|----------|-------|----------|--------|
| REPO CLEANUP | Phase 0 (7 tasks) | Done | ✅ Complete |
| BEFORE GO-LIVE | P1-S1 through P1-S5 | Done | ✅ Complete |
| v4.3.0 | P2-A1 through P2-A7 | Done (A5 partial) | ✅ Complete |
| v5.0.0 | P3-R1 through P3-R5 | 1-2 months | R1 ✅ R2 ✅ R3 ✅ R4 ✅ (R5 remaining) |
| v5.1.0 | P4-I1 through P4-I5 | 2-3 months | Planned |
| Ongoing | P5-T1 through P5-T5 | Continuous | In progress |
| Deploy | D1 through D5 | Before go-live | Blocking |

---

## Full Ecosystem Test Results (v4.2.1, 2026-05-17)

All 6 apps tested end-to-end. 27-photo album imported from real portfolio.

| App | Port | Startup | UI Render | Key Features Tested |
|-----|------|---------|-----------|-------------------|
| Master Backend | :8090 | ✅ | N/A | Health API 200, v4.2.0, SQLite WAL, worker pools |
| Master Frontend | :5174 | ✅ | ✅ | Login, dashboard, albums (27-photo import), photo editor, orders, Resort BI |
| Touch Kiosk | :5175 | ✅ | ✅ | Welcome screen, master connection UI, photo browsing, kiosk navigation lock |
| Gallery | :5176 | ✅ | ✅ | Customer service landing, B2B access code input, buy/download tabs |
| Management | :5177 | ✅ | ✅ | Login portal, access identifier, security passphrase, initialize flow |
| Website | :3001 | ✅ | ✅ (curl) | Next.js SSR compilation, homepage 200, all routes compile |
| MoneyTrash | :5178 | ✅ | ✅ (curl) | Vite dev server, upload interface serves |

**Issues found:**
- `pdfmake` 0.3.x breaks CJS `require()` — pinned to `~0.2.23` (fix committed)
- `npm --prefix` doesn't add `node_modules/.bin` to PATH on Windows — use `npx` from app directory
- Website SSR first-compile takes ~15s per page (expected Next.js behavior)
- Master migration prefixes have 6 collisions (tracked in D5 above)
- Admin PIN verification uses separate `admin_pin_hash` in settings table (not user password)

**No critical errors.** Zero uncaught exceptions in Management console. Gallery and Touch
render clean professional UIs. All apps start without crashes.

---

## Production Readiness Checklist (v4.2.0)

- [x] SQL injection prevention (column allowlists)
- [x] Stripe webhook signature verification
- [x] IntersectionObserver lifecycle fix
- [x] Rate limiter cleanup (touch)
- [x] Dead CJS code removal (management + gallery)
- [x] Strict TypeScript (management backend)
- [x] Security headers on all CF Worker responses
- [x] CORS fail-closed (both workers)
- [x] D1 bindings + R2 buckets configured
- [x] Sentry instrumentation (both workers)
- [x] Auth rate limiting (both workers)
- [x] AuditLogger log rotation (master)
- [x] Vite dev script fix (management)
- [x] P1-S1: Server-side Stripe price validation (53325f3)
- [x] P1-S2: Touch bind to localhost (877b0d4)
- [x] P1-S3: Remove bypassCSP (877b0d4)
- [x] P1-S4: Hash kiosk password with bcrypt auto-upgrade (877b0d4)
- [x] P1-S5: Remove hardcoded setup password (877b0d4)
