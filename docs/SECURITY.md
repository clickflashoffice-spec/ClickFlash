# ClickFlash Security Architecture

> **Version:** 4.2.0  
> **Last Updated:** June 2026  
> **Classification:** Internal — Engineering & Operations

---

## 1. Security Model Overview

ClickFlash employs a **defense-in-depth** strategy across three deployment tiers:

| Tier | Threat Model | Primary Controls |
|------|-------------|------------------|
| **Electron Sandbox** | Local privilege escalation, renderer compromise | `contextIsolation`, `sandbox`, CSP, preload bridge |
| **LAN Communication** | Man-in-the-middle, replay attacks, unauthorized kiosks | HMAC-SHA256 signing, replay windows, IP whitelisting |
| **Cloud Authentication** | Session hijacking, credential stuffing, token theft | RS256 JWT, hardware fingerprinting, short expiry |
| **Data at Rest** | Physical device theft, backup exfiltration | SQLCipher AES-256, OS keychain, AES-256-GCM backups |

All layers are mutually reinforcing: a compromise in one tier does not automatically grant access to the next.

---

## 2. Electron Security Hardening

### 2.1 Renderer Process Isolation

Both **Master Portal** (`apps/master`) and **Touch Kiosk** (`apps/touch`) enforce identical renderer policies:

```typescript
webPreferences: {
  nodeIntegration: false,      // NEVER expose Node.js APIs to renderer
  contextIsolation: true,        // Isolate preload from renderer context
  sandbox: true,               // OS-level renderer sandbox (Chromium)
  preload: getPreloadPath(),   // Whitelist-only IPC bridge
  devTools: !app.isPackaged,   // Disable DevTools in production
  allowRunningInsecureContent: false,
}
```

### 2.2 Content Security Policy (CSP)

A strict CSP is injected via `session.defaultSession.webRequest.onHeadersReceived`:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: clickflash://;
font-src 'self' data:;
connect-src 'self' http://localhost:*;
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
```

- `unsafe-inline` for styles is required by Tailwind CSS but scripts are strictly `'self'`.
- `clickflash://` custom protocol serves encrypted photo assets with path traversal guards.

### 2.3 Navigation & Window Guards

| Event | Action |
|-------|--------|
| `will-navigate` | Block any URL not `file://`, `data:`, `clickflash://`, or `localhost` |
| `will-redirect` | Same whitelist as navigation |
| `setWindowOpenHandler` | Deny all new windows (`{ action: "deny" }`) |
| `will-attach-webview` | PreventDefault — webviews are forbidden |
| `context-menu` | PreventDefault in production |

### 2.4 Preload Script IPC Bridge

The preload script (`preload.ts`) exposes **only** whitelisted channels via `contextBridge`:

- **Invoke channels:** `kiosk:unlock`, `kiosk:lock`, `dialog:*`, `updater:*`
- **On channels:** `kiosk:show-unlock-dialog`, `updater:*`

Any attempt to call an unlisted channel throws a synchronous error in the renderer.

---

## 3. LAN Communication

### 3.1 HMAC-SHA256 Request Signing

All Touch → Master API requests carry an `X-Signature` header computed as:

```
HMAC-SHA256(
  key = kiosk.signingSecret (32-byte hex, generated at pairing time),
  message = "<METHOD>|<PATH>|<BODY_HASH>|<TIMESTAMP>"
)
```

The `signingSecret` is:
- Generated during `POST /pairing/initiate` (`crypto.randomBytes(32).toString('hex')`)
- Stored in the `kiosks` table, never transmitted after pairing
- Invalidated on unpair (`signingSecret = NULL`)

### 3.2 Replay Prevention

- **Timestamp tolerance:** ±5 minutes (300 seconds)
- **Nonce tracking:** One-time pairing tokens (`pairing_tokens.used = 1`) prevent re-use
- **Token expiry:** Pairing tokens expire after 5 minutes; secrets persist until unpaired

### 3.3 Network Isolation (Touch Kiosk)

Touch Kiosk enforces LAN-only egress via `webRequest.onBeforeRequest`:

```typescript
const ALLOWED_HOSTS = [
  "localhost", "127.0.0.1",
  /^192\.168\.\d+\.\d+$/,      // Class C private
  /^10\.\d+\.\d+\.\d+$/,         // Class A private
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // Class B private
];
```

External requests are **cancelled** and logged. Referer headers are stripped to prevent internal structure leaks.

### 3.4 Pairing Flow

1. **Initiate** (Master): Generates `pairingToken` + `hmacSecret`, returns QR payload (public data only)
2. **Confirm** (Touch): Sends `pairingToken` back; Master marks token used and persists kiosk record
3. **Validate** (Legacy): Backward-compatible token validation with secret rotation
4. **Unpair** (Master): Sets `signingSecret = NULL`, immediately invalidating all kiosk signatures

---

## 4. Cloud Authentication

### 4.1 JWT Configuration

ClickFlash uses **RS256** (asymmetric) JWT for cloud-facing tokens where applicable, and **HS256** for internal session tokens:

