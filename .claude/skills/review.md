---
name: review
description: Pre-commit/pre-PR code review checklist for ClickFlash. Blocks merge on any security failure.
triggers:
  - review
  - code review
  - PR review
  - check my code
  - ready to merge
---

# Review: Code Review Checklist

## Security — block merge if any fail

**Auth & Secrets**
- [ ] No secrets hardcoded anywhere (no string literals in JWT/session init)
- [ ] JWT uses `jose.jwtVerify()` with `{ algorithms: ['HS256'] }`
- [ ] `JWT_SECRET` / `SESSION_SECRET` read from `env[...]`; throws 500 if absent
- [ ] CF Workers: secrets via `wrangler secret put`, not `wrangler.toml [vars]`

**CORS & CSP**
- [ ] CORS: exact origin comparison, no `|| '*'` fallback, no substring match
- [ ] Dev ports (`5173`, `5174`) gated behind `isDev` check
- [ ] CSP: not `null`, no `'unsafe-inline'` in `scriptSrc`

**Electron**
- [ ] `webPreferences`: `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `webSecurity:true`

**Rate Limiting & Input**
- [ ] Express: `app.use(rateLimiter)` present before route mounting
- [ ] Auth endpoints (`/api/auth/login`, `/api/auth/signup`) use `strictRateLimiter`
- [ ] All external inputs validated with Zod schema
- [ ] SQL: parameterized queries only — never string concatenation into queries

---

## Architecture

- [ ] React app has top-level `<ErrorBoundary>` in `main.tsx`
- [ ] Server data uses `@tanstack/react-query`, not Context or `useState`
- [ ] CF Workers: `nodejs_compat` in `wrangler.toml`; `[observability] enabled = true`
- [ ] CF Workers: `@sentry/cloudflare` (NOT `@sentry/node`); `Sentry.withSentry(env, handler)` wrapping
- [ ] npm scripts use `npx tsx` not bare `tsx`
- [ ] `npm --prefix apps/<app>` pattern used from root
- [ ] Zod version is `^4.1.x` — no new `^3.x` only deps added

---

## Code Quality

- [ ] No `any` type escape without a comment explaining why it's unavoidable
- [ ] `memo()` components have `.displayName` set
- [ ] `logger` utility used, not `console.log` directly
- [ ] New Vite app has `manualChunks` for `react-vendor` and `query-vendor`
- [ ] `chunkSizeWarningLimit ≤ 600KB`
- [ ] Dead imports and unused variables removed

---

## CI / Infrastructure

- [ ] `npm audit --audit-level=high` passes (no `continue-on-error` on this step)
- [ ] Lint and typecheck pass for all affected apps
- [ ] E2E server startup uses health-poll (`curl -sf /api/health`), not `sleep N`
- [ ] Docker `depends_on` uses `condition: service_healthy`
- [ ] Docker compose has no hardcoded secrets — uses `${VAR:?msg}` substitution
- [ ] Commit message matches `type(scope): description` format (single scope)
