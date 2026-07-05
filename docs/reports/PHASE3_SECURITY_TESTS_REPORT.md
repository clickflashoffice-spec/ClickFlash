# Phase 3: Security Tests Report — ClickFlash Ecosystem

**Date:** 2026-06-13
**Scope:** All ClickFlash apps (master, touch, website, gallery, management)
**Tester:** Automated security scan

---

## 1. XSS Protection — DOMPurify in Website CMS

**Status:** ⚠️ PARTIAL / NEEDS ATTENTION

**Finding:**
- File: `apps/website/src/app/blog/[slug]/page.tsx` (line 126)
- The blog page renders content with `dangerouslySetInnerHTML={{ __html: post.content }}`
- Comments on lines 120-125 explicitly acknowledge the XSS risk and state:
  > "add DOMPurify here: DOMPurify.sanitize(post.content)"
- However, **DOMPurify is NOT imported or actually used** in the file.

**Code Snippet:**
```tsx
// SECURITY: Blog content must be sanitized server-side before storage.
// The CMS must strip <script>, <iframe>, event handlers (onerror, onclick),
// and javascript: URLs. If CMS sanitization is not yet implemented,
// add DOMPurify here: DOMPurify.sanitize(post.content).
dangerouslySetInnerHTML={{ __html: post.content }}
```

**Risk Assessment:** LOW — Blog posts are currently sourced from static `blogPosts.ts` data (no dynamic CMS API was found in the website app). However, if a dynamic CMS is added later, this pattern becomes a critical XSS vector.

**Recommendation:** Import and apply DOMPurify before rendering, or ensure server-side sanitization is enforced at the CMS API level.

---

## 2. Rate Limiting on Master Login Endpoint

**Status:** ✅ PASS

**Finding:**
- `strictRateLimiter` (5 requests per minute) is correctly applied to the login endpoint.
- File: `apps/master/backend/routes/auth.ts` (line 42)

**Code Snippet:**
```ts
router.post(
  "/login",
  strictRateLimiter,
  async (req: Request, res: Response) => { ... }
);
```

**Additional Coverage:**
- `/api/auth/signup` — strictRateLimiter
- `/api/auth/verify-pin` — strictRateLimiter
- `/api/gallery-auth/*` — strictRateLimiter
- `/api/gallery-checkout/*` — strictRateLimiter
- `/api/orders/kiosk/orders` — strictRateLimiter
- `/api/export/batch` — strictRateLimiter
- `/api/sync/mutation` — strictRateLimiter

**Implementation:** `apps/master/backend/shared/rateLimiter.ts` (lines 89-90) defines `STRICT_LIMIT = 5` with `WINDOW_MS = 60 * 1000`. Localhost bypass is only allowed in `development` or `test` environments.

---

## 3. CORS Configuration in Touch Backend (LAN-only)

**Status:** ✅ PASS

**Finding:**
- File: `apps/touch/backend/server.ts` (lines 382-417)
- CORS is configured with a custom origin callback that enforces LAN-only access.

**Code Snippet:**
```ts
app.use(
  cors({
    origin: (origin: string | undefined, callback) => {
      if (!origin) return callback(null, true);
      // Dev-only: Allow Vite HMR proxy ports
      if (isDev && (origin.includes(":5174") || origin.includes(":5173"))) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        // LAN-only policy per Law 06 (Touch Local Fetch)
        const isLocalNetwork =
          /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.0\.0\.1|localhost)/.test(origin);
        if (isLocalNetwork) callback(null, true);
        else callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "X-Kiosk-Id"],
  }),
);
```

**Assessment:** The regex correctly covers RFC 1918 private ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x) plus localhost/127.0.0.1. Dev port exceptions are gated by `isDev`. This is a proper LAN-only CORS policy.

---

## 4. SQL Parameterized Queries in Master Backend

**Status:** ✅ PASS

**Finding:**
- Extensive use of parameterized queries (`?` placeholders) found across the Master backend.
- 41+ verified uses of `dbManager.run("... ? ...", [value])` and `dbManager.get("... ? ...", [value])`.

**Examples:**
```ts
// apps/master/backend/routes/auth.ts (line 53-56)
const user = dbManager.get<User>(
  "SELECT * FROM users WHERE email = ?",
  [email],
);

// apps/master/backend/routes/auth.ts (line 196-198)
const result = dbManager.run(
  "INSERT INTO users (email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  [email, hashedPassword, name, "user", now, now],
);

// apps/master/backend/routes/pairing.ts (line 52)
dbManager.run("DELETE FROM pairing_tokens WHERE expires_at < ?", [Date.now()]);
```

**Dynamic Query Safety:**
- `SyncManager.ts` and `cloudSyncService.ts` construct dynamic column names for UPDATE/INSERT, but they are filtered against an `ALLOWED_COLUMNS` whitelist (built from `COLUMN_MAP` in `constants.ts` lines 425-428).
- The `table` variable in dynamic queries is also validated against `ALLOWED_COLUMNS[table]` before execution.

