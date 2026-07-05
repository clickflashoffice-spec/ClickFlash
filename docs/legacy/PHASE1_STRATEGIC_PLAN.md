# ClickFlash Photography Ecosystem — Phase 1: Strategic Vision & Multi-Master 1-Click Architecture Plan

> **Date:** 2026-06-06  
> **Version:** 4.2.0 → 5.0.0  
> **Status:** 🟡 APPROVED — Proceeding to Implementation  
> **Architectural Principle:** *Every Master is a peer. The Cloud is the source of truth for fleet coordination, shared configuration, and cross-studio analytics. Local SQLite is the source of truth for operational data. Sync bridges the two.*

---

## 1. Multi-Master Architecture Verified

### 1.1 Current Implementation (Confirmed in Codebase)

| Component | Evidence | Status |
|-----------|----------|--------|
| **D1 Multi-Tenant Schema** | `desk_id` + `original_id` on albums, photos, orders, users | ✅ Production |
| **Fleet Heartbeats** | `fleet_heartbeats` table, `FleetService.ts` sends metrics every 60s | ✅ Production |
| **Fleet Dashboard** | `FleetDashboard.tsx` shows all kiosks with latency/health | ✅ Production |
| **Vector Clocks** | `sync_sequences` table, LWW conflict resolution | ✅ Production |
| **Desk Registration** | `destinations` table with `licenseKey`, `status`, `last_seen` | ✅ Production |
| **Cross-Desk Analytics** | `ResortAnalyticsService`, consolidated payroll, inventory | ✅ Production |
| **R2 Prefix Isolation** | `uploadHighRes()` and `uploadRetentionAsset()` use desk-scoped paths | ✅ Production |

