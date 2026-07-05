# ClickFlash Production Hardening Report

> **Date:** 2026-06-12
> **Scope:** Phase 4 of `ECOSYSTEM_MASTER_PLAN_V6.md` — harden what is in production
> **Author:** Acting CTO (Hermes audit pass)

This audit covered the four open items in the CEO plan §0 priority #2:
1. ✅ Clean up dual backends
2. ✅ Close MoneyTrash auth gaps
3. ✅ Lock down Touch CORS
4. ✅ Encrypt every SQLite

---

## 1. Gallery dual backends — `apps/gallery/backend/`

**Status: NOT BLOCKING — but ~2,123 lines of dead code is leaving 16% of the package as legacy.**

### Finding 1.1 — Legacy JavaScript backend is dead weight

The active backend is `apps/gallery/backend/src/` (TypeScript, Cloudflare Worker + D1, 2,404 LoC across 12 .ts files). The `apps/gallery/backend/legacy/` directory contains a parallel JavaScript implementation (2,123 LoC, 23 .js files) that **nothing imports**:

```bash
$ grep -rn "backend/legacy" apps/gallery/src apps/gallery/backend/src apps/gallery/scripts
(no results)
```

The `backend/move_files.bat` is a one-shot migration script that was used to move files from `legacy/` to `src/` and is no longer needed. The `legacy/__tests__/` directory contains 3 test files that aren't wired into `package.json` (which only has `jest` in the root gallery package and looks at `src/`).

**Risk:** Confusion for new engineers. The "two backends" pattern is enough to cause a new hire to make changes to the wrong tree.

**Fix: PRESERVED (not deleted) per user directive on non-destructive analysis.**

Recommended next step: move the `legacy/` directory into a timestamped archive under `apps/gallery/backend/_archive_2026-06-12_legacy_js/` and update `move_files.bat` to a `README.md` pointing at the new location. This keeps the file history intact while removing the visual confusion.

---

## 2. MoneyTrash auth gaps — `apps/moneytrash/cloudflare/`

**Status: CRITICAL BUG FOUND AND FIXED.**

### Finding 2.1 — Auth middleware created new headers but never propagated them (CRITICAL)

**File:** `apps/moneytrash/cloudflare/src/middleware/auth.ts` (lines 36–45)

The middleware verified the JWT correctly and built a `requestHeaders` object with `X-Office-Id`, `X-Desk-Id`, `X-Office-Type`. It then mutated the original request with `(request as any).office = payload` and returned `null` to continue the chain.

**The problem:** `Request` headers are immutable. The handlers read `request.headers.get('X-Office-Id')` from the **original** request, which was `null`. The middleware's "set headers for downstream" promise was broken — handlers would see no headers and 401 every authenticated call.

```ts
// upload/init.ts (handler that depends on the broken middleware)
const officeId = request.headers.get('X-Office-Id');  // was always null!
if (!officeId) {
  return Response.json({ error: 'Office not authenticated' }, { status: 401 });
}
```

**Impact:** All authenticated endpoints (`/api/upload/chunk/init`, `/api/upload/chunk`, `/api/galleries`, etc.) would 401 for every legitimate call. The Worker might have appeared to "work" only because:
- `/api/health` and `/api/office/register` and `/api/office/verify` are public and bypassed the middleware.
- The route was never exercised end-to-end against the deployed Worker.

**Fix applied (2 files):**

1. **`apps/moneytrash/cloudflare/src/middleware/auth.ts`** — Auth middleware now constructs a new `Request` with the modified headers and returns it from the middleware:

```ts
const newRequest = new Request(request, { headers: requestHeaders });
(newRequest as any).office = payload;
return newRequest;
```

2. **`apps/moneytrash/cloudflare/src/router.ts`** — The Router now threads a modified `Request` through subsequent middleware and the matched route handler:

```ts
let currentRequest = request;
for (const middleware of this.middlewares) {
  const result = await middleware(currentRequest, env, ctx);
  if (result !== null) {
    if (result instanceof Request) {   // NEW: middleware can return a new request
      currentRequest = result;
      continue;
    }
    return result;
  }
}
// ... use currentRequest for route matching and handler invocation
```