**No Evidence Found:** No string concatenation of user-supplied values into SQL WHERE clauses.

---

## 5. JWT Secret is Not Default in Master

**Status:** ⚠️ PARTIAL — Main generation secure, but weak fallbacks exist

**Finding (Secure):**
- File: `apps/master/backend/config/constants.ts` (lines 34-70)
- `getOrCreateSecret()` generates a cryptographically secure 64-byte hex secret using `crypto.randomBytes(64).toString('hex')` if `JWT_SECRET` is not set.
- The secret is persisted to `DATA_DIR/secrets.json` with `mode: 0o600` (restricted permissions).
- In production non-Electron mode, it throws a hard error if the env var is missing (lines 38-39):
  ```ts
  if (NODE_ENV === 'production' && !isElectron) {
      throw new Error(`FATAL: ${name} environment variable is required in production.`);
  }
  ```

**Finding (Insecure Fallbacks):**
1. `apps/master/backend/routes/faces.ts` (line 156):
   ```ts
   JWT_SECRET || "secret",
   ```
   **Risk:** Uses hardcoded string `"secret"` as fallback. If `JWT_SECRET` is undefined, face-login tokens are signed with a trivially guessable secret.

2. `apps/master/backend/services/orderWatcher.ts` (line 30):
   ```ts
   process.env.JWT_SECRET || "fallback-secret",
   ```
   **Risk:** Uses weak fallback `"fallback-secret"` for OrderValidationService.

3. `apps/master/backend/shared/signedUrls.ts` (line 50):
   ```ts
   const secret = process.env.SIGNED_URL_SECRET || process.env.JWT_SECRET || "dev-insecure-signed-url-secret";
   ```
   **Risk:** Uses `"dev-insecure-signed-url-secret"` as final fallback. This is acceptable for development but should not be reachable in production.

**Recommendation:** Remove all hardcoded/weak fallbacks for `JWT_SECRET`. In production, the app should fail hard (as `getOrCreateSecret` already does for non-Electron) rather than fall back to a guessable secret.

---

## 6. Bcrypt Password Hashing

**Status:** ✅ PASS

**Finding:**
- Bcrypt is used consistently across all backend apps for password hashing.

**Master Backend:**
- File: `apps/master/backend/shared/auth.ts` (lines 1-4)
```ts
import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 12;
export async function hashPassword(password: string): Promise<string> {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    ...
}
```

**Touch Backend:**
- File: `apps/touch/backend/shared/auth.ts` (lines 1-4)
```ts
import bcrypt from 'bcrypt';
const SALT_ROUNDS = 12;
```

**Gallery Backend:**
- File: `apps/gallery/backend/src/auth.ts` (line 16)
```ts
const hash = await bcrypt.hash(password, SALT_ROUNDS);
```

**Management Backend:**
- File: `apps/management/backend/shared/auth.js` (line 19)
```ts
const hash = await bcrypt.hash(password, SALT_ROUNDS);
```

**Note:** `apps/master/backend/routes/auth.ts` (line 192) uses `await bcrypt.hash(password, 10)` inline for signup — 10 rounds is slightly lower than the shared utility's 12, but still within acceptable industry standards (OWASP recommends minimum 10).

---

## Summary Table

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | XSS / DOMPurify in Website CMS | ⚠️ PARTIAL | `dangerouslySetInnerHTML` used without DOMPurify; static data only, low current risk |
| 2 | Rate Limiting on Master Login | ✅ PASS | `strictRateLimiter` (5/min) applied to `/api/auth/login` and other sensitive endpoints |
| 3 | CORS in Touch Backend | ✅ PASS | LAN-only policy enforced with RFC 1918 regex + dev-port gating |
| 4 | SQL Parameterized Queries | ✅ PASS | Extensive `?` placeholders; dynamic columns whitelisted via `ALLOWED_COLUMNS` |
| 5 | JWT Secret Not Default | ⚠️ PARTIAL | Main generation secure (`crypto.randomBytes(64)`), but 3 files have weak fallbacks (`"secret"`, `"fallback-secret"`, `"dev-insecure-signed-url-secret"`) |
| 6 | Bcrypt Password Hashing | ✅ PASS | Used consistently across all backends with 12 salt rounds (10 in one inline case) |

---

## Critical Issues Requiring Action

1. **Remove JWT_SECRET weak fallbacks** in:
   - `apps/master/backend/routes/faces.ts` line 156 (`|| "secret"`)
   - `apps/master/backend/services/orderWatcher.ts` line 30 (`|| "fallback-secret"`)
   - `apps/master/backend/shared/signedUrls.ts` line 50 (`|| "dev-insecure-signed-url-secret"`)

2. **Add DOMPurify** to `apps/website/src/app/blog/[slug]/page.tsx` before rendering `post.content` via `dangerouslySetInnerHTML`, or migrate to a safe rendering approach.

---

*End of Phase 3 Security Tests Report*