### 1.2 Data Flow — Multi-Master Global Sync

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLICKFLASH MULTI-MASTER GLOBAL SYNC                         │
│                         (Verified Architecture)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   MASTER STATION A          MASTER STATION B          MASTER STATION N      │
│   (Maldives - MAL01)        (Dubai - DXB01)           (Bali - BALI01)       │
│                                                                              │
│   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐     │
│   │ Local SQLite │          │ Local SQLite │          │ Local SQLite │     │
│   │ • albums     │          │ • albums     │          │ • albums     │     │
│   │ • photos     │          │ • photos     │          │ • photos     │     │
│   │ • orders     │          │ • orders     │          │ • orders     │     │
│   │ • ledger     │          │ • ledger     │          │ • ledger     │     │
│   │ • settings   │          │ • settings   │          │ • settings   │     │
│   └──────┬───────┘          └──────┬───────┘          └──────┬───────┘     │
│          │                         │                         │             │
│          │    Sync Cycle (60s)    │                         │             │
│          │    ─────────────────   │                         │             │
│          │    • operation_logs    │                         │             │
│          │    • syncLedgerEntries │                         │             │
│          │    • syncExpenses      │                         │             │
│          │    • syncInventory     │                         │             │
│          │    • syncOrdersToGallery│                        │             │
│          │    • sendHeartbeat     │                         │             │
│          ▼                         ▼                         ▼             │
│   ╔═══════════════════════════════════════════════════════════════════╗   │
│   ║              CLOUDFLARE MANAGEMENT HUB (Global)                    ║   │
│   ║  ┌─────────────────────────────────────────────────────────────┐  ║   │
│   ║  │  D1 DATABASE (Multi-Tenant)                                    │  ║   │
│   ║  │  ─────────────────────────────────────────────────────────   │  ║   │
│   ║  │  • albums (desk_id=MAL01, original_id=local_uuid)            │  ║   │
│   ║  │  • photos (desk_id=DXB01, original_id=local_uuid)            │  ║   │
│   ║  │  • orders (desk_id=BALI01, original_id=local_uuid)          │  ║   │
│   ║  │  • photographer_ledger (consolidated payroll)                │  ║   │
│   ║  │  • expenses (cross-desk reporting)                          │  ║   │
│   ║  │  • inventory (fleet stock levels)                         │  ║   │
│   ║  │  • destinations (fleet registry: MAL01, DXB01, BALI01)    │  ║   │
│   ║  │  • fleet_heartbeats (last_seen, metrics per desk)           │  ║   │
│   ║  │  • sync_sequences (vector clocks per desk)                │  ║   │
│   ║  │  • settings (global + per-desk overrides)                   │  ║   │
│   ║  └─────────────────────────────────────────────────────────────┘  ║   │
│   ║                                                                   ║   │
│   ║  ┌─────────────────────────────────────────────────────────────┐  ║   │
│   ║  │  R2 STORAGE (Prefix-Isolated)                                │  ║   │
│   ║  │  ─────────────────────────────────────────────────────────   │  ║   │
│   ║  │  • uploads/MAL01/photos/...                                 │  ║   │
│   ║  │  • uploads/DXB01/photos/...                                 │  ║   │
│   ║  │  • uploads/BALI01/retention/...                             │  ║   │
│   ║  │  • uploads/BALI01/fulfillment/...                           │  ║   │
│   ║  └─────────────────────────────────────────────────────────────┘  ║   │
│   ║                                                                   ║   │
│   ║  ┌─────────────────────────────────────────────────────────────┐  ║   │
│   ║  │  SERVICES                                                    │  ║   │
│   ║  │  • applyOperations() — Process incoming sync batch         │  ║   │
│   ║  │  • getRemoteOperations() — Push to requesting master       │  ║   │
│   ║  │  • updateFleetHeartbeat() — Health monitoring              │  ║   │
│   ║  │  • Conflict resolution: Last-Write-Wins + vector clocks    │  ║   │
│   ║  │  • Cross-desk analytics aggregation                        │  ║   │
│   ║  └─────────────────────────────────────────────────────────────┘  ║   │
│   ╚═══════════════════════════════════════════════════════════════════╝   │
│                                    │                                       │
│                                    ▼                                       │
│   ╔═══════════════════════════════════════════════════════════════════╗   │
│   ║              CUSTOMER GALLERY (Cloud)                              ║   │
│   ║  ┌─────────────────────────────────────────────────────────────┐  ║   │
│   ║  │  • Serves photos from ALL desks via R2 prefix routing        │  ║   │
│   ║  │  • Order lookup: `SELECT * FROM orders WHERE desk_id=?`    │  ║   │
│   ║  │  • Customer sees unified gallery (multi-resort albums)     │  ║   │
│   ║  └─────────────────────────────────────────────────────────────┘  ║   │
│   ╚═══════════════════════════════════════════════════════════════════╝   │
│                                    │                                       │
│                                    ▼                                       │
│   ╔═══════════════════════════════════════════════════════════════════╗   │
│   ║              MAIN WEBSITE (Cloudflare Pages)                       ║   │
│   ║  ┌─────────────────────────────────────────────────────────────┐  ║   │
│   ║  │  • Portfolio aggregated from all desks                     │  ║   │
│   ║  │  • Multi-location booking (Maldives, Dubai, Bali...)       │  ║   │
│   ║  │  • Fleet status for public transparency                    │  ║   │
│   ║  └─────────────────────────────────────────────────────────────┘  ║   │
│   ╚═══════════════════════════════════════════════════════════════════╝   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Key Multi-Master Sync Behaviors

| Behavior | Implementation | Location |
|----------|---------------|----------|
| **Desk Identity** | `desk_id` from settings table → env → default `MASTER_01` | `cloudSyncService.ts:184-195` |
| **Original ID Preservation** | Local UUID stored as `original_id`, cloud gets composite key `(desk_id, original_id)` | D1 schema |
| **Conflict Resolution** | Vector clocks per entity; LWW with `updated_at` tiebreaker | `sync_sequences` table |
| **Idempotency** | `X-Idempotency-Key` = `sha256(desk_id + pipeline + seq + timestamp)` | `cloudSyncService.ts` |
| **Heartbeat** | System metrics (CPU, memory, disk, sales) every 60s | `FleetService.ts:64-133` |
| **Settings Sync** | Hub pushes global settings; masters pull hash-based changes | `syncRemoteSettings():335-379` |
| **Cross-Desk Query** | `SELECT ... WHERE desk_id = ?` with indexes | `idx_*_desk_original` |

