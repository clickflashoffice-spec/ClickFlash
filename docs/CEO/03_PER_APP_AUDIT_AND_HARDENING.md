# 03 — Per-App Audit & Production Hardening

> **Re-audit of all 7 apps + master-cpp against the v6.0 CEO plan.**  
> **Each app has:** current score, top 3 risks, the code fix as a preview, and a 1-line acceptance test.

---

## 1. apps/master — Master Station (Electron + Express + SQLite)

**Score: 8.5/10 → Target 9.5/10**

### Verified state (read from code)
- 21 route groups, 25+ routes (auth, collections, cloud, orders, faces, culling, sessionTypes, gallery, galleryAuth, galleryCheckout, analytics, marketing, dashboard, ledger, pairing, sync, files, system, realtime, notification, assistance)
- 13 backend services, 12 workers/services
- SQLite (better-sqlite3-multiple-ciphers) with WAL
- DbWriteQueue 2-phase commit ✅ (recently fixed)
- CloudSyncService — 2,415 LOC monolith with 15+ pipelines
- mDNS discovery ✅
- HMAC-SHA256 LAN signing ✅
- GDPR service ✅ (recently added)
- Encryption service ✅ (recently added)
- Health check middleware ✅
- 60+ migration files in `apps/master-cpp/migrations/`

### Top 3 risks (this quarter)

#### M-1: SQLite is NOT encrypted by default (P0 — security/compliance)
**Evidence:** `apps/master/backend/server.ts` opens `master.db` with `better-sqlite3` but never calls `PRAGMA key`. The `encryptionService.ts` exists but the install wizard does not call it. A stolen laptop is an instant GDPR breach.

**Fix — `apps/master/backend/services/encryptionService.ts` (add `enableAtStartup`)**
```typescript
// Called from server.ts:startServer() AFTER migrations, BEFORE route registration.
import { app } from 'electron';
import * as path from 'path';
import { enableEncryption } from './encryptionService';

export async function bootstrapDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'master.db');
  // 1. Try to load encryption key from OS keychain
  const key = await safeStorage.getOrGenerate('master.db.key', async () => {
    // First run: generate a strong key, ask user for a passphrase to wrap it
    return crypto.randomBytes(32).toString('base64');
  });
  if (!key) throw new Error('Failed to obtain encryption key from keychain');
  // 2. Enable SQLCipher
  await enableEncryption(dbPath, key);
  // 3. Verify a SELECT roundtrip works (catches wrong key)
  const db = new Database(dbPath);
  db.pragma(`key="x'${key}'"`);
  db.prepare('SELECT 1').get();   // throws on wrong key
  return db;
}
```

**Acceptance test:** `npm run test:master -- encryption.at-rest.spec.ts` — open DB, write a row, close, reopen with **wrong** key, expect `file is not a database`.

#### M-2: CloudSyncService is 2,415 LOC monolith (P1 — maintainability)
**Fix — split into per-pipeline classes behind a common interface**
```typescript
// apps/master/backend/services/cloudSync/types.ts (NEW)
export interface SyncPipeline {
  readonly name: string;
  readonly intervalMs: number;
  runOnce(): Promise<{ pushed: number; pulled: number; errors: number }>;
  onCircuitClose?(): Promise<void>;   // for cache invalidation
}

// apps/master/backend/services/cloudSync/Orchestrator.ts (NEW)
// Replaces the top-level run() method in cloudSyncService.ts
export class CloudSyncOrchestrator {
  private breakers = new Map<string, CircuitBreaker>();
  constructor(private pipelines: SyncPipeline[], private auth: HubAuth) {}
  async start() {
    for (const p of this.pipelines) {
      this.breakers.set(p.name, new CircuitBreaker(p.name, 5, 2 * 60_000));
      this.schedule(p);
    }
  }
  private schedule(p: SyncPipeline) {
    const tick = async () => {
      const breaker = this.breakers.get(p.name)!;
      if (breaker.isOpen()) return setTimeout(tick, breaker.retryIn());
      try {
        const r = await p.runOnce();
        breaker.recordSuccess();
        if (p.onCircuitClose) await p.onCircuitClose();
        logger.info({ pipeline: p.name, ...r }, 'pipeline ok');
      } catch (err) {
        breaker.recordFailure();
        logger.warn({ pipeline: p.name, err }, 'pipeline failed');
      } finally {
        setTimeout(tick, p.intervalMs);
      }
    };
    tick();
  }
}
```

