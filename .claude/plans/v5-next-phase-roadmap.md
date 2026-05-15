# ClickFlash v5.0 — Next-Phase Roadmap

## Current State (v4.2.0 — completed)

Phase 1-2 hardening is done. Security headers, rate limiting, SQL injection prevention,
dead code cleanup, strict TypeScript, Sentry instrumentation, and deployment configs
are all verified and committed. **4 commits shipped** this session.

---

## PHASE 1: CRITICAL SECURITY FIXES (Ship before hotel go-live)

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

### P2-A1. Unify Dependency Versions
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

### P2-A2. Fix Management tsconfig (Strict Is a Lie)
**File:** `apps/management/backend/tsconfig.json`
Currently sets `strict: true` but explicitly disables `strictNullChecks`,
`strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`,
`noImplicitThis`, `alwaysStrict` — making `strict` meaningless.
**Fix:** Remove the overrides, fix resulting type errors.
**Effort:** 4 hours | **Impact:** Null safety in production

### P2-A3. Remove Gallery's electron-builder
Gallery is a CF Worker PWA — it has `electron-builder` in devDependencies.
Dead dependency from copy-paste.
**Effort:** 5 min

### P2-A4. Clean Up Gallery tsconfig Exclusions
Gallery excludes 10 source files (PhotoGrid, useCartStore, sentry, payment schemas)
to pass typecheck. These need real type fixes, not exclusions.
**Effort:** 4 hours | **Impact:** Type safety

### P2-A5. Consolidate Shared Packages
- `@clickflash/shared` and `@clickflash/backup-service` are declared but unused — delete or implement
- `packages/lib` and `packages/utils` referenced in CLAUDE.md don't exist — update docs
- Touch duplicates Button, Card, Input, Modal, Spinner from `packages/ui` — refactor to import
**Effort:** 1 day | **Impact:** DRY, maintenance burden

### P2-A6. Fix Migration Numbering Conflicts
Management has duplicate migration numbers (two `011_*`, two `014_*`, two `019_*`).
Renumber to sequential order. Add a migration naming convention doc.
**Effort:** 2 hours | **Impact:** D1 migration reliability

---

## PHASE 3: REVENUE & GROWTH (v5.0.0)

### P3-R1. WhatsApp Gallery Delivery
FloatingWhatsApp exists on website. Gallery already generates magic links.
Connect them: photographer sends gallery link via `wa.me` deep link from
master app order screen. WhatsApp is the dominant channel in Tunisia.
**Effort:** 2 days | **Impact:** 3-5x gallery open rate vs email

### P3-R2. Dynamic Pricing Engine
`MOCK_PRODUCTS` with hardcoded prices in constants files.
Build: D1-backed product catalog, per-hotel pricing tiers, seasonal rates,
bundle discounts, volume pricing.
**Effort:** 1 week | **Impact:** Revenue per hotel, upsell potential

### P3-R3. Multi-Currency Checkout
`AVAILABLE_CURRENCIES` and `useCurrency` hooks already exist.
Wire the currency selector into gallery checkout and touch kiosk.
Tourists pay in their preferred currency.
**Effort:** 2 days | **Impact:** Conversion rate for international guests

### P3-R4. Abandoned Cart Recovery (Complete the Loop)
CampaignEditor UI with trigger events is fully built. Backend services
are stubbed with `@ts-ignore`. Wire `marketingService` to Resend (already
a dependency). Management cron handler already has the abandoned cart query.
**Effort:** 3 days | **Impact:** 5-15% revenue recovery

### P3-R5. AI Photo-to-Guest Matching
Face detection UI scaffolding exists in Photos.tsx. Service layer stubbed.
Connect to Cloudflare Workers AI or AWS Rekognition for automatic
guest-photo matching by face. Single most impactful feature for conversion.
**Effort:** 2 weeks | **Impact:** Massive UX improvement, photographer time savings

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

### P5-T3. Management ESLint Setup
Lint script is `echo No lint issues found.` — add real ESLint config.
**Effort:** 2 hours

### P5-T4. Shared Logger Package
master and touch each have their own `auditLogger.ts` (duplicated).
Management and gallery rely on Sentry alone with no structured logger.
Extract to `@clickflash/logger` package.
**Effort:** 1 day

---

## Priority Matrix

| Priority | Items | Timeline |
|----------|-------|----------|
| BEFORE GO-LIVE | P1-S1 through P1-S5 | This week |
| v4.3.0 | P2-A1 through P2-A6 | 1-2 weeks |
| v5.0.0 | P3-R1 through P3-R5 | 1-2 months |
| v5.1.0 | P4-I1 through P4-I5 | 2-3 months |
| Ongoing | P5-T1 through P5-T4 | Continuous |

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
- [ ] **P1-S1: Server-side price validation** (BLOCKS GO-LIVE)
- [ ] P1-S2: Touch bind to localhost
- [ ] P1-S3: Remove bypassCSP
- [ ] P1-S4: Hash kiosk password
- [ ] P1-S5: Remove hardcoded setup password
