# ClickFlash Ecosystem — Audit Findings
> Generated: 2026-04-01 | Scope: Full monorepo (7 apps)

---

## CRITICAL FINDINGS (Fix immediately)

### [CRIT-1] Hardcoded JWT Secrets in wrangler.toml
**Affected files:**
- `apps/gallery/backend/wrangler.toml` line 23 — `JWT_SECRET = "<REDACTED:GALLERY_JWT_SECRET>"`
- `apps/management/backend/wrangler.toml` line 16 — `JWT_SECRET = "<REDACTED:MANAGEMENT_JWT_SECRET>"`
- `apps/gallery/backend/src/config.ts` line 5 — `export const JWT_SECRET = 'your-256-bit-secret'`

**Impact:** Anyone with repo access can forge valid JWTs for gallery and management — full account takeover.

**Fix:** Move to Cloudflare secrets:
```bash
wrangler secret put JWT_SECRET --config apps/gallery/backend/wrangler.toml
wrangler secret put JWT_SECRET --config apps/management/backend/wrangler.toml
```
Remove from `[vars]` sections and from `config.ts`.

---

## HIGH FINDINGS

### [HIGH-1] JWT Tokens Stored in localStorage
**Affected files:**
- `apps/gallery/src/services/pb.ts` lines 48–50, 73
- `apps/management/src/services/pb.ts` (same pattern)

**Impact:** Any XSS vulnerability allows attacker to exfiltrate auth tokens. localStorage is readable by all JS on the page.

**Fix:** Migrate to `httpOnly` + `SameSite=Strict` cookies, or at minimum use `sessionStorage` with explicit clear-on-tab-close.

---

### [HIGH-2] CORS Wildcard Fallback in Production
**Affected files:**
- `apps/gallery/backend/src/server.ts` lines 28–30 — fallback to `'*'` if no allowed origins match
- `apps/management/backend/src/server.ts` lines 45–52 — accepts any origin containing `"clicketflash.com"` or `"localhost"` (typo: `clicketflash` vs `clickflash`)

**Impact:** Management backend accepts requests from `evil-clicketflash.com` due to substring match. Production gallery can fall back to `*`.

**Fix:**
1. Replace substring matching with exact origin comparison
2. Remove `|| '*'` fallback — fail closed instead
3. Fix typo: `clicketflash.com` → `clickflash.com`

---

## MEDIUM FINDINGS

### [MED-1] TypeScript Errors in Management App
**Affected files (from saved `tsc_output_9.txt`):**
- `src/services/geminiService.ts` — Cannot find module `@google/genai` (missing dependency / wrong package name — should be `@google/generative-ai`)
- `src/services/geminiService.ts` line 164 — calling `.get` accessor as function
- `src/services/pbManagement.ts` line 425 — wrong argument count (3 args, expects 1–2)

**Impact:** These cause runtime errors in AI chat and management data service.

**Fix:** Install correct package, fix call signatures.

---

### [MED-2] Three Charting Libraries in Management App
**File:** `apps/management/package.json`

`apexcharts` + `chart.js` + `recharts` are all installed and used. This adds ~400KB to the bundle with overlapping functionality.

**Fix:** Standardize on one (Recharts is already used in gallery — prefer that).

---

### [MED-3] Electron 29.x EOL in Gallery App
**File:** `apps/gallery/package.json` — `"electron": "^29.1.0"`

Electron 29 reached EOL in September 2024. It will not receive security patches.
Master and Touch already run Electron 39.x.

**Fix:** Upgrade gallery Electron to match master/touch (`^39.2.7`).

---

### [MED-4] `@google/generative-ai: "latest"` in Management
**File:** `apps/management/package.json`

Unpinned `latest` tag means any `npm install` may pull a breaking major version.

**Fix:** Pin to a specific version, e.g. `"@google/generative-ai": "^0.24.0"`.

---

### [MED-5] Management Vite Config Missing Chunk Splitting
**File:** `apps/management/vite.config.ts`

No `manualChunks`, no `chunkSizeWarningLimit`. With 3 charting libs + Google AI SDK + Sentry, the main bundle likely exceeds 1MB.

**Fix:** Add:
```ts
rollupOptions: {
  output: {
    manualChunks: {
      'vendor-react': ['react', 'react-dom'],
      'vendor-charts': ['recharts'],        // drop apexcharts + chart.js
      'vendor-ai': ['@google/generative-ai'],
    },
    chunkSizeWarningLimit: 600,
  }
}
```