---

## 2. Updated 1-Click Architecture — Multi-Master Aware

### 2.1 The "New Studio Onboarding" Flow

When a studio owner installs ClickFlash at a **new location** (e.g., opening a Bali studio when Maldives and Dubai already exist):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEW MASTER ONBOARDING (1-Click)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. INSTALLER LAUNCHES                                                       │
│     ├── Detect OS, check Node.js (bundle if missing)                        │
│     ├── Extract app files to Program Files / Applications                   │
│     └── Create data directories                                             │
│                                                                              │
│  2. CLOUDFLARE ACCOUNT LINKING                                               │
│     ├── OAuth 2.0 flow OR API token input                                   │
│     ├── Verify token permissions (D1, R2, Workers, Pages)                   │
│     └── Test connectivity to management.clickflash.app                      │
│                                                                              │
│  3. FLEET REGISTRATION (Multi-Master Critical Step)                          │
│     ├── Generate unique desk_id: MASTER_<LOCATION>_<RANDOM>                   │
│     ├── Check D1 `destinations` table for collisions                        │
│     ├── POST /api/masters/register to Management Hub                      │
│     │   Payload: { desk_id, name, location, hardware_fingerprint }          │
│     ├── Hub returns: { status: 'registered', shared_config, peers[] }       │
│     └── If collision: suggest alternative, or merge with existing           │
│                                                                              │
│  4. SHARED CONFIGURATION PULL                                                │
│     ├── Download global settings (pricing, session types, products)         │
│     ├── Download per-desk overrides (if any)                              │
│     ├── Apply to local SQLite settings table                                │
│     └── Hash-based change detection prevents unnecessary writes             │
│                                                                              │
│  5. R2 BUCKET PREFIX SETUP                                                   │
│     ├── Verify `uploads/{desk_id}/` prefix exists (create if not)           │
│     ├── Test upload/download with 1MB sample file                           │
│     └── Configure lifecycle rules (retention, archive)                        │
│                                                                              │
│  6. STUDIO PROFILE SETUP                                                     │
│     ├── Studio name, location, timezone, currency                           │
│     ├── Photographer accounts (or sync from Hub)                            │
│     ├── Product catalog (or sync from Hub)                                    │
│     └── Session type templates (or sync from Hub)                             │
│                                                                              │
│  7. MASTER↔TOUCH AUTO-PAIRING                                                │
│     ├── mDNS broadcast: `_clickflash._tcp` on port 8090                     │
│     ├── Touch auto-discovers Master, exchanges HMAC secret                  │
│     ├── QR fallback for networks blocking mDNS                                │
│     └── Test sync: Touch pushes test order, Master confirms receipt         │
│                                                                              │
│  8. FIRST-TIME SYNC TEST                                                     │
│     ├── Send heartbeat to Hub → verify `fleet_heartbeats` entry             │
│     ├── Push test operation_log → verify D1 write                           │
│     ├── Pull remote settings → verify read                                  │
│     ├── Upload test photo to R2 → verify `uploads/{desk_id}/` prefix      │
│     └── All green? → Show "Studio Ready" dashboard                          │
│                                                                              │
│  9. FLEET VISIBILITY                                                         │
│     ├── New master appears in Management Hub fleet dashboard                  │
│     ├── Other masters see new peer in their FleetDashboard.tsx                │
│     ├── Cross-desk analytics now include new studio                           │
│     └── Global settings propagate to all desks                                │
│                                                                              │
│  10. LAUNCH                                                                  │
│     ├── Start Master Portal (kiosk mode or windowed)                        │
│     ├── Start Touch Kiosk (if paired)                                         │
│     └── Auto-updater checks for updates                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Desk ID Generation Strategy

| Scenario | Algorithm | Example |
|----------|-----------|---------|
| **Auto-generate** | `MASTER_<CITY>_<RANDOM_HEX(4)>` | `MASTER_MALDIVES_A3F7` |
| **From location** | `MASTER_<COUNTRY>_<CITY>_<SEQ>` | `MASTER_MALDIVES_MALE_01` |
| **From license** | `MASTER_<LICENSE_KEY_PREFIX>` | `MASTER_CF2026BALI` |
| **Custom** | User-defined (validated for uniqueness) | `MASTER_SONEVA_FUSHI` |

