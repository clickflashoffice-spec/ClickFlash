# 02 — New Destination Onboarding (1-Click)

> **The 10-minute flow.** The single most important product surface this quarter.  
> **Owner:** Platform team (1 electron engineer + 1 Cloudflare engineer)  
> **Status:** Design complete, partial implementation exists, ships W4.

---

## 1. The user story

> *"I'm opening a new resort in Bali. I have a Windows PC, a router, an ethernet cable, and three Touch kiosks. My studio manager is not technical. I want to:*  
> 1. *Download one installer.*  
> 2. *Click through 5 screens.*  
> 3. *Hand the three Touch devices to my staff with a sticker on each that says 'A', 'B', 'C'.*  
> 4. *See a green 'Bali studio is online' card in my phone within 10 minutes."*

If we nail this, we have a product. If we don't, we have a tool.

---

## 2. The topology we are onboarding

```
Bali Resort (NEW)
├── Router (DHCP, internet optional)
├── Master A (Windows 11 PC, ethernet)        ← runs Cloudflare-provisioned Master
│   ├── Backend :8090 (Express + SQLCipher)
│   ├── Cloud sync (60s heartbeat → hub)
│   └── Local data: photos, orders, payments
├── Touch 1 (Windows tablet, ethernet, kiosk)  ← pairs to nearest Master
├── Touch 2 (Windows tablet, ethernet, kiosk)  ← pairs to nearest Master
├── Touch 3 (Windows tablet, ethernet, kiosk)  ← pairs to nearest Master
└── MoneyTrash uploader (optional, on a 4th PC or Master)
```

Each Touch chooses the Master with:
- Same subnet (required)
- Lowest latency (preferred)
- Same `tenant_id` from JWT (required — prevents a Bali Touch from accidentally talking to a Maldives Master on the same LAN at HQ)

---

## 3. The 7-step wizard (one installer, one window)

The installer lives at `apps/installer/`. The current scaffold (v5.0) already has 7 step components and a `useInstallerState` state machine. We complete it.

### Step 1 — Welcome + license key
- **Input:** License key (printed, or in email) — 24 chars `CF-LIVE-XXXX-XXXX-XXXX-XXXX`
- **Action:** `POST /api/v1/license/validate` → returns `tenant_id`, `region`, `features[]`
- **Failure modes:** Invalid key, expired, region blocked
- **Time:** 10s

### Step 2 — Cloudflare account link
- **OAuth Device Authorization Grant (RFC 8628).** This is the same flow as `gh auth login`, `aws sso login`, `netlify login`.
- Master shows a `https://hub.clickflash.app/activate?code=ABCD-1234` URL and an 8-char user code.
- HQ admin opens URL on their phone, signs in, types the code, picks the Cloudflare account.
- Master polls `POST /oauth/token` every 5s.
- **Result:** Master has a long-lived `hub_token` (RS256 JWT, 90-day refresh, `tenant_id` claim, `desk_id` claim once registered).
- **Token storage:** `safeStorage` (Electron) → Windows DPAPI / macOS Keychain / Linux Secret Service. **Never on disk in plaintext.**
- **Time:** 30s (depends on admin)

### Step 3 — This destination profile
- **Auto-fill:** `desk_id` = `MASTER_<LOCATION>_<4-RANDOM-HEX>`, e.g. `MASTER_BALI_A3F7`
- **User edits:** location name, country, timezone, currency
- **Collision check:** `POST /api/v1/fleet/check-desk-id` returns `available | taken | merged`
- **User can override** the auto-generated ID.
- **Time:** 20s

### Step 4 — Pair Touch kiosks (THE HARD STEP)
This is the step that makes or breaks the product. We support three sub-flows:

#### 4a. Auto (mDNS) — the happy path
- Master advertises `_clickflash-master._tcp` on `:8090` with TXT records `{desk_id, tenant_id, version}`.
- Touch advertises `_clickflash-touch._tcp` on `:8091`.
- Touch browses for Masters. If exactly one is on the same subnet, **auto-pairs after 5s**.
- Pairing exchanges an HMAC-SHA256 secret (32 bytes, `crypto.randomBytes(32)`) over the existing LAN HTTP.

