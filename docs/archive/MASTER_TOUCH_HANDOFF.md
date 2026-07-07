# Master↔Touch Handoff Audit

> **Scope:** Wire-level protocol, pairing, mDNS, LAN sweep, transfer protocol, signed URLs, and security for Touch→Master photo upload and sync.  
> **Sources:** Real file content from `apps/master/backend`, `apps/touch/backend`, `apps/installer/electron-main.ts`, and related components.  
> **Date:** 2026-06-12  
> **Auditor:** Hermes Agent (kimi-k2.6)

---

## 1. Discovery (mDNS, LAN Sweep, QR, Fallback)

### 1.1 mDNS Service Types & Ports

| Role | Advertised Type | Port | TXT Fields |
|------|-----------------|------|------------|
| **Master** | `clickflash` (Bonjour `type: "clickflash"`) | **8090** | `deskId`, `version`, `name`, `status`, `timestamp` |
| **Touch** | `clickflash-touch` (Bonjour `type: "clickflash-touch"`) | **8091** | `kioskId`, `version`, `status`, `timestamp` |

- **Master advertiser:** `MasterMdnsDiscovery.advertise()` in `apps/master/backend/services/mdnsDiscovery.ts` (lines 28-42).
- **Touch browser:** `TouchMdnsDiscovery.browseForMasters()` in `apps/touch/backend/services/mdnsDiscovery.ts` (lines 41-66).
- **Installer mDNS query:** Raw UDP multicast to `224.0.0.251:5353` querying `_clickflash-master._tcp.local` in `apps/installer/electron-main.ts` (lines 466-488).

### 1.2 LAN Sweep Fallback

If mDNS returns zero results, the installer falls back to a **LAN sweep** (`apps/installer/electron-main.ts`, lines 521-572):

- **Range:** For each detected local subnet (`getLocalSubnets()`), it scans **1–254** on the /24 prefix (e.g., `192.168.1.1` through `192.168.1.254`).
- **Subnets detected:** `os.networkInterfaces()` IPv4 non-internal addresses; fallback to `192.168.1` and `10.0.0` if detection fails (lines 893-911).
- **Ports probed:** `[8090, 8080]`.
- **Sweep limit:** `candidates.slice(0, 512)` — max 512 IPs scanned to avoid excessive traffic (line 543).
- **Health check:** Each candidate is hit with `GET /api/v1/pairing/challenge` with a **1500 ms timeout**.
- **No ARP scan:** The code uses pure HTTP probing; no ARP or ICMP ping is performed.

### 1.3 QR Code Payload

The QR code is generated in `TouchPairingStep.tsx` (lines 23-30) after a successful pairing:

```json
{
  "master_url": "http://{masterIp}:8090",
  "desk_id": "{kioskId}",
  "fp": "{hardwareFingerprint}"
}
```

- **Note:** This QR payload is a **fallback for manual pairing** when auto-discovery fails. It does **not** contain a pairing token or HMAC secret.
- The Touch kiosk can also scan a Master-generated QR via `POST /pairing/scan-qr` (`apps/touch/backend/routes/pairing.ts`, lines 62-113), which expects a different payload:
  ```json
  { "deskId": "...", "ip": "...", "port": 8090, "pairingToken": "...", "timestamp": 1234567890, "version": "..." }
  ```
  - QR freshness: **5 minutes** (410 if expired).

### 1.4 Fallback Chain

1. mDNS discovery (`discoverMasters`)
2. LAN sweep (`scanLan`)
3. QR code fallback (manual IP or scan)
4. Manual IP entry (`manualIp` input in `TouchPairingStep.tsx`)

---

## 2. Pairing Handshake (Challenge/Exchange)

### 2.1 V1 Challenge-Response Pairing

Defined in `apps/master/backend/routes/pairing.ts` (lines 268-363) and tested in `pairing.test.ts`.

**Step 1 — Challenge:**
- `GET /api/v1/pairing/challenge`
- Master generates `nonce = crypto.randomBytes(32).toString("base64")`.
- `desk_id` is read from `x-desk-id` header or `process.env.DESK_ID`.
- Nonce stored in **in-memory Map** with 5-minute TTL (`NONCE_TTL_MS = 5 * 60 * 1000`).
- Response:
  ```json
  { "nonce": "...", "desk_id": "...", "expires_at": "...", "algorithm": "HMAC-SHA256" }
  ```