**Collision Handling:**
1. Query D1 `destinations` table: `SELECT id FROM destinations WHERE id = ?`
2. If exists: append `-2`, `-3`, etc. or prompt user
3. If 5 collisions: switch to `MASTER_<UUID_PREFIX>`

### 2.3 Shared Configuration Hierarchy

```
┌─────────────────────────────────────────┐
│  GLOBAL SETTINGS (Hub-managed)          │
│  • Default pricing tiers                │
│  • Product catalog (base)               │
│  • Session type templates               │
│  • MoneyTrash retention policy          │
│  • Brand assets (logo, colors)          │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  PER-DESK OVERRIDES (Master-managed)    │
│  • Local pricing adjustments              │
│  • Additional products                    │
│  • Custom session types                   │
│  • Photographer assignments               │
│  • Currency / tax settings                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  LOCAL ONLY (Never synced)                │
│  • Admin PIN                              │
│  • Kiosk passwords                        │
│  • Network settings (IP, firewall)        │
│  • Printer configurations                 │
└─────────────────────────────────────────┘
```

---

## 3. Unified Installer Specification

### 3.1 Installer Architecture

```
ClickFlash-Setup-5.0.0.exe (Windows)
ClickFlash-Setup-5.0.0.dmg (macOS)
ClickFlash-Setup-5.0.0.AppImage (Linux)
│
├── Electron Shell (Setup Wizard UI)
│   ├── React + Vite frontend
│   ├── Step-by-step wizard with progress
│   ├── Cloudflare OAuth integration
│   └── Fleet registration status
│
├── Embedded Node.js Runtime (optional)
│   ├── Windows: node.exe bundled
│   ├── macOS: node binary in Resources/
│   └── Linux: node binary in AppDir/
│
├── Application Payloads
│   ├── master/ (pre-built dist/ + backend/)
│   ├── touch/ (pre-built dist/ + backend/)
│   └── shared/ (models, assets, migrations)
│
├── Post-Install Scripts
│   ├── Firewall configuration
│   ├── Data directory creation
│   ├── Shortcut creation
│   └── Registry / plist entries
│
└── Uninstaller
    ├── Remove app files
    ├── Preserve data (optional)
    └── Revoke Cloudflare tokens
```

### 3.2 Installer Steps (UI Flow)

| Step | Title | Description | Duration |
|------|-------|-------------|----------|
| 1 | Welcome | Branding, version, license | — |
| 2 | Prerequisites | Check Node.js, disk space, ports | 2s |
| 3 | Installation Type | "New Studio" vs "Join Existing Fleet" | — |
| 4 | Cloudflare Account | OAuth or API token | 10-30s |
| 5 | Fleet Registration | Desk ID, location, auto-check collision | 5s |
| 6 | Studio Profile | Name, timezone, currency, branding | — |
| 7 | Shared Config | Pull products, session types from Hub | 5-10s |
| 8 | Touch Kiosk Setup | Auto-pair or manual IP | 10-30s |
| 9 | Health Check | Test sync, R2, heartbeat | 10-20s |
| 10 | Complete | Launch apps, open dashboard | — |

**Total Time Target:** < 3 minutes for new studio, < 1 minute for joining existing fleet.

### 3.3 Silent / Unattended Mode

```bash
# Windows — mass deployment via Intune / SCCM
ClickFlash-Setup-5.0.0.exe /S \
  /DESK_ID=MASTER_BALI_01 \
  /CLOUD_API_TOKEN=cfat_xxx \
  /STUDIO_NAME="Bali Beach Studio" \
  /LOCATION="Bali, Indonesia" \
  /TIMEZONE=Asia/Singapore \
  /CURRENCY=USD \
  /AUTO_PAIR=1 \
  /KIOSK_COUNT=2 \
  /LAUNCH=1

# macOS — MDM deployment
sudo installer -pkg ClickFlash-5.0.0.pkg -target / \
  -apply_choice_changes_xml unattended.xml

# Linux — cloud-init / Ansible
sudo dpkg -i clickflash_5.0.0_amd64.deb
sudo clickflash-configure \
  --desk-id=MASTER_BALI_01 \
  --cloud-token=cfat_xxx \
  --studio-name="Bali Beach Studio" \
  --auto-pair
```