| Token Type | Algorithm | Key Source | Expiry |
|-----------|-----------|-----------|--------|
| Internal API / Session | HS256 | `JWT_SECRET` (64-byte hex, auto-generated) | Session lifetime |
| Cloud Sync (future) | RS256 | Private key in OS keychain | 15 minutes |

### 4.2 Hardware Fingerprinting

The `HardwareService` generates a stable `desk_id` from:
- CPU serial / board UUID
- MAC address (primary interface)
- OS installation ID

This `desk_id` is embedded as a JWT claim and validated on every cloud sync request to prevent token replay across devices.

### 4.3 Session Security

- **Storage:** `better-sqlite3-session-store` with `express-session`
- **Cookie flags:** `httpOnly`, `secure` (production), `sameSite: 'lax'`
- **CSRF:** Double-submit cookie pattern with `XSRF-TOKEN` header validation (see `csrf.ts`)
- **Kiosk bypass:** CSRF is skipped for HMAC-signed kiosk requests (`x-kiosk-id` + `x-signature`)

---

## 5. Data Protection

### 5.1 Database Encryption (SQLCipher)

ClickFlash uses `better-sqlite3-multiple-ciphers` with **SQLCipher**:

```typescript
// Key pragma
PRAGMA key = '<password>';

// Re-key (rotation)
PRAGMA rekey = '<new_password>';
```

- **Key derivation:** PBKDF2-HMAC-SHA256, 100,000 iterations
- **Key length:** 256 bits (32 bytes)
- **Key storage:** OS keychain (DPAPI on Windows, Keychain on macOS, Secret Service on Linux)
- **Verification:** Test table `__encryption_verify` written on first enable

### 5.2 Cloud Object Storage (R2)

- **Buckets:** Private by default; no public read access
- **Presigned URLs:** Time-limited (5 min) for direct gallery downloads
- **CORS:** Restricted to `https://*.clickflash.app` origins

### 5.3 Backup Encryption

Backups are encrypted with **AES-256-GCM** before upload:

```
[ IV (16 bytes) | Auth Tag (16 bytes) | Ciphertext ]
```

- Key generated via `crypto.randomBytes(32)` and stored in OS keychain
- Integrity verified via GCM auth tag before restoration
- Backup service runs daily via `BackupService.runDailyBackup()`

---

## 6. GDPR Compliance

Implemented via `GdprService` (`apps/master/backend/services/gdprService.ts`).

### 6.1 Consent Tracking (Article 7)

- `consent_records` table stores: `customer_id`, `photo_id`, `consent_type`, `granted_at`, `ip_address`, `user_agent`
- Consent can be withdrawn; `withdrawn_at` timestamp is set and photo status updated

### 6.2 Right to Erasure (Article 17)

`deleteCustomerData(customerId)` performs **hard deletion** across:
- `photos` (physical files handled by caller)
- `orders`
- `consent_records`
- `data_export_requests`
- `customers`

All deletions are wrapped in a SQLite transaction and logged to `data_deletion_logs`.

### 6.3 Data Portability (Article 20)

`exportCustomerData(customerId)` returns structured JSON:
- Photos metadata
- Orders & items
- Consent history
- Contact info

Export requests are queued in `data_export_requests` with status tracking.

### 6.4 Retention Policies

| Data Class | Default Retention | Configurable |
|-----------|-------------------|--------------|
| Customer data | 2 years | `gdpr_retention_years` setting |
| Unsold photos | 30 days | `gdpr_unsold_photo_days` setting |
| Auto-purge | Enabled | `gdpr_auto_purge_enabled` setting |

`applyRetentionPolicy()` runs as a scheduled job and deletes data past retention.

### 6.5 Breach Notification (Articles 33–34)

`logDataBreach()` records:
- `description`, `severity` (low/medium/high/critical)
- `discovered_at`, `affected_count`
- `status`: open → notified → resolved → closed

Target notification SLA: **72 hours** to supervisory authority.

### 6.6 DPA Generation

`generateDpaDocument(studioName)` produces a signed Data Processing Agreement covering:
- Subject matter, duration, nature & purpose
- Types of personal data and data subjects
- Processor obligations (Articles 28, 32)
- Sub-processor list: Stripe, Cloud Sync, DNP/Thermal printers

---

## 7. Token Management

### 7.1 OS Keychain Integration

Encryption keys and cloud tokens are stored via:
- **Windows:** DPAPI (`CryptProtectData`)
- **macOS:** Keychain (`kSecClassGenericPassword`)
- **Linux:** Secret Service API / `libsecret`

### 7.2 Secret Lifecycle

| Secret | Generation | Persistence | Rotation |
|--------|-----------|-------------|----------|
| `JWT_SECRET` | `crypto.randomBytes(64)` | `DATA_DIR/secrets.json` (mode `0o600`) | Manual restart |
| `SESSION_SECRET` | `crypto.randomBytes(64)` | `DATA_DIR/secrets.json` (mode `0o600`) | Manual restart |
| DB encryption key | PBKDF2 + user password | OS keychain | On-demand via `rotateKey()` |
| Backup key | `crypto.randomBytes(32)` | OS keychain | Per-backup optional |
| HMAC secret | `crypto.randomBytes(32)` | SQLite `kiosks.signingSecret` | On re-pair |