**Step 2 — Exchange:**
- `POST /api/v1/pairing/exchange`
- Body (Zod validated):
  ```json
  {
    "kiosk_id": "KIOSK_[A-Z0-9_]{3,32}",
    "nonce": "...",
    "signature": "base64 HMAC",
    "hardware_fingerprint": "sha256:[a-f0-9]{64}",
    "tenant_id": "optional"
  }
  ```
- **Signature verification:**
  ```
  expectedSig = HMAC-SHA256(key = desk_id + "|" + hardware_fingerprint, message = kiosk_id + "|" + nonce)
  ```
  - Uses `crypto.timingSafeEqual()` for constant-time comparison (line 327).
- **Nonce behavior:** Deleted immediately after first lookup (single-use). If replayed → 401 "Invalid or expired nonce".

**Step 3 — Response:**
```json
{
  "hmac_secret": "base64(32 random bytes)",
  "tenant_id": "...",
  "desk_id": "...",
  "master_ip": "...",
  "master_port": 8090,
  "algorithm": "HMAC-SHA256"
}
```

- The secret is persisted in the `pairings` table (`hmac_secret` column) and also stored in the `kiosks` table (`signingSecret`) during legacy `/pairing/validate` flow.

### 2.2 Legacy Token-Based Pairing

- `POST /api/pairing/register` — Master creates a time-bound `pairingToken` stored in `pairing_tokens` table with `expires_at` and `used` flag.
- `POST /api/pairing/validate` — Touch redeems token; Master marks `used = 1` and returns a `signingSecret`.
- Token expiration cleanup runs on startup (`DELETE FROM pairing_tokens WHERE expires_at < now`).

---

## 3. Auth (HMAC, JWT, Rotation)

### 3.1 HMAC Signing for Touch→Master Requests

**Primary enforcement:** `lanSigningMiddleware.ts` (`apps/master/backend/shared/lanSigningMiddleware.ts`)

**Required headers on every LAN request:**
| Header | Value |
|--------|-------|
| `X-Kiosk-Id` | Kiosk ID (e.g., `KIOSK_DESKTOP_A1B2`) |
| `X-Timestamp` | Unix timestamp in ms |
| `X-Signature` | HMAC-SHA256 hex signature |

**Signature payload canonicalization:**
```
payload = {kioskId}:{timestamp}:{method}:{path}:{canonicalJson(body)}
```
- Body is sorted-key JSON (line 88-92 in `lanSigningMiddleware.ts`).
- Example: `KIOSK_01:1680000000000:POST:/api/sync/mutation:{"action":"createPhoto","data":{...}}`

**Verification steps:**
1. Client IP must be private (`isPrivateIp`) — 403 if not.
2. Timestamp must be within ±5 minutes — 401 if stale.
3. Lookup `signingSecret` from `kiosks` table by `id = kioskId`.
4. Recompute HMAC and compare.

### 3.2 Secret Generation & Storage

| Secret | Generated Where | Stored Where | Rotation |
|--------|-----------------|--------------|----------|
| **Pairing HMAC secret** | `pairing.ts` line 333: `crypto.randomBytes(32).toString("base64")` | `pairings.hmac_secret` (SQLite) | **None automatic** — new secret generated on re-pairing only |
| **Kiosk signingSecret** | `pairing.ts` line 126: `crypto.randomBytes(32).toString("hex")` | `kiosks.signingSecret` (SQLite) | **None automatic** — only on re-pairing |
| **SERVICE_SECRET** | `server.ts` lines 194-226: `randomUUID()` or env var | `settings` table (`id='SERVICE_SECRET'`) | **None** — persists across restarts |
| **JWT_SECRET** | `server.ts` / `touch/backend/server.ts` | `jwt.secret` file on disk (mode 0o600) | **None** — generated once if missing |

**Rotation gaps:**
- No automatic rotation of HMAC secrets.
- No expiry on `kiosks.signingSecret`.
- No key versioning or rollover mechanism.

