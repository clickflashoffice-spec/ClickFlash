---
name: debug
description: Systematic debugging protocol for ClickFlash. Use when facing a bug or unexpected behavior.
triggers:
  - bug
  - not working
  - error
  - broken
  - failing
  - debug
  - why is
---

# Debug: Systematic Protocol

## Step 1: Reproduce exactly
- What is the exact input that triggers it?
- Is it deterministic or intermittent?
- Which app, which endpoint, which component?

## Step 2: Read the actual error (never guess)
| Runtime | Where to look |
|---------|--------------|
| Frontend | Browser DevTools → Console tab |
| Express backend | Terminal running `npm run dev:backend` |
| CF Worker | `wrangler tail` or `wrangler dev` console |
| Electron | Ctrl+Shift+I in dev mode → Console tab |

## Step 3: Isolate — binary search the call chain
Does the error happen at the API boundary, the service layer, or the UI?
Add a single log at the midpoint; narrow until you find the line.

## Step 4: Symptom lookup table

| Symptom | First place to check |
|---------|---------------------|
| 401 / JWT invalid | `jose.jwtVerify()` call; is `JWT_SECRET` in env? |
| CORS error | `ALLOWED_ORIGINS` in backend config; `isDev` gating correct? |
| Vite proxy 502 | Backend server started? Port in `vite.config.ts` proxy matches |
| TypeScript errors | `npm --prefix apps/<app> run typecheck` for full list |
| Test failures | `npm --prefix apps/<app> test -- --verbose` |
| CF Worker runtime error | `nodejs_compat` flag in `wrangler.toml`? |
| CF Worker import error | Node-only module imported (e.g. `setInterval`, `http`)? |
| Electron blank screen | Backend health: `curl -sf http://localhost:8090/api/health` |
| Electron crash on start | Check `dist/master/index.html` exists; run build first |
| Rate limit firing in dev | `isDev` check missing in `strictRateLimiter` configuration |
| D1 query error | Parameterized? `.bind()` used? Column name typo? |

## Step 5: Form a hypothesis, then verify
Predict exactly what the fix will change and why.
Do not apply a fix you can't explain.

## Step 6: Fix minimally
The smallest change that fixes the bug. No opportunistic refactors while debugging — open a new task for those.

## Step 7: Add a regression test
If no existing test caught this, add one.
Name it to describe the bug: `it('returns 429 after 5 rapid login attempts', ...)`.
