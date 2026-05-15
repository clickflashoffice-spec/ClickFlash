# ClickFlash — AI Guardrails

## Security Rules (NEVER violate)

**JWT/Auth**
- Use `jose.jwtVerify()` only — never `atob()` or manual base64 decode
- Read `JWT_SECRET`/`SESSION_SECRET` from `env[...]`; throw 500 if absent
- Never put secrets in `wrangler.toml [vars]` — use `wrangler secret put`; Electron uses `getOrCreateSecret()` (see `apps/master/backend/config/constants.ts`)

**CSP**
- Never set CSP to `null` (Tauri/Electron)
- Never `'unsafe-inline'` in `scriptSrc` for production; `styleSrc` may allow it for Tailwind only

**Electron** (`webPreferences` required): `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `webSecurity:true`
- Reference: `apps/touch/electron/main.js`, `apps/master/electron-main.js`
- Auto-updater: `publish.provider` required in production electron-builder config

**Rate Limiting**
- All Express backends: `app.use(rateLimiter)` before routes; auth endpoints use `strictRateLimiter` (5 req/min)
- CF Workers auth: use D1-backed `loginRateLimiter` (`apps/gallery/backend/src/loginRateLimiter.ts`)

**CORS**: Never wildcard `*`; dev ports gated behind `isDev`; fail-closed (no `|| '*'` fallback)

---

## Architecture Rules

**Monorepo**
- pnpm workspaces; run scripts with `npm --prefix apps/<app> run <script>` from root
- All `tsx` in npm scripts must use `npx tsx` (bare `tsx` fails on Windows with `--prefix`)

**Apps**: `master` (Electron :8090), `touch` (Electron :8091), `gallery` (CF Worker PWA), `management` (CF Worker), `website` (Next.js), `moneytrash` (Tauri)
**Packages**: `@clickflash/types`, `ui`

**React** (all apps: 19.2.0)
- Top-level `<ErrorBoundary>` required in every `main.tsx`
- Server data → `@tanstack/react-query` (with `staleTime`, `gcTime`, `retry:1`, `refetchOnWindowFocus:false`)
- Complex local state → `zustand`; offline cache → `dexie`; nav/UI state → Context API

**Cloudflare Workers** (gallery, management)
- `compatibility_flags = ["nodejs_compat"]` and `[observability] enabled = true` required
- Use `@sentry/cloudflare` (NOT `@sentry/node`); wrap with `Sentry.withSentry(env, handler)`
- Never import Node-only modules (`setInterval`, `http.IncomingMessage`) in Worker code

**Dependencies**
- Zod: `^4.1.x` everywhere; cross-version range: `"^3.23.8 || ^4.1.0"`
- Snyk: `continue-on-error` only when `SNYK_TOKEN` absent (fork PRs)
- Verify imports exist before adding/removing deps (grep `src/` first)

**Vite chunk splitting** (all Vite apps): isolate `react-vendor`, `query-vendor`, heavy deps (Stripe, charts, Dexie); `chunkSizeWarningLimit ≤ 600KB`

---

## CI Rules
- `npm audit --audit-level=high` blocks merge — no `continue-on-error` on security gates
- Lint + typecheck must run for all 6 apps; test coverage threshold enforced via Jest config
- E2E server startup: use `curl -sf /api/health` health-poll, never `sleep N`
- Docker: no hardcoded secrets; use `${VAR:?msg}`; `depends_on` with `condition: service_healthy`; API healthcheck at `/api/health`

---

## Commit Format (enforced by husky)
`type(scope): description` — types: `feat fix docs style refactor test chore perf ci build`
Scope: single kebab-case word — `fix(gallery)` not `fix(gallery,management)`
