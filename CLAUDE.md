# ClickFlash Monorepo — AI Guardrails

This file encodes security patterns, architectural rules, and coding standards enforced during the FAANG-level audit. Future AI sessions MUST follow these rules.

---

## 🔒 Security Rules (NEVER violate)

### JWT / Authentication
- **NEVER** decode JWTs with `atob()` or manual base64 decode. Always use `jose.jwtVerify()` with algorithm enforcement (`{ algorithms: ['HS256'] }`) — see `apps/gallery/backend/src/tenantIsolation.ts`
- **NEVER** store JWT secrets as hardcoded strings. Always read from `env['JWT_SECRET']` and throw 500 if absent
- **NEVER** expose `JWT_SECRET` or `SESSION_SECRET` in `wrangler.toml` `[vars]` section. Use `wrangler secret put` for Cloudflare Workers; use `getOrCreateSecret()` pattern for Electron apps (see `apps/master/backend/config/constants.ts`)

### Content Security Policy (CSP)
- **NEVER** set CSP to `null` in Tauri or Electron apps (previous Moneytrash CSP=null was a critical XSS vulnerability)
- **NEVER** include `'unsafe-inline'` in `scriptSrc` for production CSP in Electron backends
- CSP in Electron backends: `scriptSrc` allows only `'self'`; `styleSrc` may allow `'unsafe-inline'` only if required for Tailwind

### Electron Security
- `webPreferences` MUST have: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`
- See `apps/touch/electron/main.js` and `apps/master/electron-main.js` for reference
- Auto-updater MUST be configured in production electron-builder config with `publish.provider`

### Rate Limiting
- All Express backends MUST call `app.use(rateLimiter)` globally before route mounting
- Auth endpoints (`/api/auth/login`, `/api/auth/signup`) MUST use `strictRateLimiter` (5 req/min)
- Cloudflare Worker auth endpoints MUST use the D1-backed login rate limiter (`apps/gallery/backend/src/loginRateLimiter.ts`)

### CORS
- **NEVER** use wildcard `*` CORS origins
- Dev ports (`:5173`, `:5174`) MUST be gated behind `isDev` check
- Production origins read from `CORS_ORIGINS` env var or explicit LAN-only allowlist

---

## 🏗️ Architecture Rules

### Monorepo Structure
- 6 apps: `master` (Electron), `touch` (Electron kiosk), `gallery` (CF Worker PWA), `management` (CF Worker), `website` (Next.js), `moneytrash` (Tauri)
- 6 shared packages: `@clickflash/types`, `@clickflash/ui`, `@clickflash/shared`, `@clickflash/backup-service`, `@clickflash/lib`, `@clickflash/utils`
- Package manager: **pnpm workspaces** — use `npm --prefix apps/<app> run <script>` from repo root, never `cd apps/<app> && npm run`
- All `tsx` invocations in npm scripts MUST use `npx tsx` (bare `tsx` fails on Windows with `npm --prefix`)

### React Ecosystem
- **All apps use React 19.2.0** — do NOT downgrade or mix versions
- **ALL React apps MUST have a top-level `<ErrorBoundary>` at `main.tsx`** wrapping the entire app
- React Query `QueryClient` MUST be configured with `staleTime`, `gcTime`, `retry: 1`, `refetchOnWindowFocus: false` — see `apps/gallery/src/main.tsx`
- Context API is appropriate for navigation/UI state only (Management pattern). Server data MUST use React Query, not Context

### State Management Pattern
- Server/async data: `@tanstack/react-query`
- Cross-app UI state: React Context (small state only)
- Complex local state: `zustand` (Gallery, Master)
- IndexedDB offline cache: `dexie`

### Cloudflare Workers
- Both Gallery and Management workers must have `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml`
- Both workers must have `[observability] enabled = true`
- NEVER import Node.js-only modules (`setInterval`, `http.IncomingMessage`) in Worker code
- Use `@sentry/cloudflare` (NOT `@sentry/node`) for error monitoring in Workers
- Wrap the Worker handler with `Sentry.withSentry(env, handler)` pattern

---

## 📦 Dependency Rules

- **Zod**: All apps and packages use `^4.1.x`. NEVER add `^3.x` peer deps — use `"^3.23.8 || ^4.1.0"` range if cross-version support is needed
- **Google AI SDK**: Management uses `@google/generative-ai` (old SDK, v0.24); Gallery uses no AI SDK (removed as dead dep). Migrate to `@google/genai` only as a planned task
- **Dead deps**: Before adding a new dep, verify it's actually imported. Before removing, grep all `src/` for the import
- **Tree-shakeable deps**: `lucide-react` is safe to import directly; no barrel import restrictions needed

### Chunk Splitting (Vite)
All Vite apps MUST have `manualChunks` isolating at minimum:
- `react-vendor`: `react`, `react-dom`
- `query-vendor`: `@tanstack/react-query`
- Heavy optional deps (Stripe, charts, Dexie) in their own chunks
- `chunkSizeWarningLimit` should be ≤ 600KB

---

## 🧪 Testing & CI Rules

- `npm audit --audit-level=high` MUST block merge — no `continue-on-error` for security gates
- Snyk may use `continue-on-error` only when `SNYK_TOKEN` is absent (fork PRs)
- Lint and typecheck MUST run for ALL 6 apps in CI, not just `master`
- E2E server startup MUST use health-poll (`curl -sf /api/health`) not `sleep N`
- Test coverage threshold is enforced via Jest config — do NOT lower it

---

## 🐳 Docker / Infrastructure

- `docker-compose.yml` MUST NOT hardcode any secret values — use `${VAR:?error message}` substitution
- All services that depend on the API MUST use `condition: service_healthy`
- The API service MUST have a Docker `healthcheck` polling `/api/health`

---

## 📝 Commit Message Format

The pre-commit hook enforces: `type(scope): description`

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`

Scope must be a single kebab-case word (no commas): `fix(frontend)` not `fix(gallery,management)`

---

## 🚫 Anti-Patterns to Avoid

1. `atob()` for JWT parsing — use `jose.jwtVerify()`
2. `continue-on-error: true` on security CI steps
3. `sleep N` for server startup in CI — use health polls
4. Hardcoded secrets in any committed file
5. `unsafe-inline` in production scriptSrc CSP
6. Missing top-level error boundary in React apps
7. `app.use(rateLimiter)` missing in Express backends
8. `depends_on: [service]` without `condition: service_healthy` in docker-compose
9. Bare `tsx` in npm scripts (use `npx tsx`)
10. Importing `@sentry/node` in Cloudflare Workers