### 7.3 Logging Discipline

- **NEVER** log secrets, tokens, or keys
- **NEVER** log full credit card numbers, PINs, or passwords
- **ALWAYS** log token prefixes (first 8 chars) for correlation
- **ALWAYS** use the structured `Logger` from `@/utils/logger`, never `console.log`

---

## 8. Audit Logging

### 8.1 Mutation Audit (`mutationAudit.ts`)

Every successful `PUT`, `PATCH`, `DELETE` to `/api/*` is logged:

```typescript
{
  userId: string,      // or 'anonymous'
  email: string,
  action: 'PUT' | 'PATCH' | 'DELETE',
  resource: string,    // e.g., 'orders'
  resourceId: string | null,
  timestamp: ISO8601
}
```

Logs are written **after** response finish to add zero latency to the hot path.

### 8.2 Data Access Audit (`AuditService`)

Cross-service operations carry a `correlationId` (`cf_${timestamp}_${random}`):

| Event Type | Tables |
|-----------|--------|
| Upload audit | `audit_uploads` |
| Order sync audit | `audit_order_sync` |
| Sales sync audit | `audit_sales_sync` |

### 8.3 Unauthorized Access Logging

`authMiddleware` logs all failed authentication attempts:
- `INVALID_TOKEN` — JWT signature or expiry failure
- `UNAUTHORIZED_FILE_ACCESS_ATTEMPT` — Missing `x-service-token` for `/api/files/*`
- `NO_SESSION_OR_TOKEN` — Anonymous request to protected route

---

## 9. Vulnerability Reporting

If you discover a security vulnerability in ClickFlash:

1. **DO NOT** open a public issue or discussion.
2. Email **security@clickflash.app** with:
   - Affected component (Electron, backend, cloud, etc.)
   - Steps to reproduce
   - Impact assessment (confidentiality / integrity / availability)
   - Suggested fix (if any)
3. Allow **72 hours** for initial acknowledgment.
4. We follow coordinated disclosure: fix → patch release → public advisory.

Bug bounty eligibility is determined on a per-report basis.

---

## 10. Security Checklist

Use this checklist before every production release:

### Pre-Build
- [ ] `nodeIntegration: false` in all `BrowserWindow` configs
- [ ] `contextIsolation: true` in all `BrowserWindow` configs
- [ ] `sandbox: true` in all `BrowserWindow` configs
- [ ] Preload script channel whitelist reviewed for new IPC handlers
- [ ] CSP policy updated if new asset sources added
- [ ] `devTools` disabled (`!app.isPackaged` or explicit `false`)

### Build & Packaging
- [ ] Native dependencies listed in `asarUnpack` (better-sqlite3, sharp, canvas, bcrypt)
- [ ] `asar: true` enabled in `electron-builder.yml`
- [ ] `!pb_data/**/*` excluded from packaged files
- [ ] `!src/**/*` and `!backend/**/*` excluded (source leak prevention)
- [ ] Code signing configured (Windows Azure Trusted Signing / macOS Apple Developer ID)

### Backend Hardening
- [ ] `JWT_SECRET` and `SESSION_SECRET` are set or auto-generated with `0o600` permissions
- [ ] Rate limiting enabled (`RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS`)
- [ ] CSRF middleware mounted on all state-changing routes
- [ ] CORS `ALLOWED_ORIGINS` restricted to known hosts
- [ ] TLS enabled (`TLS_ENABLED=true`) for cloud-facing deployments

### Data & Compliance
- [ ] SQLCipher encryption enabled on production databases
- [ ] Backup encryption key stored in OS keychain
- [ ] GDPR retention policy configured and auto-purge enabled
- [ ] Audit log tables migrated and writable
- [ ] DPA signed and hash recorded

### Kiosk / Touch
- [ ] `ADMIN_PIN` environment variable set (not default)
- [ ] KioskGuardian.exe hash verified (`KioskGuardian.exe.sha256`)
- [ ] Global shortcuts block `Alt+Tab`, `Alt+F4`, `Super+*`, `Escape`
- [ ] LAN-only network isolation active (`setupNetworkIsolation`)
- [ ] PIN brute-force lockout tested (5 attempts → 15 min lockout)

### Post-Deployment
- [ ] Auto-updater points to correct GitHub repo (`clickflash-master` / `clickflash-touch`)
- [ ] `allowPrerelease: false` and `allowDowngrade: false` confirmed
- [ ] Crash recovery tested (3 crashes in 60s → fatal error screen)
- [ ] System tray and graceful shutdown verified
- [ ] Single-instance lock tested (`requestSingleInstanceLock`)

---

*For questions or updates, contact the Security & Desktop Architecture team.*