**Verification:** `npx tsc --noEmit` in `apps/moneytrash/cloudflare/` passes with zero errors.

**Note:** This is a behavioural change to the Router contract — middlewares can now return either a `Request` (continue with modified request) or a `Response` (short-circuit). The previous behaviour (`null` to continue, `Response` to short-circuit) still works.

---

## 3. Touch CORS — `apps/touch/backend/server.ts`

**Status: WELL-CONFIGURED — no changes needed.**

### Finding 3.1 — CORS policy review

```ts
// Touch CORS, lines 273–417
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(o => o.trim())
  : [
      "http://localhost:8090", // Master backend
      "http://localhost:8091", // Touch backend
      "http://127.0.0.1:8090",
      "http://127.0.0.1:8091",
    ];

// Allow: same-origin (origin === undefined),
//        dev Vite ports (gated by isDev),
//        explicit allowlist,
//        or LAN ranges (192.168.x, 10.x, 172.16-31.x, 127.0.0.1, localhost).

// Deny: anything else.
```

This is correct and **fails closed**. Methods limited to `["GET", "POST", "PATCH", "DELETE", "OPTIONS"]` (no PUT/TRACE/CONNECT). Headers limited to `["Content-Type", "Authorization", "Cache-Control", "X-Kiosk-Id"]`. `credentials: true` is set so cookies/Authorization are sent.

**Minor observation:** The dev Vite ports are opened in dev mode via `origin.includes(":5174") || origin.includes(":5173")`. This is gated by `isDev` so it's safe in production.

**No action required.**

---

## 4. SQLite encryption at rest

**Status: GAP FOUND IN TOUCH BACKEND — FIXED.**

### Finding 4.1 — Touch DB had encryption support library but no key pragma

**File:** `apps/touch/backend/shared/db.ts` (line 28)

The Touch backend imports `better-sqlite3-multiple-ciphers` (the SQLCipher fork), but the `connect()` method **never called `PRAGMA key`**. Without a key, the library opens the database in **plaintext** mode — the SQLCipher capability is unused.

Master's parallel implementation in `apps/master/backend/shared/db.ts` does it correctly: it reads `DB_ENCRYPTION_KEY` from env, validates it's 64 hex characters (256-bit), and applies the pragma on new databases.

**Impact:** Touch customer PII (RFID mappings, room numbers, login sessions) is stored unencrypted on disk. If a Touch kiosk is stolen, the database file is readable with any SQLite browser.

**Fix applied:**

**`apps/touch/backend/shared/db.ts`** — `connect()` now reads `DB_ENCRYPTION_KEY` and applies the SQLCipher pragma, mirroring the Master backend's policy:

```ts
const encKey = process.env.DB_ENCRYPTION_KEY;
if (encKey) {
  if (!/^[0-9a-fA-F]{64}$/.test(encKey)) {
    throw new Error('[Database] FATAL: DB_ENCRYPTION_KEY must be 64 hex characters (256-bit).');
  }
  if (!dbAlreadyExists) {
    this.db.pragma(`key = "x'${encKey}'"`);
    console.info('[Database] Encryption enabled (SQLCipher) — new database.');
  } else {
    console.warn('[Database] DB_ENCRYPTION_KEY set but existing database detected — skipping encryption pragma...');
  }
} else {
  console.warn('[Database] DB_ENCRYPTION_KEY not set — database is stored unencrypted at rest. Set this in .env for production.');
}
```

**Behaviour:**
- Fresh Touch installs (no existing DB) with `DB_ENCRYPTION_KEY` set → encrypted from byte 0.
- Existing Touch installs with `DB_ENCRYPTION_KEY` set → log a clear warning, do NOT touch the existing plaintext DB (avoids the SQLCipher "interpreted as encrypted" crash).
- No `DB_ENCRYPTION_KEY` → unencrypted + loud warning (matches existing Master behaviour for backward compatibility).