#### 4b. Assisted (LAN sweep) — when mDNS is blocked
- Touch tries mDNS first, then sweeps `192.168.0.0/16` and `10.0.0.0/8` on `:8090`.
- Each Master that responds with a valid `/_pairing/challenge` token is added to a list.
- Staff sees "Found 2 Masters, pick one" UI.

#### 4c. Manual (QR) — the fallback
- Master displays a QR code with `{desk_id, ip, port, pairing_token, hmac_secret}`.
- Staff scans with a phone, types a 6-digit code on the Touch.
- Pairing is identical to 4a once both sides have the secret.

The pairing token has a 5-minute TTL. After that, staff restarts the wizard on Master.

**Visual feedback:** Each paired Touch immediately shows a green check + photo booth animation on the Master. The wizard's "Pair Touch" step shows a grid: `□ Touch 1    ✓ Touch 2    ⏳ Touch 3...`.

**Time:** 2 min for 3 Touch kiosks.

### Step 5 — First sync test + heartbeat
- Master calls `POST /api/v1/fleet/register` with `{desk_id, hardware_fingerprint, public_key, version}`.
- Hub returns `{fleet_id, tenant_id, shared_config, peers[], r2_prefix, jwt_token}`.
- Master immediately sends `POST /api/v1/fleet/heartbeat` with metrics.
- Hub displays Master as "online" in the fleet dashboard within 2s.
- A "send test photo to R2" smoke test runs to confirm the path.
- **Time:** 30s

### Step 6 — Studio profile
- Studio name, brand colors, logo upload.
- Photographer accounts (1 admin + N photographers).
- Product catalog (pull from Hub shared_config or override locally).
- **Time:** 30s

### Step 7 — Launch + "ready" dashboard
- Master opens in normal mode.
- Touches open in kiosk mode.
- Hub dashboard shows the new destination.
- A "tour" overlay highlights: settings, backup, network, escalation.
- **Time:** 5s

---

## 4. The API contracts (must implement in the next 4 weeks)

All endpoints live on the Cloudflare Management Hub at `https://hub.clickflash.app/api/v1/`. All write endpoints require an authenticated Master JWT (`Bearer` header).

### 4.1 License validation (anonymous)
```http
POST /api/v1/license/validate
Content-Type: application/json

{ "key": "CF-LIVE-XXXX-XXXX-XXXX-XXXX" }

200 OK
{
  "valid": true,
  "tenant_id": "tnt_soneva_group",
  "region": "ap-southeast",
  "plan": "enterprise",
  "features": ["multi-master", "moneytrash", "gdpr-eu", "r2-archive"],
  "max_masters": 50,
  "expires_at": "2027-12-31"
}
```

### 4.2 OAuth Device Authorization Grant (RFC 8628)
```http
POST /api/v1/oauth/device/code
Content-Type: application/json
{ "client_id": "clickflash-installer" }

200 OK
{
  "device_code": "GmRDm9...long...",
  "user_code": "ABCD-1234",
  "verification_uri": "https://hub.clickflash.app/activate",
  "verification_uri_complete": "https://hub.clickflash.app/activate?code=ABCD-1234",
  "expires_in": 600,
  "interval": 5
}

POST /api/v1/oauth/token
Content-Type: application/json
{ "grant_type": "urn:ietf:params:oauth:grant-type:device_code", "device_code": "GmRDm9..." }

200 OK
{
  "access_token": "eyJ...",
  "refresh_token": "dGhpcyBpcyB...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "fleet:write cloud:sync"
}
```

### 4.3 Desk ID collision check (authenticated)
```http
POST /api/v1/fleet/check-desk-id
Authorization: Bearer <install_token>
Content-Type: application/json

{ "desk_id": "MASTER_BALI_A3F7" }

200 OK
{
  "status": "available" | "taken" | "merged",
  "suggested_alternative": "MASTER_BALI_B2E8",  // when taken
  "existing_master": { /* summary if merged */ }
}
```