---

## 4. Cloudflare Auto-Provision — Multi-Master Enhanced

### 4.1 Resource Provisioning Matrix

| Resource | Per-Desk? | Global? | Provisioning Method |
|----------|-----------|---------|---------------------|
| D1 Database | — | ✅ One global | Create once, all desks share |
| D1 Tables | — | ✅ Global schema | Migrations run once |
| R2 Bucket | — | ✅ One global | `uploads/` prefix per desk |
| KV Namespace | — | ✅ One global | Session tokens, rate limits |
| Gallery Worker | — | ✅ One global | Serves all desks |
| Management Worker | — | ✅ One global | Aggregates all desks |
| MoneyTrash Worker | — | ✅ One global | Processes all desks |
| Website Pages | — | ✅ One global | Static marketing site |
| DNS Records | — | ✅ One global | `*.clickflash.app` |

### 4.2 New Master Registration API

**Endpoint:** `POST /api/masters/register`

```typescript
interface MasterRegistrationRequest {
  desk_id: string;           // e.g., "MASTER_BALI_01"
  name: string;              // "Bali Beach Studio"
  location: string;          // "Bali, Indonesia"
  country: string;           // "ID"
  timezone: string;          // "Asia/Singapore"
  currency: string;          // "USD"
  hardware_fingerprint: string; // sha256(machine UUID + MAC)
  version: string;           // "5.0.0"
  public_key?: string;       // For end-to-end encryption (future)
}

interface MasterRegistrationResponse {
  status: 'registered' | 'collision' | 'merged';
  desk_id: string;           // Confirmed desk_id
  shared_config: {
    products: Product[];
    session_types: SessionType[];
    pricing_tiers: PricingTier[];
    global_settings: Record<string, string>;
  };
  peers: Array<{
    desk_id: string;
    name: string;
    location: string;
    status: 'Online' | 'Offline';
    last_seen: string;
  }>;
  r2_prefix: string;         // "uploads/MASTER_BALI_01/"
  sync_endpoint: string;       // "https://management.clickflash.app/api/cloud/sync"
  gallery_endpoint: string;  // "https://gallery.clickflash.app"
  jwt_token: string;           // RS256 signed, desk_id claim
}
```

### 4.3 Token Encryption at Rest

| Layer | Method | Key Source |
|-------|--------|------------|
| **Electron `safeStorage`** | AES-256-GCM | OS keychain (Windows DPAPI, macOS Keychain, Linux Secret Service) |
| **SQLite Settings** | Encrypted with `better-sqlite3-multiple-ciphers` | Key derived from `safeStorage` |
| **Environment Variables** | Not stored in `.env` after setup | Only used during initial bootstrap |
| **Backup** | Encrypted with master password | Prompted on first backup |

---

## 5. Master↔Touch Auto-Pairing — Multi-Master Context

### 5.1 Pairing in a Multi-Master Studio

In a large studio with **multiple Master stations** (e.g., 3 reception desks at a resort):

```
┌─────────────────────────────────────────┐
│  STUDIO: Maldives Soneva Fushi          │
│                                         │
│  Master A (Reception 1) ──┐            │
│  Master B (Reception 2) ──┼── All sync │
│  Master C (Pool Bar) ─────┘   to same  │
│                               Hub        │
│         │                               │
│         │ mDNS / QR                     │
│         ▼                               │
│  Touch Kiosk 1 (Lobby)                │
│  Touch Kiosk 2 (Pool)                 │
│  Touch Kiosk 3 (Spa)                  │
│                                         │
│  Rule: Touch pairs to NEAREST Master   │
│  (lowest latency, same subnet)         │
└─────────────────────────────────────────┘
```

### 5.2 Pairing Protocol