**Acceptance test:** Each of the 15+ existing pipelines becomes its own file with a unit test that mocks the Hub and asserts the runOnce() shape.

#### M-3: Touch auto-update is not initiated by Master (P1 — operations)
**Current:** Touch has `autoUpdater.d.ts` but `autoUpdater.js` is not invoked from `main.ts`.
**Fix — extend `apps/master/backend/services/provisioning/BootstrapService.ts`**
```typescript
// In Master → Cloud: when Hub sends pending_commands of type "upgrade",
// Master also queries the Touch list and pushes a /api/v1/kiosks/upgrade command
async pushUpgradeToKiosks(targetVersion: string) {
  const kiosks = this.db.prepare('SELECT kiosk_id, ip FROM pairings WHERE last_seen > ?')
    .all(Date.now() - 24 * 60 * 60 * 1000);
  for (const k of kiosks) {
    await this.fetchWithHmac(`http://${k.ip}:8091/api/v1/system/upgrade`, {
      method: 'POST',
      body: { version: targetVersion, signed_url: await getSignedTouchUpdateUrl(targetVersion) }
    });
  }
}
```

**Acceptance test:** In staging, force Master to a downgrade, simulate Hub push `upgrade 5.0.1`, verify all paired Touches receive the command within 60s.

---

## 2. apps/touch — Touch Kiosk (Electron + Express + SQLite)

**Score: 8.0/10 → Target 9.0/10**

### Verified state
- 8 route groups, 50+ files in `src/`
- IndexedDB (Dexie) + local PocketBase ✅
- Offline-first queue with checkpoint ✅ (recently fixed: IndexedDB instead of localStorage)
- ConnectivityService with debounced health probes ✅
- HMAC-SHA256 signing to Master ✅
- 5-state SyncStatusIndicator ✅
- autoUpdater defined but **not imported** in main.ts ❌

### Top 3 risks

#### T-1: autoUpdater is dead code (P0)
**Fix — `apps/touch/main.ts`** (add ~25 lines in the class constructor)
```typescript
// Add import
import { initAutoUpdater } from './autoUpdater';

// Inside TouchApp.init() after window creation
private async initAutoUpdater() {
  const updater = initAutoUpdater({
    repo: 'clickflash/touch',
    channel: process.env.NODE_ENV === 'production' ? 'stable' : 'beta',
    autoDownload: true,
    autoInstallOnAppQuit: true,
  });
  updater.on('update-available', (info) => logger.info({ info }, 'touch update available'));
  updater.on('update-downloaded', () => {
    // Show non-blocking toast; staff confirms with PIN
    this.mainWindow.webContents.send('update:ready-to-install', { requiresPin: true });
  });
}
```

**Acceptance test:** Force a fake newer version, restart Touch, verify toast appears with PIN prompt; enter correct PIN, verify app restarts into new version.

#### T-2: `conflict_flag = 1` orders from Master are silently dropped
**Fix — `apps/touch/src/services/syncService.ts`**
```typescript
// In pullAlbumsFromMaster(), after fetch:
const conflicts = albums.filter(a => a.conflict_flag === 1);
if (conflicts.length) {
  await db.conflicts.bulkPut(conflicts.map(c => ({
    album_id: c.id, master_version: c.updated_at, local_version: c.local_updated_at,
    detected_at: Date.now()
  })));
  // Show non-blocking indicator
  eventBus.emit('conflicts:detected', conflicts.length);
}
```

**Acceptance test:** Inject a `conflict_flag=1` album in Master, trigger Touch pull, verify the conflict badge appears and the album is non-editable in Touch.

#### T-3: HTTPS photo pull fails (uses `http` only)
**Fix — `apps/touch/backend/routes/sync.ts`**
```typescript
import https from 'https';
import http from 'http';
import { URL } from 'url';

