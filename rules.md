# ClickFlash Technical Rules & Constraints

This file houses granular architectural rules, security mandates, and code style constraints. For high-level workflows, refer to `AGENTS.md`.

## Security Rules (NEVER violate)

**JWT/Auth**
- Use `jose.jwtVerify()` only — never `atob()` or manual base64 decode.
- Read `JWT_SECRET`/`SESSION_SECRET` from `env[...]`; throw 500 if absent.
- Never put secrets in `wrangler.toml [vars]` — use `wrangler secret put`; Electron uses `getOrCreateSecret()`.

**CSP**
- Never set CSP to `null` (Tauri/Electron).
- Never `'unsafe-inline'` in `scriptSrc` for production; `styleSrc` may allow it for Tailwind only.

**Electron** (`webPreferences` required)
- `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `webSecurity:true`.
- Auto-updater: `publish.provider` required in production electron-builder config.

**Rate Limiting**
- All Express backends: `app.use(rateLimiter)` before routes; auth endpoints use `strictRateLimiter` (5 req/min).
- CF Workers auth: use D1-backed `loginRateLimiter`.

**CORS**
- Never wildcard `*`; dev ports gated behind `isDev`; fail-closed (no `|| '*'` fallback).

## Security Checklist
- [ ] Zod validation for input.
- [ ] Rate limiting on public endpoints.
- [ ] CSRF tokens for state-changing ops.
- [ ] XSS sanitization.
- [ ] Parameterized queries (SQL injection).
- [ ] Auth checks on protected routes.
- [ ] Ed25519 license signing (asymmetric, never obfuscation).
- [ ] AES-256-GCM encrypted transport for paired devices.
- [ ] HKDF-SHA256 key derivation for session keys.
- [ ] Append-only event ledger for financial audit trail.
- [ ] Fail-closed payload verification in installer.
- [ ] Hardware binding for offline licenses (CPU + MB UUID + MAC).

## Architecture Rules

**Monorepo**
- pnpm workspaces; run scripts with `npm --prefix apps/<app> run <script>` from root.
- All `tsx` in npm scripts must use `npx tsx` (bare `tsx` fails on Windows with `--prefix`).

**React** (all apps: 19.2.0)
- Top-level `<ErrorBoundary>` required in every `main.tsx`.
- Server data → `@tanstack/react-query` (with `staleTime`, `gcTime`, `retry:1`, `refetchOnWindowFocus:false`).
- Complex local state → `zustand`; offline cache → `dexie`; nav/UI state → Context API.
- Tailwind CSS with dark mode (`dark:bg-*`).
- Logging: Use `logger` from `@/utils/logger`, NOT console.log.

**Cloudflare Workers** (cloud-backend)
- `compatibility_flags = ["nodejs_compat"]` and `[observability] enabled = true` required.
- Use `@sentry/cloudflare` (NOT `@sentry/node`); wrap with `Sentry.withSentry(env, handler)`.
- Never import Node-only modules (`setInterval`, `http.IncomingMessage`) in Worker code.

**Dependencies**
- Zod: `^4.1.x` everywhere; cross-version range: `"^3.23.8 || ^4.1.0"`.
- Snyk: `continue-on-error` only when `SNYK_TOKEN` absent (fork PRs).
- Verify imports exist before adding/removing deps (grep `src/` first).

**Vite Chunk Splitting**
- Isolate `react-vendor`, `query-vendor`, heavy deps (Stripe, charts, Dexie); `chunkSizeWarningLimit ≤ 600KB`.

## Coding Standards

| Type | Convention |
|------------------------------|------------------|
| Components | PascalCase (`AlbumEditor.tsx`) |
| Hooks/Utils | camelCase (`useAlbums.ts`) |
| Constants | UPPER_SNAKE_CASE |
| Types | PascalCase |

**Import Order**: React → Internal (@/) → Relative → Type-only.

## CI Rules
- `npm audit --audit-level=high` blocks merge — no `continue-on-error` on security gates.
- Lint + typecheck must run for all 6 apps; test coverage threshold enforced via Jest config.
- E2E server startup: use `curl -sf /api/health` health-poll, never `sleep N`.
- Docker: no hardcoded secrets; use `${VAR:?msg}`; `depends_on` with `condition: service_healthy`; API healthcheck at `/api/health`.

## Commit Format (enforced by husky)
- `type(scope): description` — types: `feat fix docs style refactor test chore perf ci build`.
- Scope: single kebab-case word — `fix(gallery)` not `fix(gallery,management)`.

## Token Efficiency Rules
1. **Always plan before acting** - Use `@planning` or create a todo list.
2. **Use targeted searches** - Prefer grep/glob over broad exploration.
3. **Summarize large contexts** - Keep files under 200 lines when possible.
4. **Avoid repetition** - Reference existing patterns via skills/rules.
5. **Lean responses** - 1-3 sentences for simple questions.