### 3.3 JWT Auth

- Master uses **session cookies** + **Bearer JWT** (`authMiddleware.ts`).
- Touch uses **Bearer JWT only** (`touch/backend/server.ts`, lines 312-337).
- `JWT_SECRET` is shared but stored separately per app (file vs env).
- `TokenRefreshService` exists in Master (`server.ts` line 158) but no explicit refresh logic was found in the audited files.

---

## 4. Photo Upload Wire Protocol

### 4.1 Touch→Master Sync Endpoint

**Route:** `POST /api/sync/mutation` (`apps/master/backend/routes/sync.ts`)

**Middleware stack:**
1. `strictRateLimiter` (5 req/min)
2. `validate(mutationSchema)` (Zod)
3. `verifyLanRequest` (HMAC signing + private IP check)

**Request format:**
```http
POST /api/sync/mutation HTTP/1.1
Host: {master_ip}:8090
Content-Type: application/json
X-Kiosk-Id: KIOSK_...
X-Timestamp: 1680000000000
X-Signature: a1b2c3...

{ "action": "createPhoto", "data": { ... } }
```

**Body limits:**
- Master JSON parser: `express.json({ limit: "50mb" })` (`server.ts` line 418).
- Touch JSON parser: `bodyParser.json({ limit: "1mb" })` (`touch/backend/server.ts` line 420).
- **Multipart/form-data** bypasses JSON parsing and is handled by `formidable` in `files.ts` (logo upload only, 5MB max).

### 4.2 File Serving (Master→Touch or Gallery)

**Route:** `GET /api/files/{collection}/{id}/{filename}` (`files.ts`)

- Supports **Range requests** (bytes) for chunked transfer.
- Computes **MD5 content hash** (`X-File-MD5` header) for integrity verification.
- ETag + `If-None-Match` / `If-Modified-Since` caching.
- **No auth required** for `/api/files/*` if `X-Service-Token` matches `SERVICE_SECRET` (`authMiddleware.ts` lines 78-86); otherwise falls through to normal auth.

### 4.3 Idempotency / Deduplication

- **No explicit dedup key** was found in the sync or upload routes.
- The `DbWriteQueue` (`apps/master/backend/services/DbWriteQueue.ts`) uses `table:id` as a merge key for pending writes, but this is for DB updates, not photo uploads.
- No file-hash deduplication at the HTTP layer.

### 4.4 Retry Behavior

- `DbWriteQueue` has **power-cycle resilience**: writes are persisted to `pending_writes` table before flush.
- On boot, unflushed writes are recovered and re-applied (lines 261-313).
- Retry count is tracked (`retry_count` column) but no automatic backoff logic was found.
- `WriteBuffer` (`apps/master/backend/shared/WriteBuffer.ts`) is a generic batching utility; no retry strategy — errors are logged and dropped.

---

## 5. Rejection Conditions

| Condition | HTTP Status | Source |
|-----------|-------------|--------|
| **Non-private IP** | 403 Forbidden | `lanSigningMiddleware.ts` line 19-28; `pairing.ts` line 38-45 |
| **Missing HMAC headers** | 401 Unauthorized | `lanSigningMiddleware.ts` line 35-49 |
| **Timestamp > 5 min skew** | 401 Unauthorized | `lanSigningMiddleware.ts` line 52-65 |
| **Unknown kiosk ID** | 401 Unauthorized | `lanSigningMiddleware.ts` line 68-84 |
| **Invalid HMAC signature** | 401 Unauthorized | `lanSigningMiddleware.ts` line 105-116 |
| **Invalid/expired nonce** | 401 Unauthorized | `pairing.ts` line 309-315 |
| **Reused nonce** | 401 Unauthorized | `pairing.ts` line 307 (deleted after use) |
| **Invalid pairing token** | 404 Not Found | `pairing.ts` line 86-92 |
| **Expired pairing token** | 410 Gone | `pairing.ts` line 98-107 |
| **Already-used token** | 409 Conflict | `pairing.ts` line 110-116 |
| **Rate limit exceeded** | 429 Too Many Requests | `rateLimiter.ts` line 76-82 |
| **No auth/session** | 401 / structured error | `authMiddleware.ts` line 101 |
| **Invalid JWT** | 401 Unauthorized | `authMiddleware.ts` line 61-65; Touch `server.ts` line 333-335 |
| **Request timeout** | 408 Request Timeout | Touch `server.ts` line 426-434 (30s) |
| ** desk_id mismatch** | Not explicitly checked | **GAP** — no binding between HMAC secret and desk_id on sync |