### 4.4 Master registration (the critical one)
```http
POST /api/v1/fleet/register
Authorization: Bearer <install_token>
Content-Type: application/json

{
  "desk_id": "MASTER_BALI_A3F7",
  "name": "Bali Beach Studio",
  "location": "Bali, Indonesia",
  "country": "ID",
  "timezone": "Asia/Singapore",
  "currency": "USD",
  "hardware_fingerprint": "sha256:abc123...",
  "public_key": "-----BEGIN PUBLIC KEY-----\n...",
  "version": "5.0.0",
  "kiosks_paired": [
    { "kiosk_id": "KIOSK_BALI_01", "mac": "00:1B:44:11:3A:B7" },
    { "kiosk_id": "KIOSK_BALI_02", "mac": "00:1B:44:11:3A:B8" },
    { "kiosk_id": "KIOSK_BALI_03", "mac": "00:1B:44:11:3A:B9" }
  ]
}

201 Created
{
  "status": "registered",
  "desk_id": "MASTER_BALI_A3F7",
  "tenant_id": "tnt_soneva_group",
  "fleet_id": "flt_apac_2026",
  "shared_config": {
    "products": [ /* from Hub */ ],
    "session_types": [ /* from Hub */ ],
    "pricing_tiers": [ /* from Hub */ ],
    "global_settings": { /* key/value */ }
  },
  "peers": [
    { "desk_id": "MASTER_MAL_01", "name": "Maldives Soneva", "status": "online" },
    { "desk_id": "MASTER_DXB_01", "name": "Dubai Atlantis", "status": "online" }
  ],
  "r2_prefix": "uploads/MASTER_BALI_A3F7/",
  "sync_endpoint": "https://hub.clickflash.app/api/v1/sync",
  "gallery_endpoint": "https://gallery.clickflash.app",
  "jwt_token": "eyJ...",  // RS256, 24h
  "refresh_token": "dGhpcyBpcyB..."  // 90d
}
```

### 4.5 Heartbeat (every 60s, +1s jitter)
```http
POST /api/v1/fleet/heartbeat
Authorization: Bearer <master_jwt>
Content-Type: application/json

{
  "desk_id": "MASTER_BALI_A3F7",
  "ts": 1717776000,
  "metrics": {
    "cpu_pct": 12.3,
    "mem_pct": 45.0,
    "disk_free_gb": 412,
    "sync_lag_sec": 4,
    "queue_depth": 0,
    "kiosks_online": 3,
    "sales_today": { "orders": 12, "revenue_cents": 145000 },
    "version": "5.0.0"
  }
}

200 OK
{
  "ack": true,
  "pending_commands": [
    { "type": "pull_config", "url": "https://hub.clickflash.app/api/v1/config/diff?since=1717775000" },
    { "type": "upgrade", "version": "5.0.1", "url": "https://releases.clickflash.app/master/5.0.1.exe" }
  ]
}
```

### 4.6 Touch pairing (Master side)
```http
GET  /api/v1/pairing/challenge
     → { "nonce": "...", "expires_at": "..." }

POST /api/v1/pairing/exchange
     { "kiosk_id": "KIOSK_BALI_01", "nonce": "...", "signature": "hmac-sha256..." }
     → { "hmac_secret": "base64-32-bytes", "tenant_id": "...", "desk_id": "..." }
```

### 4.7 Offline bootstrap (USB stick path)
For resorts with no internet on install day, HQ ships a `bootstrap.zip`:
```json
{
  "tenant_id": "tnt_soneva_group",
  "desk_id": "MASTER_BALI_A3F7",
  "hub_endpoint": "https://hub.clickflash.app",
  "install_token": "single-use-jwt-24h",
  "shared_config_hash": "sha256:abc...",
  "issued_at": "2026-07-01T00:00:00Z",
  "expires_at": "2026-07-02T00:00:00Z",
  "signature": "ecdsa-p256-..."
}
```
Master verifies the signature against a HQ public key (embedded in installer), then proceeds offline with a "will sync when online" banner. The `install_token` is single-use; Hub invalidates it on first online.

---

## 5. The data model (D1 + SQLite per Master)