```typescript
interface PairingDiscovery {
  step: 'discover' | 'select' | 'authenticate' | 'confirm';
  masters: Array<{
    desk_id: string;
    ip: string;
    port: number;
    latency_ms: number;
    load: number;        // Current order queue depth
    version: string;
  }>;
  selected_master?: string;
  hmac_secret?: string;  // 32-byte random, exchanged over HTTPS
  pairing_token?: string; // One-time, expires in 5 minutes
}
```

**Algorithm:**
1. Touch broadcasts mDNS query `_clickflash._tcp`
2. All Masters on LAN respond with `desk_id`, `ip`, `latency`
3. Touch ranks by: `latency < 50ms` → `load < 10` → `version match`
4. Touch auto-selects best Master, or user manually selects
5. Exchange HMAC secret over HTTPS (if TLS enabled) or HTTP + PIN
6. Store secret in both DBs, mark kiosk as `Paired`
7. Test sync: Touch pushes test order, Master confirms

---

## 6. Performance & Scale Targets

### 6.1 Multi-Master Scale Targets

| Metric | Target | Current |
|--------|--------|---------|
| Masters per fleet | 100+ | ~5 (tested) |
| Photos per master / day | 10,000 | ~1,000 |
| Sync latency (LAN) | < 1s | ~500ms |
| Sync latency (Cloud) | < 5s | ~2-3s |
| Heartbeat interval | 60s | 60s ✅ |
| Fleet dashboard refresh | 30s | 30s ✅ |
| R2 upload throughput | 100 MB/s | ~50 MB/s |
| D1 query latency (p99) | < 200ms | ~100ms |

### 6.2 Resource Budget per Master

| Resource | Budget | Actual |
|----------|--------|--------|
| CPU (idle) | < 5% | ~3% |
| Memory (idle) | < 500 MB | ~350 MB |
| Disk (app) | < 200 MB | ~125 MB |
| Disk (data / year) | < 500 GB | ~200 GB |
| Network (sync) | < 1 MB/min | ~500 KB/min |

---

## 7. Security & Compliance — Multi-Master

### 7.1 Cross-Desk Data Isolation

| Layer | Isolation Method |
|-------|-----------------|
| **D1 Queries** | `WHERE desk_id = ?` on every query |
| **R2 Objects** | Prefix: `uploads/{desk_id}/photos/{album_id}/{photo_id}` |
| **JWT Claims** | `desk_id` in token payload, verified on every request |
| **API Routes** | Middleware rejects requests with mismatched `desk_id` |
| **Analytics** | Aggregation only with explicit `desk_id IN (...)` |

### 7.2 GDPR Compliance — Multi-Master

| Requirement | Implementation |
|-------------|---------------|
| **Consent per photo** | `photos.consent_status` column: `pending`, `granted`, `withdrawn` |
| **Right to erasure** | Cascade delete: Master → Hub → R2 (async, 24h SLA) |
| **Data portability** | Export all customer photos + orders as ZIP via Gallery |
| **Breach notification** | Fleet-wide alert if any desk detects unauthorized access |
| **Retention policy** | Auto-purge after configured days (per-desk override possible) |
| **Audit log** | Every access logged with `desk_id`, `user_id`, `timestamp`, `action` |

---

## 8. CI/CD Pipeline — Multi-Master Build Matrix

### 8.1 Automated Desktop Build Pipeline

```yaml
# .github/workflows/build-desktop.yml
name: Build Desktop Installers

on:
  push:
    tags: ['v*']

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10.28.2 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter ./apps/master run build
      - run: pnpm --filter ./apps/master run build:backend
      - run: pnpm --filter ./apps/touch run build
      - run: pnpm --filter ./apps/touch run build:backend
      - name: Build Master Installer
        run: pnpm exec electron-builder build --win --x64 --config=apps/master/electron-builder.yml
      - name: Build Touch Installer
        run: pnpm exec electron-builder build --win --x64 --config=apps/touch/electron-builder.json
      - name: Sign Installers
        uses: azure/trusted-signing-action@v1
        with:
          endpoint: ${{ secrets.AZURE_TRUSTED_SIGNING_ENDPOINT }}
          code-signing-account-name: ${{ secrets.AZURE_CODE_SIGNING_NAME }}
          certificate-profile-name: ${{ secrets.AZURE_CERTIFICATE_PROFILE }}
      - name: Upload to Releases
        uses: softprops/action-gh-release@v2
        with:
          files: |
            apps/master/release/ClickFlash-Master-Setup-*.exe
            apps/touch/release/ClickFlash-Touch-Setup-*.exe

  build-macos:
    runs-on: macos-latest
    steps:
      # Similar flow for .dmg + .pkg
      # Notarize with Apple Developer ID
      # Staple ticket

  build-linux:
    runs-on: ubuntu-latest
    steps:
      # Build .AppImage, .deb, .rpm
      # Upload to GitHub Releases + APT repository
```