---

## 6. Telemetry & Audit

### 6.1 Audit Logger

`AuditLogger` (`apps/master/backend/shared/auditLogger.ts`) writes JSON lines to `DATA_DIR/audit_logs/audit-{YYYY-MM-DD}.log`.

**Events logged:**
- `LOGIN_ATTEMPT` — email, success, IP, reason
- `LOGOUT` — userId, email, IP
- `TOKEN_REFRESH` — userId, email, IP
- `UNAUTHORIZED_ACCESS` — endpoint, IP, reason
- `RATE_LIMIT_EXCEEDED` — IP, endpoint
- `SUSPICIOUS_ACTIVITY` — description, IP, details
- `DATA_ACCESS` — userId, email, action (PUT/PATCH/DELETE), resource, resourceId
- `CONFIG_CHANGE` — userId, email, setting, oldValue, newValue
- `SYSTEM_ERROR` — message, stack, context

**Retention:** 30 days or 50 MB per file, whichever comes first (lines 5-6).

### 6.2 Mutation Audit Middleware

`createMutationAuditMiddleware` (`apps/master/backend/middleware/mutationAudit.ts`):
- Logs every **PUT, PATCH, DELETE** to `/api/*` with status < 400.
- Extracts resource name from second path segment and resource ID from last UUID/numeric segment.
- **Does NOT log POST** (including `/api/sync/mutation`).

### 6.3 Request Logging

Master `server.ts` (lines 570-585):
- Logs `[Request] {method} {url}` at start.
- Logs `[Response] {method} {url} {status} ({duration}ms)` on `finish` event.

### 6.4 Photo Transfer Telemetry

- **No dedicated telemetry** for photo upload bytes, duration, retry count, or per-transfer errors was found in the sync routes.
- `networkMonitor?.recordEvent()` is called in `files.ts` (line 272-277) when serving files, but this is for **downloads**, not uploads.
- `cloudSyncService` has stats (`getStats()`, `getCandidates()`) but these are for **cloud sync**, not Touch→Master LAN sync.

---

## 7. Gaps & Risks