### 5.1 Hub D1 schema (additions to existing `desks` table)
```sql
CREATE TABLE desks (
  id              TEXT PRIMARY KEY,           -- "MASTER_BALI_A3F7"
  tenant_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  location        TEXT NOT NULL,
  country         TEXT NOT NULL,              -- ISO 3166-1 alpha-2
  timezone        TEXT NOT NULL,              -- IANA
  currency        TEXT NOT NULL,              -- ISO 4217
  hardware_fp     TEXT NOT NULL,              -- sha256:...
  public_key      TEXT NOT NULL,              -- PEM
  version         TEXT NOT NULL,
  status          TEXT NOT NULL,              -- online|offline|degraded|retired
  last_seen       INTEGER NOT NULL,           -- epoch sec
  registered_at   INTEGER NOT NULL,
  r2_prefix       TEXT NOT NULL,              -- "uploads/<desk_id>/"
  region          TEXT NOT NULL,
  INDEX idx_desks_tenant (tenant_id),
  INDEX idx_desks_status (status, last_seen)
);

CREATE TABLE fleet_heartbeats (
  desk_id         TEXT NOT NULL,
  ts              INTEGER NOT NULL,
  metrics_json    TEXT NOT NULL,              -- JSON blob
  PRIMARY KEY (desk_id, ts)
);

CREATE TABLE pairing_tokens (
  token           TEXT PRIMARY KEY,           -- single-use
  desk_id         TEXT NOT NULL,
  expires_at      INTEGER NOT NULL,
  used_at         INTEGER
);

CREATE TABLE oauth_codes (
  device_code     TEXT PRIMARY KEY,
  user_code       TEXT UNIQUE NOT NULL,       -- "ABCD-1234"
  expires_at      INTEGER NOT NULL,
  authorized      INTEGER DEFAULT 0,
  tenant_id       TEXT
);
```

### 5.2 Master SQLite (additions)
```sql
CREATE TABLE pairings (
  kiosk_id        TEXT PRIMARY KEY,
  mac             TEXT NOT NULL,
  ip              TEXT,
  hmac_secret     BLOB NOT NULL,              -- 32 bytes
  paired_at       INTEGER NOT NULL,
  last_seen       INTEGER
);

CREATE TABLE bootstrap_state (
  desk_id         TEXT PRIMARY KEY,
  install_token   TEXT NOT NULL,
  hub_endpoint    TEXT NOT NULL,
  registered_at   INTEGER,
  last_sync_at    INTEGER
);
```

### 5.3 Touch SQLite (additions)
```sql
CREATE TABLE pairing (
  master_desk_id  TEXT NOT NULL,
  master_ip       TEXT NOT NULL,
  master_port     INTEGER NOT NULL,
  hmac_secret     BLOB NOT NULL,
  tenant_id       TEXT NOT NULL,
  paired_at       INTEGER NOT NULL,
  PRIMARY KEY (master_desk_id)
);
```

---

## 6. The 5 code previews that matter

### 6.1 Installer wizard state machine (`apps/installer/src/hooks/useInstallerState.ts` — extension)
```typescript
type WizardStep =
  | 'welcome'
  | 'cloudflare-link'      // OAuth Device Grant
  | 'destination-profile'  // desk_id, location
  | 'pair-touch'           // mDNS + LAN sweep + QR
  | 'first-sync'           // register + heartbeat
  | 'studio-profile'       // branding, accounts
  | 'ready';               // launch

interface InstallerState {
  step: WizardStep;
  license: { key: string; tenant_id: string; features: string[] } | null;
  hub: {
    device_code: string;
    user_code: string;
    access_token?: string;
    expires_at: number;
  } | null;
  desk: {
    proposed_id: string;       // auto-generated
    confirmed_id?: string;     // after collision check
    name: string;
    location: string;
    country: string;
    timezone: string;
    currency: string;
  } | null;
  pairings: Array<{
    kiosk_id: string;
    mac: string;
    method: 'mdns' | 'sweep' | 'qr';
    paired_at: number;
  }>;
  firstSync: {
    registered_at?: number;
    heartbeat_ok: boolean;
    r2_test_ok: boolean;
  } | null;
  studio: {
    name: string;
    logo_path?: string;
    colors: { primary: string; accent: string };
    photographers: Array<{ name: string; email: string; role: 'admin' | 'photographer' }>;
  } | null;
}
```

### 6.2 OAuth Device Code request
```typescript
// apps/installer/src/services/oauthHandler.ts (existing, extend)
async function requestDeviceCode(): Promise<DeviceCode> {
  const res = await fetch(`${HUB_BASE}/api/v1/oauth/device/code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: 'clickflash-installer' })
  });
  if (!res.ok) throw new Error(`Device code request failed: ${res.status}`);
  return res.json() as Promise<DeviceCode>;
}