function fetchUrl(url: string, opts: any = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    lib.get(url, opts, res => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}
```

**Acceptance test:** Configure a staging Master behind a self-signed TLS cert, pull a photo, verify success.

---

## 3. apps/management — Management Hub (Cloudflare Worker + D1)

**Score: 8.0/10 → Target 9.2/10**

### Verified state
- 34 .ts files in `backend/src/`
- Routes: auth, system, records, gallery, files, analytics, **masters** (new in v5.0), sync
- Services: fleetService, geminiService, emailRelayService, auditService, marketingAutomationService, analyticsService
- D1 with 30+ migrations
- Health check, start-up guard, validation.ts

### Top 3 risks

#### MG-1: `/api/v1/license/validate` and `/api/v1/oauth/device/*` do not exist (P0 — blocks onboarding)
**Fix — add `apps/management/backend/src/routes/oauth.ts` (NEW)**
```typescript
// See full code in 02_NEW_DESTINATION_ONBOARDING.md §4.2
import { z } from 'zod';
import { signJwt, verifyJwt } from '../utils/jwt';

const codes = new Map<string, { userCode: string; expires: number; authorized: boolean; tenant_id?: string }>();

export const oauthRoutes = {
  async deviceCode(req: Request, env: Env) {
    const { client_id } = await req.json() as any;
    if (client_id !== 'clickflash-installer') return new Response('invalid_client', { status: 400 });
    const deviceCode = crypto.randomUUID();
    const userCode = `${rand4()}-${rand4()}`.toUpperCase();
    const expires = Date.now() + 10 * 60 * 1000;
    codes.set(deviceCode, { userCode, expires, authorized: false });
    await env.KV.put(`oauth:${deviceCode}`, JSON.stringify({ userCode, expires, authorized: false }), { expirationTtl: 600 });
    return Response.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: 'https://hub.clickflash.app/activate',
      verification_uri_complete: `https://hub.clickflash.app/activate?code=${userCode}`,
      expires_in: 600,
      interval: 5
    });
  },
  async token(req: Request, env: Env) {
    const { device_code } = await req.json() as any;
    const raw = await env.KV.get(`oauth:${device_code}`);
    if (!raw) return Response.json({ error: 'invalid_grant' }, { status: 400 });
    const c = JSON.parse(raw);
    if (Date.now() > c.expires) return Response.json({ error: 'expired_token' }, { status: 400 });
    if (!c.authorized) return Response.json({ error: 'authorization_pending' }, { status: 400 });
    if (!c.tenant_id) return Response.json({ error: 'invalid_request' }, { status: 400 });
    const access = await signJwt({ sub: device_code, tenant_id: c.tenant_id, scope: 'fleet:write cloud:sync' }, env.JWT_PRIVATE_KEY, '1h');
    const refresh = await signJwt({ sub: device_code, tenant_id: c.tenant_id, type: 'refresh' }, env.JWT_PRIVATE_KEY, '90d');
    await env.KV.delete(`oauth:${device_code}`);
    return Response.json({ access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: 3600 });
  }
};
function rand4() { return Math.random().toString(36).slice(2, 6); }
```

**Acceptance test:** `curl -X POST .../api/v1/oauth/device/code` returns a `user_code`; simulate admin typing it; poll token endpoint; receive `access_token`.

#### MG-2: Validation is `validation.ts` (plain functions, not Zod) on most routes
**Fix — adopt Zod, replace one route per PR**
```typescript
// apps/management/backend/src/routes/masters.ts (REWRITE the POST / register)
import { z } from 'zod';
const RegisterSchema = z.object({
  desk_id: z.string().regex(/^MASTER_[A-Z0-9_]{3,32}$/),
  name: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  country: z.string().length(2),
  timezone: z.string(),
  currency: z.string().length(3),
  hardware_fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  public_key: z.string().startsWith('-----BEGIN PUBLIC KEY-----'),
  version: z.string(),
  kiosks_paired: z.array(z.object({ kiosk_id: z.string(), mac: z.string() })).max(32)
});

mastersRouter.post('/register', async (req, env) => {
  const body = RegisterSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: 'validation', issues: body.error.issues }, { status: 400 });
  // ... existing handler
});
```

**Acceptance test:** Send a malformed body, expect 400 with `issues` array; send a valid body, expect 201.

#### MG-3: auditService is in-memory (lost on Worker cold start)
**Fix — move to D1**
```sql
-- migrations/102_audit_to_d1.sql
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  desk_id TEXT,
  actor TEXT NOT NULL,            -- 'master' | 'admin' | 'kiosk'
  action TEXT NOT NULL,           -- 'register' | 'heartbeat' | 'pair' | 'order.created' | 'payout'
  target TEXT,                    -- resource id
  payload_json TEXT,
  ts INTEGER NOT NULL,
  INDEX idx_audit_tenant_ts (tenant_id, ts DESC)
);
```

**Acceptance test:** Trigger 100 audit events, force Worker cold start (`wrangler dev --local`), query `GET /api/v1/audit?since=...`, verify all 100 are returned.

---

## 4. apps/gallery — Customer Gallery (Cloudflare Worker + R2 + Stripe)

**Score: 6.0/10 → Target 8.5/10**

### Re-audit reality check
- The March 2026 `AUDIT_REPORT.md` claimed 584 TS errors and a dual `backend/server.js` + `backend/src/server.ts`.  
- **Today:** `backend/server.js` does **not** exist; only `test-server.js`. The actual backend is the TypeScript Worker (1,297 LOC, comprehensive Stripe + webhook + geo-restrict).  
- The 584 errors are in the **frontend** (`src/`), which has not been re-audited since March.

### Top 3 risks

#### G-1: 12 failing test suites (still P0)
**Action:** Run `pnpm --filter gallery typecheck` this week, categorize, fix in 3 PRs (low → medium → high complexity).

#### G-2: Stripe webhook has no idempotency (financial)
**Fix — `apps/gallery/backend/src/server.ts` (line 293+)**
```typescript
// Before INSERT into orders, check we haven't already processed this session
const existing = await env.GALLERY_DB.prepare(
  'SELECT id FROM orders WHERE stripe_session_id = ? LIMIT 1'
).bind(session.id).first();
if (existing) {
  return Response.json({ received: true, idempotent: true });
}
// ... existing INSERT
```

**Acceptance test:** `curl -X POST .../api/webhook` with the same `checkout.session.completed` payload twice, verify only one row in `orders`.

#### G-3: Frontend 584 TS errors (assuming still present)
**Fix — staged triage** (do **not** try to fix in one PR)
```bash
# 1. Categorize
pnpm --filter gallery typecheck 2>&1 | rg 'error TS' | awk -F: '{print $4}' | sort | uniq -c | sort -rn
# 2. Fix in this order: "Cannot find module" → "unused" → "implicit any" → "type mismatch" → "generic constraints"
# 3. Use `// @ts-expect-error <jira-ticket>` for the top 5 most complex mismatches and file tickets
```

**Acceptance test:** `pnpm --filter gallery typecheck` exits 0; `pnpm --filter gallery test` shows 0 failed suites.

---

## 5. apps/moneytrash — Unsold Photo Marketplace (Tauri + Cloudflare + R2)

**Score: 6.5/10 → Target 8.0/10**

### Verified state (backend)
- 14 Cloudflare handlers: `upload/init`, `upload/chunk`, `upload/finalize`, `upload/cancel`, `gallery/create`, `gallery/get`, `office/verify`, `office/register`, `webhook`
- 3 middleware: `auth`, `rateLimit`, plus `jwt` util
- D1 + R2 for storage

### Top 3 risks

#### MT-1: No security audit of the Cloudflare Worker (P0)
**Action:** Apply the same Zod-validation + JWT-claim-desk_id check pattern as Management. Specifically: every handler must call `requireAuth(env, request)` and reject if `tenant_id` doesn't match the desk_id in the path.

#### MT-2: Webhook idempotency
**Fix — `apps/moneytrash/cloudflare/src/handlers/webhook.ts`**
```typescript
const IdempotencyKey = req.headers.get('idempotency-key');
if (!IdempotencyKey) return Response.json({ error: 'missing idempotency key' }, { status: 400 });
const seen = await env.KV.get(`wh:${IdempotencyKey}`);
if (seen) return Response.json({ received: true, dedup: true });
await env.KV.put(`wh:${IdempotencyKey}`, '1', { expirationTtl: 86400 });
// ... process
```

**Acceptance test:** Send the same webhook 3x, verify `dedup: true` on retries.

#### MT-3: EXIF data on uploaded photos may leak GPS
**Fix — `apps/moneytrash/cloudflare/src/handlers/upload/finalize.ts`**
```typescript
// After R2 upload, strip EXIF before serving
import { ExifTransformer } from 'exif-wasm';
const obj = await env.R2.get(key);
const buf = await obj.arrayBuffer();
const cleaned = await ExifTransformer.strip(buf, { keepOrientation: true });
await env.R2.put(key, cleaned, { httpMetadata: obj.httpMetadata });
```

**Acceptance test:** Upload a photo with GPS EXIF, fetch it back via signed URL, verify `exiftool` shows no GPS tags.

---

## 6. apps/website — Marketing Site (Next.js 15 static)

**Score: 10/10.** No action.

---

## 7. apps/installer — The 1-Click Wizard (Electron)

**Score: 7.0/10 (scaffolded, unverified) → Target 9.0/10 (verified + 5-star UX)**

### Verified state
- 7 step components, state machine hook, OAuth handler (PKCE), Cloudflare provisioning service, token encryption (DPAPI/Keychain/Secret Service), Touch pairing service
- One-click NSIS via `electron-builder.yml`
- Built as `ClickFlash-Setup-5.0.0.exe` via `package:installer` script

### Top 3 risks

#### I-1: No end-to-end smoke test in CI
**Fix — `tests/installer/installer.spec.ts`** (Playwright + Electron)
```typescript
import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test('1-click installer completes all 7 steps in mock mode', async () => {
  const app = await electron.launch({
    args: [path.join(__dirname, '../../apps/installer/dist/electron/electron-main.js')],
    env: { ...process.env, CLICKFLASH_INSTALLER_MOCK: '1' }
  });
  const page = await app.firstWindow();
  await expect(page.getByText('Welcome to ClickFlash')).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByLabel('License key').fill('CF-LIVE-TEST-TEST-TEST-TEST');
  await page.getByRole('button', { name: 'Next' }).click();
  // ... assert through all 7 steps in mock mode
  await expect(page.getByText('Studio is online')).toBeVisible({ timeout: 5 * 60 * 1000 });
  await app.close();
});
```

**Acceptance test:** CI runs this on every PR; green = ship; red = block.

#### I-2: Silent/unattended mode for mass deploy
**Fix — `apps/installer/electron-main.ts`**
```typescript
// At startup:
const args = parseArgs(process.argv.slice(1));
if (args.S) {
  // NSIS silent flag
  runUnattendedInstall(args).then(() => app.quit()).catch(err => {
    log.error(err, 'unattended install failed');
    app.exit(1);
  });
  return;
}

async function runUnattendedInstall(args: Record<string, string>) {
  await runStep('cloudflare-link', { token: args.cfc_token });
  await runStep('destination-profile', { desk_id: args.desk_id, name: args.studio_name });
  await runStep('pair-touch', { count: parseInt(args.kiosk_count || '0') });
  await runStep('first-sync');
  log.info('Unattended install complete');
}
```

**Acceptance test:** `ClickFlash-Setup.exe /S /cfc_token=... /desk_id=MASTER_TEST_01 /studio_name="Test"` runs end-to-end with no UI.

#### I-3: macOS + Linux build verification
**Action:** Add `electron-builder.mac.yml` and `electron-builder.linux.yml` to the installer. Do not ship to customers this quarter — just unblock dev installs.

---

## 8. apps/master-cpp — C++ Port (Strategic Decision)

See **`04_MASTER_CPP_FINALIZATION.md`** for the full plan. Headline:
- Current state: 59 SQL migrations + 50+ controllers/UI/workers + Qt6 scaffold, but **does not build** without Qt6 (not installed on Windows host).
- **Recommendation: pivot to a headless Drogon-based HTTP service.** Keep the migrations, port the 21 route controllers, ship in a Docker container for the cloud-side fallback. Kill the Qt6 desktop UI for now.

---

## 9. Shared packages — `@clickflash/types` and `@clickflash/ui`

**Score: ?/10 → Target 9.0/10**

### Action
- Run `pnpm --filter @clickflash/types typecheck` and `pnpm --filter @clickflash/ui typecheck` this week.
- Add proper `version` fields to both `package.json`s.
- Add `vitest` to both, target 80% line coverage.
- Move all 6 apps' import paths from `file:../../packages/...` to workspace syntax: `@clickflash/types` and `@clickflash/ui`.

---

## 10. Hardening sequencing (this quarter)

| Week | Hardening | Why first |
|---|---|---|
| W1 | M-1 (encrypt SQLite at rest) | One-line GDPR story |
| W1 | T-1 (wire autoUpdater) | Existing code, just missing wire |
| W1 | I-1 (installer smoke test) | Catches all 7 onboarding regressions |
| W2 | MG-1 (OAuth device code) | Blocks 1-click onboarding |
| W2 | G-2 (Stripe webhook idempotency) | Money correctness |
| W2 | MT-2 (webhook idempotency) | Money correctness |
| W3 | M-2 (CloudSyncService split) | Maintainability unlock |
| W3 | G-3 (frontend 584 errors, first 200) | Unblocks PCI review |
| W3 | MG-2 (Zod on routes) | Security baseline |
| W4 | MT-1 (MoneyTrash full security audit) | New PCI surface |
| W4 | G-1 (frontend 584 errors, last 384) | Done |

---

*End of per-app hardening — proceed to file 04.*