| # | Risk | Severity | Evidence |
|---|------|----------|----------|
| 1 | **No automatic HMAC secret rotation** | Medium | Secrets persist indefinitely in `pairings` and `kiosks` tables. Re-pairing generates a new secret, but no expiry or rotation schedule exists. |
| 2 | **No binding between desk_id and kiosk secret on sync** | Medium | `lanSigningMiddleware` validates kiosk ID and signature, but does **not** verify that the kiosk is authorized for the specific `desk_id` in the payload. A compromised kiosk could potentially target any master if network-accessible. |
| 3 | **No explicit dedup key for photo uploads** | Low | `sync/mutation` has no idempotency key. Duplicate mutations could create duplicate records. |
| 4 | **POST mutations not audit-logged** | Medium | `mutationAudit.ts` only logs PUT/PATCH/DELETE. `POST /api/sync/mutation` (the main Touch→Master photo upload path) is **not captured** in the audit log. |
| 5 | **No upload telemetry (bytes, duration, retries)** | Low | No metrics emitted for `sync/mutation` requests. Network monitor only tracks file downloads. |
| 6 | **LAN sweep is unauthenticated** | Low | `GET /api/v1/pairing/challenge` is publicly accessible on the LAN (no HMAC required). An attacker on the same network can enumerate masters by probing challenge endpoints. |
| 7 | **Nonce store is in-memory only** | Low | Nonces die with process restart. Not a security issue (they're short-lived), but means pairing cannot survive a master restart mid-handshake. |
| 8 | **QR code lacks signature** | Low | The QR payload in `TouchPairingStep.tsx` is plain JSON with no HMAC or expiry. If photographed, it reveals master URL and kiosk ID. |
| 9 | **Touch backend uses `http://192.168.*` and `http://10.*` in CORS** | Low | `touch/backend/server.ts` lines 371-372 allows broad LAN origins in dev and production CSP/connectSrc. Combined with `credentials: true`, this increases CSRF surface if an attacker controls a LAN origin. |
| 10 | **No mDNS TTL or revocation** | Low | If a kiosk is decommissioned, its `pairings` row remains until manually deleted. No heartbeat-based revocation. |

---

## 8. Open Questions

1. **How is the `sync/mutation` schema (`mutationSchema`) defined?** The file `apps/master/backend/schemas/auth` was not audited; we need to confirm whether it enforces size limits, required fields, or idempotency keys.
2. **What is the `networkMonitor.recordEvent()` implementation?** It is referenced in `files.ts` but its actual storage/retention was not inspected.
3. **Does the `TokenRefreshService` actually refresh kiosk tokens?** It is instantiated in `server.ts` but no usage was found in the audited routes.
4. **Is there a mechanism to revoke a compromised kiosk signing secret without re-pairing?** No API endpoint for secret revocation was found.
5. **What happens when a Touch kiosk uploads a photo larger than 50 MB?** The Master JSON limit is 50 MB, but photos are typically multipart. The multipart path uses `formidable` only for logo uploads; large photo uploads may fail or be unsupported via `sync/mutation`.
6. **Is the `pairing/confirm` endpoint (referenced in Touch `pairing.ts` line 130) implemented?** It is called by Touch but no corresponding Master route was found in the audited files (Master has `pairing/validate` and `pairing/register`, but not `pairing/confirm`).

---

## Appendix: File Citations

| File | Lines | Relevance |
|------|-------|-----------|
| `apps/master/backend/routes/pairing.ts` | 1-390 | Challenge-response, token validation, secret generation |
| `apps/master/backend/routes/pairing.test.ts` | 1-236 | Test coverage for pairing flow |
| `apps/master/backend/services/mdnsDiscovery.ts` | 1-78 | Master mDNS advertiser |
| `apps/touch/backend/services/mdnsDiscovery.ts` | 1-87 | Touch mDNS browser |
| `apps/installer/electron-main.ts` | 453-572 | mDNS query builder, LAN sweep, exchange logic |
| `apps/installer/src/hooks/useInstallerState.ts` | 316-387 | Pairing UX state machine |
| `apps/installer/src/components/TouchPairingStep.tsx` | 1-162 | QR code generation, manual IP fallback |
| `apps/master/backend/shared/lanSigningMiddleware.ts` | 1-133 | HMAC verification for Touch→Master requests |
| `apps/master/backend/middleware/auth.ts` | 1-103 | Session/JWT auth, service token bypass for files |
| `apps/master/backend/middleware/mutationAudit.ts` | 1-66 | Mutation audit logging (PUT/PATCH/DELETE only) |
| `apps/master/backend/routes/sync.ts` | 1-56 | `POST /api/sync/mutation` — Touch→Master sync endpoint |
| `apps/master/backend/server.ts` | 1-883 | Server setup, public API prefixes, rate limiters, body limits |
| `apps/touch/backend/server.ts` | 1-625 | Touch server, CORS, JWT, request timeout |
| `apps/touch/backend/routes/pairing.ts` | 1-281 | Touch-side pairing: discover, scan-qr, complete |
| `apps/master/backend/routes/files.ts` | 1-487 | File serving with range, MD5, ETag |
| `apps/master/backend/shared/rateLimiter.ts` | 1-157 | IP-based and user-based rate limiting |
| `apps/master/backend/services/DbWriteQueue.ts` | 1-358 | Power-cycle resilient write queue |
| `apps/master/backend/shared/WriteBuffer.ts` | 1-75 | Generic batching buffer |
| `apps/master/backend/shared/auditLogger.ts` | 1-127 | Audit log implementation |
| `apps/master/backend/routes/cloud.ts` | 1-250 | Cloud sync stats (not directly in LAN path) |
| `apps/master/backend/services/encryptionService.ts` | 1-257 | DB encryption, backup encryption (not wire protocol) |

---

*End of Audit Report*