async function pollForToken(deviceCode: string, intervalMs: number): Promise<TokenResponse> {
  const start = Date.now();
  while (Date.now() - start < 10 * 60 * 1000) {  // 10 min hard cap
    await new Promise(r => setTimeout(r, intervalMs * 1000));
    const res = await fetch(`${HUB_BASE}/api/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode
      })
    });
    const data = await res.json();
    if (res.ok) return data as TokenResponse;
    if (data.error === 'authorization_pending') continue;  // user hasn't typed code yet
    if (data.error === 'slow_down') intervalMs += 5;
    if (data.error === 'expired_token') throw new Error('User code expired — restart step');
    throw new Error(data.error_description || data.error);
  }
  throw new Error('Timed out waiting for user authorization');
}
```

### 6.3 Master-side pairing mDNS handler
```typescript
// apps/master/backend/services/mdnsDiscovery.ts (existing, extend)
import mdns from 'mdns';

export function advertiseMaster(deskId: string, tenantId: string, port: number) {
  const ad = mdns.createAdvertisement(mdns.tcp('clickflash-master'), port, {
    name: `clickflash-master-${deskId}`,
    txtRecord: {
      desk_id: deskId,
      tenant_id: tenantId,
      version: APP_VERSION
    }
  });
  ad.start();
  return () => ad.stop();
}

// Touch side: browse
export function discoverMasters(timeoutMs = 5000): Promise<MasterRecord[]> {
  return new Promise((resolve) => {
    const browser = mdns.createBrowser(mdns.tcp('clickflash-master'));
    const found: MasterRecord[] = [];
    browser.on('serviceUp', (svc) => {
      if (svc.txtRecord?.desk_id) {
        found.push({
          desk_id: svc.txtRecord.desk_id,
          tenant_id: svc.txtRecord.tenant_id,
          name: svc.name,
          host: svc.host,
          port: svc.port,
          addresses: svc.addresses
        });
      }
    });
    browser.start();
    setTimeout(() => { browser.stop(); resolve(found); }, timeoutMs);
  });
}
```

### 6.4 Master-side registration call
```typescript
// apps/master/backend/services/fleetRegistration.ts (NEW)
import { registerMaster, sendHeartbeat, getHubToken } from './hubClient';

export async function registerWithHub(state: InstallerState): Promise<RegistrationResult> {
  const token = state.hub!.access_token!;
  const fp = await computeHardwareFingerprint();   // sha256:cpu+disk+mac
  const pub = await exportPublicKeyPem();

  const res = await fetch(`${HUB_BASE}/api/v1/fleet/register`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      'x-idempotency-key': state.desk!.proposed_id   // safe to retry
    },
    body: JSON.stringify({
      desk_id: state.desk!.confirmed_id,
      name: state.desk!.name,
      location: state.desk!.location,
      country: state.desk!.country,
      timezone: state.desk!.timezone,
      currency: state.desk!.currency,
      hardware_fingerprint: fp,
      public_key: pub,
      version: APP_VERSION,
      kiosks_paired: state.pairings.map(p => ({ kiosk_id: p.kiosk_id, mac: p.mac }))
    })
  });
  if (!res.ok) throw new Error(`Registration failed: ${res.status} ${await res.text()}`);
  const reg = await res.json() as RegistrationResult;
  persistHubCredentials(reg);
  scheduleHeartbeatLoop(reg);
  return reg;
}

async function scheduleHeartbeatLoop(reg: RegistrationResult) {
  const tick = async () => {
    try {
      const metrics = await collectMasterMetrics();
      const cmd = await sendHeartbeat(reg.desk_id, reg.jwt_token, metrics);
      if (cmd.pending_commands?.length) await processHubCommands(cmd.pending_commands);
    } catch (err) {
      log.warn({ err }, 'heartbeat failed; will retry next tick');
    } finally {
      setTimeout(tick, 60_000 + Math.random() * 1000);  // 60s ± 1s jitter
    }
  };
  tick();
}
```

### 6.5 Touch-side pairing controller
```typescript
// apps/touch/src/services/pairingService.ts (NEW)
import { discoverMasters } from './mdnsDiscovery';
import { sweepLan } from './lanSweep';
import { readQr } from './qrReader';

export async function pairWithMaster(kioskId: string): Promise<PairingResult> {
  // 1) try mDNS
  let masters = await discoverMasters(5000);

  // 2) if mDNS blocked, try LAN sweep
  if (masters.length === 0) {
    masters = await sweepLan(['192.168.0.0/16', '10.0.0.0/8'], 8090, 3000);
  }

  // 3) if still nothing, fall back to QR
  if (masters.length === 0) {
    const qr = await readQrFromScreen();
    return await pairViaQr(qr);
  }

  // 4) rank: same subnet > same tenant > lowest latency
  const myIp = await getLocalIp();
  const ranked = masters
    .filter(m => isSameSubnet(m, myIp) && (await ping(m)) < 50)
    .sort((a, b) => a.latency - b.latency);

  if (ranked.length === 0) throw new Error('No Master on this network');
  const master = ranked[0];

  // 5) challenge-response
  const challenge = await fetch(`http://${master.host}:${master.port}/api/v1/pairing/challenge`).then(r => r.json());
  const signature = signHmac(kioskId, challenge.nonce, master.hmac_secret);
  const exchange = await fetch(`http://${master.host}:${master.port}/api/v1/pairing/exchange`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kiosk_id: kioskId, nonce: challenge.nonce, signature })
  }).then(r => r.json());

  await persistPairing({ master_desk_id: master.desk_id, master_ip: master.host, master_port: master.port, ...exchange });
  return { master_desk_id: master.desk_id };
}
```

---

## 7. Acceptance criteria for "shipped"

The flow is done when **all** of these are true:

- [ ] A new install on a clean Windows 11 PC completes the 7 steps in < 10 min on a 50 Mbps link.
- [ ] The same flow completes in < 15 min on a 1 Mbps link with 200ms latency.
- [ ] The same flow completes in < 25 min **offline** using the USB bootstrap bundle, and syncs the registration within 60s of coming online.
- [ ] Three Touch kiosks pair via mDNS in < 30s.
- [ ] Three Touch kiosks pair via QR fallback in < 90s when mDNS is blocked.
- [ ] The Master appears as "online" in the Hub dashboard within 5s of the first heartbeat.
- [ ] A test photo uploaded from the Master lands in `uploads/<desk_id>/test/...` in R2 within 10s.
- [ ] A 4th Master added to a fleet of 3 existing Masters causes all 3 to see the new peer in their FleetDashboard within 60s.
- [ ] A cloned Master (hardware fingerprint mismatch) is rejected with a clear error and the original keeps working.
- [ ] All Hub endpoints have rate limiting (60 req/min per install_token, 10 req/min per IP for anonymous).
- [ ] The installer is signed (Windows code signing cert in CI).
- [ ] The installer ships as a single NSIS .exe < 100 MB.

---

## 8. The 4-week build plan

| Week | Owner | Deliverable |
|---|---|---|
| W1 | Electron eng | Extend `useInstallerState` to the 7-step state above; add UI components for each step |
| W1 | CF eng | Implement `/api/v1/license/validate` + `/api/v1/oauth/device/code` + `/oauth/token` in `apps/management/backend/src/routes/oauth.ts` |
| W2 | CF eng | Implement `/api/v1/fleet/check-desk-id` + `/api/v1/fleet/register` + `/api/v1/fleet/heartbeat` |
| W2 | Electron eng | Wire Cloudflare OAuth in `apps/installer/src/services/oauthHandler.ts` |
| W3 | Electron eng | Implement pairing wizard step with mDNS + LAN sweep + QR fallback |
| W3 | Electron eng | Wire `/api/v1/pairing/challenge` and `/exchange` on Master (existing `pairing.ts` extended) |
| W4 | All | End-to-end smoke test, fix all P0s, write the "First 10 minutes" manual, internal demo |

---

## 9. What this plan explicitly does NOT include

We are not in this plan:
- **Mobile companion app.** Q4 2026 bet, see `ECOSYSTEM_MASTER_PLAN_V6.md` §8.
- **Stripe Tax, multi-currency pricing.** Q4 2026.
- **Public API for third parties.** Q4 2026.
- **AI culling v2.** Already shipping as opt-in beta in `apps/master/backend/services/aiCullingService.ts` — separate track.

*End of onboarding plan — proceed to file 03.*