---

### [MED-6] Always-On Sourcemaps in Management Build
**File:** `apps/management/vite.config.ts` — `sourcemap: true` (hardcoded, not mode-conditional)

Production sourcemaps expose original source code structure to end users.

**Fix:** `sourcemap: mode === 'development'`

---

### [MED-7] TensorFlow Not Split in Master Bundle
**File:** `apps/master/vite.config.ts`

`@tensorflow/tfjs` + model files are not in `manualChunks`. This is ~1.5MB of ML code that most screens never need.

**Fix:** Add lazy loading for face detection features and split TF into its own chunk.

---

## LOW FINDINGS

### [LOW-1] Moneytrash `compatibility_date` Set to Future Date
**File:** `apps/moneytrash/cloudflare/wrangler.toml`

`compatibility_date = "2026-03-12"` — a future date forces Cloudflare Workers to use unstable API flags.

**Fix:** Set to current or past date, e.g. `"2025-01-01"`.

---

### [LOW-2] Website `compatibility_date` Stale
**File:** `apps/website/wrangler.toml`

`compatibility_date = "2024-02-08"` — over a year old. May be missing newer Workers performance flags.

**Fix:** Update to `"2025-01-01"` or latest.

---

### [LOW-3] Rate Limiting Too Permissive on Auth Endpoints
**Files:** `apps/gallery/backend/shared/rateLimiter.js`, `apps/management/backend/shared/rateLimiter.js`

Default: 100 req/min globally. Auth endpoints (`/api/auth/login`) should have a much stricter limit (5–10 req/min) to prevent brute force.

**Fix:** Apply separate stricter limiter to login routes.

---

## TEST COVERAGE GAPS

| App | Test Files | Major Untested Areas |
|-----|-----------|---------------------|
| **gallery** | 10 | bookings, photographers, products, settings, editor |
| **management** | 12 | bookings, HR routes, payroll, fleet, inventory |
| **master** | 34 (good) | marketing, culling UI, ordering |
| **touch** | 7 | all kiosk components, services, context |
| **website** | 7 | no unit tests — E2E only |
| **moneytrash** | 6 | components, most services, upload retry logic |

**Highest-risk untested paths:**
1. Touch kiosk cart + checkout flow (no component tests)
2. Management HR/payroll routes (sensitive data, no backend tests)
3. Gallery payment + order completion (partial coverage only)

---

## DEPENDENCY CVE STATUS
> Note: `pnpm audit` was blocked (pnpm not on PATH). Recommend running manually: `pnpm audit --audit-level=high`

Key version flags to check:
- Electron 29.x (gallery) — likely has CVEs; upgrade to 39.x
- `@google/generative-ai: latest` (management) — pin before auditing

---

## POSITIVE FINDINGS

- **Electron BrowserWindow config is secure** — both master and touch use `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- **Master has comprehensive kiosk hardening** — keyboard shortcuts blocked, navigation restricted, crash recovery, admin breakout shortcut logged
- **SQL queries use parameterized binding** throughout gallery and management backends (D1 `.bind()`)
- **Rate limiting is implemented** on both gallery and management backends
- **Stripe key logging protection** — logger in gallery redacts Stripe keys from logs
- **Moneytrash wrangler.toml** correctly uses `[secrets]` (not `[vars]`) for sensitive keys — this is the right pattern

---

## REMEDIATION PRIORITY ORDER

| Priority | Finding | Effort |
|----------|---------|--------|
| 1 | CRIT-1: Move JWT secrets to Cloudflare secrets | Low (2 CLI commands) |
| 2 | HIGH-2: Fix CORS typo + remove wildcard fallback | Low (5 lines) |
| 3 | HIGH-1: Migrate tokens from localStorage | Medium |
| 4 | MED-1: Fix TypeScript errors in management | Low–Medium |
| 5 | MED-3: Upgrade Electron in gallery | Low |
| 6 | MED-2: Remove duplicate charting libs | Medium |
| 7 | MED-4: Pin `@google/generative-ai` version | Trivial |
| 8 | LOW-1/2: Fix wrangler.toml dates | Trivial |
| 9 | MED-5/6/7: Bundle optimization | Medium |
| 10 | Test coverage gaps (touch + management) | High effort |