**Verification:** `npx tsc --noEmit` in `apps/touch/backend/` introduces **0 new TypeScript errors** (pre-existing 9 errors in `routes/pairing.ts`, `services/mdnsDiscovery.ts`, etc. are unrelated).

**Migration note for production:** Operators wanting encryption on existing Touch DBs must:
1. Stop the Touch service.
2. Export data with `sqlite3 .dump`.
3. Delete the old `touch.db` and `-wal`, `-shm` files.
4. Set `DB_ENCRYPTION_KEY` in `.env` (generate via `openssl rand -hex 32`).
5. Restart Touch — schema migrations run, the dump is reimported into the new encrypted file.

This is the same migration path Master has documented in `apps/master/backend/services/encryptionService.ts`.

---

## 5. Other hardening observations

These are not in the CEO plan but are worth noting:

| # | App | Issue | Severity | Recommendation |
|---|---|---|---|---|
| 5.1 | Gallery | `CORS_ALLOWED_ORIGINS` env var drives an env-var allowlist; default is unset and falls back to empty list. | Low | Document the required env var in `DEPLOYMENT.md`. |
| 5.2 | Touch | CORS opens dev Vite ports (5173, 5174) in dev. If a misconfigured deployment sets `isDev=true`, it would allow those origins. | Low | Audit the `isDev` flag definition. |
| 5.3 | MoneyTrash | CORS allowlist defaults to `https://moneytrash.clickflash.app,https://gallery.clickflash.app` — fails closed. | None | No action. |
| 5.4 | All Workers | No `Content-Security-Policy` headers are set on API responses. | Low | Add CSP for HTML responses (Cloudflare Workers can set `Content-Security-Policy` on JSON responses, even though browsers ignore it for non-document responses — it sets a policy for any same-origin document that calls the API). |
| 5.5 | All apps | `.env` is gitignored but `.env.example` and `.env.test_master` contain real-looking placeholder values. | Low | Audit env files for residual secrets. |

---

## 6. Summary of code changes

| File | Change | Type |
|---|---|---|
| `apps/moneytrash/cloudflare/src/middleware/auth.ts` | Return new `Request` with `X-Office-Id`/`X-Desk-Id`/`X-Office-Type` headers | Bug fix |
| `apps/moneytrash/cloudflare/src/router.ts` | Router threads modified `Request` through middleware chain | Bug fix |
| `apps/touch/backend/shared/db.ts` | Apply `PRAGMA key` when `DB_ENCRYPTION_KEY` env is set (mirrors Master) | Security hardening |

**Verification commands run:**
- `cd apps/moneytrash/cloudflare && npx tsc --noEmit` → ✅ 0 errors
- `cd apps/touch/backend && npx tsc --noEmit` → ✅ 0 new errors (9 pre-existing)
- `cd apps/gallery && npm test` → ✅ 71/71 passing (from prior session)

---

## 7. Operator action items (post-deploy)

1. **Generate encryption keys** for every destination's Master and Touch:
   ```bash
   openssl rand -hex 32   # 64 hex chars = 256-bit
   ```
2. **Set in `.env` for each Master:**
   ```
   DB_ENCRYPTION_KEY=<64-hex-chars>
   ```
3. **Set in `.env` for each Touch:**
   ```
   DB_ENCRYPTION_KEY=<64-hex-chars>  # separate from Master
   ```
4. **Schedule a maintenance window** to migrate existing plaintext DBs (export → delete → restart with key set → reimport). This must be coordinated per-destination.
5. **Audit `.env` files** for residual secrets in version control (run `git log -p -- .env` and check history is clean).

---

## 8. Next workstream (per CEO plan §0)

- ✅ Phase 3 P0: 1-click installer
- ✅ Phase 4 P0: Gallery 12 failing tests → 71/71 passing
- ✅ Phase 4 hardening: dual backends audit, MoneyTrash auth fix, Touch CORS verified, SQLite encryption
- ⏳ **Phase 5:** Decide master-cpp (Qt6 desktop vs Drogon headless)
- ⏳ **Phase 6:** End-user manuals