### 8.2 Cloudflare Deploy — Multi-Master Aware

```yaml
# .github/workflows/deploy-cloud.yml
name: Deploy Cloud Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy-management:
    runs-on: ubuntu-latest
    steps:
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/management/backend
          command: deploy
      - name: Run D1 Migrations
        run: wrangler d1 migrations apply clickflash-hub-db --environment=production

  deploy-gallery:
    runs-on: ubuntu-latest
    steps:
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/gallery/backend
          command: deploy

  deploy-moneytrash:
    runs-on: ubuntu-latest
    steps:
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: apps/moneytrash/cloudflare
          command: deploy

  deploy-website:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter ./apps/website run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: apps/website
          command: pages deploy
```

---

## 9. Future Roadmap (Post-5.0)

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | **AI Photo Tagging** — Auto-tag photos with scene, emotion, quality | 2 weeks | High |
| 2 | **Cross-Studio Analytics** — Compare performance across all desks | 1 week | High |
| 3 | **Mobile Companion App** — iOS/Android for photographers | 4 weeks | High |
| 4 | **Real-Time Fleet Map** — World map showing all studios online | 3 days | Medium |
| 5 | **Automated Pricing** — Dynamic pricing based on demand per desk | 1 week | Medium |
| 6 | **Customer Loyalty Program** — Cross-studio rewards | 2 weeks | Medium |
| 7 | **Video Support** — Short-form video clips alongside photos | 3 weeks | High |
| 8 | **Blockchain Provenance** — NFT-style ownership certificates | 4 weeks | Low |
| 9 | **Voice Ordering** — "Order all photos from album 5" | 2 weeks | Medium |
| 10 | **Predictive Maintenance** — Alert before hardware failure | 2 weeks | Medium |
| 11 | **White-Label Branding** — Per-desk custom domains, themes | 1 week | Medium |
| 12 | **Multi-Currency Checkout** — Local currency per desk | 3 days | High |
| 13 | **Integration Hub** — Zapier, Make.com, Salesforce connectors | 2 weeks | Medium |
| 14 | **AR Preview** — See framed photos on wall via camera | 3 weeks | Low |
| 15 | **Disaster Recovery** — Automated backup to second Cloudflare account | 1 week | High |

---

## 10. Approval Gate — CLOSED

**Status:** ✅ **APPROVED — Proceeding to Phase 2 Implementation**

**Approved Scope:**
- [x] Multi-master aware 1-click installer (Windows first, macOS/Linux parallel)
- [x] Cloudflare auto-provision with fleet registration
- [x] Master↔Touch auto-pairing with mDNS + QR
- [x] Shared configuration pull from Management Hub
- [x] Token encryption with OS keychain
- [x] Silent/unattended deployment mode
- [x] GDPR compliance module
- [x] Cross-platform CI/CD build pipeline
- [x] Comprehensive documentation suite

**Implementation Order:**
1. Phase 2A: Foundation (installer shell, pnpm cleanup, build pipeline)
2. Phase 2B: Cloudflare Auto-Provision (multi-master registration, OAuth, encryption)
3. Phase 2C: Auto-Pairing (mDNS, QR, HMAC exchange)
4. Phase 2D: Hardening (GDPR, SQLite encryption, health checks)
5. Phase 3: Testing (E2E, multi-master sync, failure recovery)
6. Phase 4: Documentation & Release

---

*End of Phase 1 Strategic Plan*
*Next: Phase 2A — Foundation & Unified Installer Implementation*
