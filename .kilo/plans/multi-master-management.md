# ClickFlash Multi-Master Management Architecture

## Overview

Central Management Hub for provisioning and managing multiple ClickFlash Master installations worldwide. Each hotel/resort gets its own Master instance managed from one dashboard.

---

## 🚨 ROADMAP UPDATE: Pack Tunnel + Full 1-Click Install

### User Request
> "Pack tunnel inside Master installation folder with 1 click install - all requirement install and preconfigured"

### Goal
**Zero-configuration 1-click install** that includes:
1. ✅ Master app (Electron)
2. ✅ cloudflared tunnel binary (bundled)
3. ✅ Pre-configured tunnel credentials
4. ✅ Pre-configured .env with all settings
5. ✅ Auto-start cloudflared with Master
6. ✅ Cloudflare DNS auto-configured
7. ✅ Gallery connection auto-configured
8. ✅ MoneyTrash connection auto-configured

---

## ARCHITECTURE: Self-Contained Installation Package

```
ClickFlash-Master-Miami-Resort/
├── cloudflared.exe          # Bundled tunnel binary (Windows)
├── cloudflared              # Bundled tunnel binary (Linux/Mac)
├── clickflash-master.exe    # Electron app
├── pb_data/                 # SQLite database
├── .env                     # Pre-configured (from .env.production)
├── tunnels/                 # Cloudflare tunnel credentials
│   └── credentials.json     # {"tunnel_id": "...", "tunnel_token": "..."}
├── logs/                    # App logs
└── config/
    └── gallery.json         # Gallery API endpoint + key
```

---

## PHASE 1: Bundle cloudflared in Master Package

### 1.1 Download cloudflared During Installation
```typescript
// In install-cli.ts
async function downloadCloudflared(dataDir: string): Promise<string> {
  const platform = process.platform;
  const arch = process.arch === 'x64' ? 'amd64' : 'arm64';
  const ext = platform === 'win32' ? 'zip' : 'tgz';
  const version = '2024.10.0';
  
  const url = `https://github.com/cloudflare/cloudflared/releases/download/${version}/cloudflared-${platform}-${arch}.${ext}`;
  const cfPath = path.join(dataDir, 'cloudflared' + (platform === 'win32' ? '.exe' : ''));
  
  await downloadFile(url, cfPath);
  if (platform !== 'win32') chmodSync(cfPath, 0o755);
  
  return cfPath;
}
```

### 1.2 Generate Tunnel Credentials File
```json
// tunnels/credentials.json
{
  "tunnel_id": "3231c283-0cc2-492f-a01e-4a6871bf6a26",
  "tunnel_token": "eyJi...xxx"
}
```

### 1.3 Create Ingress Rules for Tunnel
```yaml
# cloudflared.yml (in installation folder)
ingress:
  - hostname: miami-resort.master.clicketflash.com
    service: http://localhost:8090
  - hostname: miami-resort.gallery.clicketflash.com
    service: https://clickflash-gallery.pages.dev
  - hostname: miami-resort.management.clicketflash.com
    service: https://clickflash-management.pages.dev
  - service: http_status:404
```

---

## PHASE 2: Pre-Configure .env

### 2.1 Generate .env During Install
```bash
# .env (pre-configured)
NODE_ENV=production
PORT=8090
DATA_DIR=./pb_data

# Cloudflare (from install params)
CLOUDFLARE_API_TOKEN=cfut_xxx
CLOUDFLARE_ACCOUNT_ID=0e00f59...
CLOUDFLARE_ZONE_ID=ee19683b...
CLOUDFLARE_DOMAIN=clicketflash.com

# Tunnel (auto-generated)
TUNNEL_ID=3231c283-0cc2-492f-a01e-4a6871bf6a26
TUNNEL_TOKEN=eyJi...xxx
TUNNEL_NAME=miami-resort
TUNNEL_CREDENTIALS_FILE=./tunnels/credentials.json
CLOUDFLARED_PATH=./cloudflared

# Gallery (auto-configured per location)
GALLERY_URL=https://miami-resort.gallery.clicketflash.com
GALLERY_API_KEY=generated_key_here

# MoneyTrash (auto-configured per location)
MONEYTRASH_URL=https://miami-resort.moneytrash.clicketflash.com
MONEYTRASH_API_KEY=generated_key_here

# Hub (auto-configured)
HUB_URL=https://management.clicketflash.com
HUB_API_KEY=generated_key_here

# Database
DB_FILE=./pb_data/clickflash.db
```

---

## PHASE 3: Auto-Start cloudflared with Master

### 3.1 Master Startup Script
```typescript
// In server.ts or a new tunnelService.ts
async function startTunnel() {
  const cloudflaredPath = process.env.CLOUDFLARED_PATH;
  const credentialsFile = process.env.TUNNEL_CREDENTIALS_FILE;
  const tunnelName = process.env.TUNNEL_NAME;
  
  if (!cloudflaredPath || !credentialsFile) {
    logger.warn('Tunnel not configured');
    return;
  }
  
  const args = [
    'tunnel', 'run',
    '--token', process.env.TUNNEL_TOKEN,
    '--credentials', credentialsFile,
  ];
  
  const tunnelProcess = spawn(cloudflaredPath, args, {
    stdio: 'pipe',
    cwd: process.cwd(),
  });
  
  tunnelProcess.stdout.on('data', (data) => logger.info(`[cloudflared] ${data}`));
  tunnelProcess.stderr.on('data', (data) => logger.error(`[cloudflared] ${data}`));
  
  tunnelProcess.on('close', (code) => {
    logger.error(`cloudflared exited with code ${code}`);
    // Restart after delay
    setTimeout(startTunnel, 5000);
  });
}
```

### 3.2 Ingress Rules by Service Type
```yaml
# Dynamic ingress based on location
ingress:
  - hostname: ${LOCATION_SLUG}.master.${DOMAIN}
    service: http://localhost:8090
  - hostname: ${LOCATION_SLUG}.gallery.${DOMAIN}
    service: https://clickflash-gallery.pages.dev
  - hostname: ${LOCATION_SLUG}.management.${DOMAIN}
    service: https://clickflash-management.pages.dev
  - service: http_status:404
```

---

## PHASE 4: Installation Package Structure

### 4.1 Windows Installer
```
ClickFlash-Master-Setup.exe
├── cloudflared.exe
├── ClickFlash-Master.exe
├── resources/
│   └── app.asar
├── tunnels/
│   └── credentials.json
├── .env
└── uninstall.exe
```

### 4.2 Linux/Mac Package
```
clickflash-master.tar.gz
├── cloudflared
├── clickflash-master
├── tunnels/
│   └── credentials.json
├── .env
└── install.sh
```

---

## PHASE 5: 1-Click Install Command

### Current (Complex)
```bash
npx clickflash-install --location "Miami Resort" --email admin@test.com --password Test123! \
  --cf-token xxx --cf-account xxx --cf-zone xxx --cf-domain clicketflash.com
```

### Future (Simple)
```bash
npx clickflash-install --hotel "Miami Resort"
```

**No other inputs required!** Everything pre-configured from Hub.

---

## Implementation Tasks

### 1. Cloudflared Download & Bundle
- [ ] Update `install-cli.ts` to download cloudflared to installation folder
- [ ] Generate `cloudflared.yml` with dynamic ingress rules
- [ ] Store tunnel credentials in `tunnels/credentials.json`

### 2. Tunnel Service
- [ ] Create `apps/master/backend/services/tunnelService.ts`
- [ ] Auto-start cloudflared on Master startup
- [ ] Auto-restart on crash
- [ ] Log tunnel status

### 3. Pre-Configure .env
- [ ] Generate complete `.env` with all variables
- [ ] Include Gallery API key (from Hub or generate)
- [ ] Include MoneyTrash API key
- [ ] Include Hub API key

### 4. Auto-Register with Hub
- [ ] On first start, Master registers with Hub
- [ ] Receives and stores API keys
- [ ] Heartbeat to stay connected

### 5. Installation Package
- [ ] Create `package.js` for Electron packaging
- [ ] Include cloudflared + credentials in package
- [ ] Create Windows installer (.exe)
- [ ] Create Linux/Mac packages

---

## Files to Modify

| File | Changes |
|------|---------|
| `apps/master/scripts/install-cli.ts` | Bundle cloudflared, generate credentials, create .env |
| `apps/master/backend/services/tunnelService.ts` | NEW - Auto-start/restart tunnel |
| `apps/master/backend/server.ts` | Start tunnel on boot |
| `apps/master/package.json` | Add cloudflared to package |
| `apps/master/electron-main.js` | Tunnel start on app ready |

---

## Verification Checklist

After installation:
- [ ] cloudflared.exe exists in installation folder
- [ ] tunnels/credentials.json exists with valid tunnel_id + token
- [ ] cloudflared.yml exists with correct ingress rules
- [ ] .env has all required variables
- [ ] Master app starts
- [ ] cloudflared auto-starts and connects to tunnel
- [ ] DNS resolves: `miami-resort.master.clicketflash.com` → tunnel → localhost:8090
- [ ] Hub shows node as "online"

### Current State Analysis

**Architecture Flow:**
```
Master (8090) → Gallery Cloud → MoneyTrash
    ↓
1. Photographer shoots photos
2. Creates Order in Master
3. Exports to Gallery (watermarked previews)
4. Customer views Gallery, selects photos
5. MoneyTrash handles payment
6. Order syncs back to Master
```

**Current Audit Gaps:**
| Component | Gap |
|-----------|-----|
| Master | No structured audit for uploads, no correlation IDs |
| Gallery | No auditLogger.logDataAccess() for cloud sync writes |
| MoneyTrash | No user action audit (which desk/office?) |
| End-to-End | No correlation ID flow Master→Gallery→MoneyTrash |

---

## PHASE 1: Master → Gallery Order Upload with Full Audit

### 1.1 Add Correlation IDs
```typescript
// Every upload gets a correlation_id for tracing
interface UploadContext {
  correlationId: string;      // UUID generated at order creation
  locationId: string;         // Hotel/resort ID
  orderId: string;
  albumId: string;
  initiatedBy: 'photographer' | 'auto-sync';
  timestamp: ISO8601;
}
```

### 1.2 Master Audit Events
| Event | When | Data |
|-------|------|------|
| `ORDER_CREATED` | Order created in Master | orderId, albumId, photoCount |
| `ORDER_EXPORT_STARTED` | Export to gallery begins | orderId, correlationId |
| `ORDER_EXPORTED` | Export completed | orderId, galleryOrderId, photoCount |
| `PHOTO_UPLOADED` | Each photo uploaded | photoId, correlationId, size |
| `SYNC_COMPLETE` | Full sync to gallery done | orderId, totalPhotos, duration |

### 1.3 Gallery Audit Events
| Event | When | Data |
|-------|------|------|
| `ORDER_RECEIVED` | Order sync received | correlationId, orderId, sourceMaster |
| `PHOTO_RECEIVED` | Photo upload received | correlationId, photoId |
| `ORDER_ACTIVATED` | Order goes live in gallery | orderId, accessToken |
| `PHOTO_LINKED` | Photo linked to order | orderId, photoId |

---

## PHASE 2: MoneyTrash Upload Integration

### 2.1 MoneyTrash → Gallery Flow
```
MoneyTrash Upload → Gallery Photo Record → Link to Order
     ↓
1. Photographer selects archived photos in MoneyTrash
2. MoneyTrash uploads directly to Gallery R2
3. Gallery creates photo record with reference to order
4. Audit: who uploaded, which desk, which order
```

### 2.2 MoneyTrash Audit Events
| Event | When | Data |
|-------|------|------|
| `UPLOAD_INITIATED` | Chunked upload started | deskId, fileCount, totalSize |
| `CHUNK_RECEIVED` | Each chunk uploaded | uploadId, chunkIndex, bytes |
| `UPLOAD_COMPLETE` | All chunks assembled | uploadId, finalSize, photoId |
| `PHOTO_TO_ORDER` | Photo linked to order | photoId, orderId |

---

## PHASE 3: Auto-Configure Gallery Connection During Master Install

### 3.1 Installation Flow Enhancement
```bash
npx clickflash-install --hotel "Miami Resort"
```

**During install:**
1. Create location slug: `miami-resort`
2. Create per-location Gallery: `miami-resort.gallery.clicketflash.com`
3. Create per-location MoneyTrash: `miami-resort.moneytrash.clicketflash.com`
4. Generate API key for this location
5. Store in Master .env:
   ```
   GALLERY_URL=https://miami-resort.gallery.clicketflash.com
   GALLERY_API_KEY=<generated>
   MONEYTRASH_URL=https://miami-resort.moneytrash.clicketflash.com
   MONEYTRASH_API_KEY=<generated>
   ```
6. Register location with Hub

### 3.2 Auto-Generated Per-Hotel Resources
| Resource | URL Pattern |
|----------|-------------|
| Master Portal | `miami-resort.master.clicketflash.com` |
| Customer Gallery | `miami-resort.gallery.clicketflash.com` |
| MoneyTrash | `miami-resort.moneytrash.clicketflash.com` |
| Management | `miami-resort.management.clicketflash.com` |

---

## PHASE 4: Test Suite (360° Coverage)

### 4.1 Unit Tests
| Test | Component | Coverage |
|------|-----------|----------|
| `correlationId.test.ts` | Master | Generate, propagate, log correlation IDs |
| `auditLogger.test.ts` | Master | All event types logged correctly |
| `uploadValidation.test.ts` | Gallery | File type, size validation |
| `orderSync.test.ts` | Gallery | Order receive → activate flow |
| `moneytrashUpload.test.ts` | MoneyTrash | Chunk assembly, photo creation |

### 4.2 Integration Tests
| Test | Flow |
|------|------|
| `master-gallery-sync.test.ts` | Master creates order → Gallery receives |
| `gallery-moneytrash.test.ts` | MoneyTrash uploads → Gallery photo linked |
| `full-audit-trail.test.ts` | Order created → uploaded → paid → completed |

### 4.3 E2E Tests (Playwright)
| Test | Scenario |
|------|----------|
| `order-lifecycle.spec.ts` | Create order in Master → View in Gallery → Payment → Complete |
| `upload-retry.spec.ts` | Upload fails → Retry → Success |
| `multi-hotel.spec.ts` | Install 2 hotels → Verify isolation |

### 4.4 Production Tests
```bash
# Test against production Cloudflare
npm run test:production -- --hotel "Test Hotel"

# Verify:
# 1. Order created in Master appears in Gallery
# 2. Audit logs contain full correlation chain
# 3. MoneyTrash upload reflects in Gallery
# 4. No data leakage between hotels
```

---

## Implementation Order

### Step 1: Add Correlation IDs (Foundation)
- [ ] Create `CorrelationContext` type
- [ ] Add `correlationId` to order creation
- [ ] Propagate through upload flow
- [ ] Add to all audit log calls

### Step 2: Enhance Master Audit
- [ ] Add `auditLogger.logUploadEvent()`
- [ ] Log all upload phases in `cloudSyncService.ts`
- [ ] Add unit tests for audit events

### Step 3: Enhance Gallery Audit
- [ ] Call `auditLogger.logDataAccess()` in `syncRoutes.js`
- [ ] Log all incoming sync events
- [ ] Add integration tests for audit

### Step 4: Enhance MoneyTrash Audit
- [ ] Add `deskId` context to upload handlers
- [ ] Log all upload phases
- [ ] Add correlation ID for cross-service tracing

### Step 5: Auto-Configure in Install
- [ ] Update `install-cli.ts` to create per-location subdomains
- [ ] Generate API keys per location
- [ ] Store in Master .env automatically
- [ ] Register with Hub

### Step 6: Test Suite
- [ ] Unit tests for all components
- [ ] Integration tests for flows
- [ ] E2E tests for complete lifecycle
- [ ] Production smoke tests

---

## Key Files to Modify

### Master App
- `apps/master/backend/shared/auditLogger.ts` - Add upload event types
- `apps/master/backend/services/cloudSyncService.ts` - Add correlation IDs, audit
- `apps/master/backend/routes/orders.ts` - Add correlation ID on creation
- `apps/master/scripts/install-cli.ts` - Auto-configure gallery connection

### Gallery App
- `apps/gallery/backend/routes/syncRoutes.js` - Add auditLogger calls
- `apps/gallery/backend/shared/auditLogger.js` - Add sync event types
- `apps/gallery/backend/routes/moneyTrashRoutes.js` - Add correlation ID

### MoneyTrash
- `apps/moneytrash/cloudflare/src/handlers/upload/*.ts` - Add deskId, correlationId

### Tests
- `apps/master/src/**/*.test.ts` - New upload audit tests
- `apps/gallery/backend/*.test.js` - New sync tests
- `apps/moneytrash/**/*.test.ts` - New upload tests

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CENTRAL MANAGEMENT HUB (Cloud)                            │
│                         management.clicketflash.com                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Hotel A   │  │   Hotel B    │  │   Hotel C    │  │   Hotel D    │     │
│  │   Miami     │  │   LA Resort  │  │   NYC Club  │  │   Vegas      │     │
│  │  Master     │  │   Master     │  │   Master     │  │   Master     │     │
│  │  Port 8090  │  │   Port 8090  │  │   Port 8090  │  │   Port 8090  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │                  │              │
│         └──────────────────┼──────────────────┼──────────────────┘              │
│                            │                                                        │
│                    ┌───────▼───────┐                                              │
│                    │  Hub API      │◄──── SSE/WebSocket for real-time              │
│                    │  (Cloudflare) │                                              │
│                    └───────────────┘                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │     Cloudflare Tunnel         │
                    │   (All Masters → Hub)         │
                    └───────────────────────────────┘
```

---

## 1-Click Installation Flow

### User Input (Simplified)
```bash
# Just hotel name - everything else auto-generated
npx clickflash-install --hotel "Miami Beach Resort"
```

### Auto-Generated Configuration
| Field | Value |
|-------|-------|
| Location ID | `miami-beach-resort` (slugified) |
| Subdomain | `miami-beach-resort.clicketflash.com` |
| Database | `clickflash_miami_beach_resort` |
| Master Port | 8090 |
| Tunnel Name | `clickflash-miami-beach-resort` |

---

## Hub API Endpoints

### Provisioning
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hub/provision` | POST | Create new hotel Master |
| `/api/hub/nodes` | GET | List all registered Masters |
| `/api/hub/nodes/:id` | GET | Get specific Master status |
| `/api/hub/nodes/:id` | DELETE | Deprovision a Master |
| `/api/hub/nodes/:id/heartbeat` | POST | Master health check |

### Node Communication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hub/sync` | POST | Receive sync data from Masters |
| `/api/hub/orders` | GET | Aggregate orders from all Masters |
| `/api/hub/analytics` | GET | Cross-node analytics |

---

## Provisioning Flow

```
User inputs: "Miami Beach Resort"
                    │
                    ▼
┌─────────────────────────────────────┐
│  1. Generate Location ID            │
│     "miami-beach-resort"            │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  2. Create Cloudflare Resources     │
│     - Tunnel: clickflash-miami...   │
│     - DNS: miami-beach-resort.clic..│
│     - Pages: gallery-miami...       │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  3. Create Master Config             │
│     {                              │
│       "locationId": "miami...",    │
│       "hubUrl": "https://hub...",   │
│       "hubApiKey": "generated..."   │
│     }                              │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  4. Return Installation Package     │
│     - Downloadable Master app       │
│     - Pre-configured .env file      │
│     - 1-click install script       │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  5. Master Registers with Hub       │
│     POST /api/hub/nodes/register    │
└─────────────────────────────────────┘
```

---

## Data Model

### Hub Database (SQLite)
```sql
-- Nodes table (registered Masters)
CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    location_id TEXT UNIQUE NOT NULL,
    location_name TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    version TEXT,
    capabilities JSON,
    status TEXT DEFAULT 'offline', -- online, offline, error
    last_heartbeat DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sync events log
CREATE TABLE sync_events (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(node_id) REFERENCES nodes(id)
);
```

### Master Configuration (generated per hotel)
```json
{
  "locationId": "miami-beach-resort",
  "locationName": "Miami Beach Resort",
  "hubUrl": "https://management.clicketflash.com",
  "hubApiKey": "hkdf_...",
  "cloudflare": {
    "tunnelId": "tunnel_id",
    "tunnelToken": "tunnel_token"
  },
  "database": {
    "name": "clickflash_miami_beach_resort"
  }
}
```

---

## Implementation Tasks

### Phase 1: Hub Enhancement
- [ ] Add provisioning API to Management Hub
- [ ] Create node registration with API key generation
- [ ] Add node heartbeat monitoring
- [ ] Build node management UI dashboard

### Phase 2: Master Auto-Registration
- [ ] Master sends registration on first startup
- [ ] Master sends periodic heartbeats
- [ ] Master receives Hub commands (sync, update)

### Phase 3: Simplified CLI
- [ ] `npx clickflash-install --hotel "Hotel Name"` 
- [ ] Auto-contact Hub for configuration
- [ ] Auto-register after installation

### Phase 4: Multi-Node Features
- [ ] Cross-node order aggregation
- [ ] Unified analytics dashboard
- [ ] Bulk operations (sync all, update all)

---

## Environment Variables (Generated per Hotel)

```bash
# Auto-generated by Hub during provisioning
HUB_URL=https://management.clicketflash.com
HUB_API_KEY=hkdf_generated_key_for_this_node
NODE_ID=miami-beach-resort
NODE_NAME="Miami Beach Resort"
CLOUDFLARE_TUNNEL_ID=tunnel_id
CLOUDFLARE_TUNNEL_TOKEN=tunnel_token
```

---

## Security

### API Key Generation
```typescript
import { hkdf } from './utils/crypto';

function generateNodeApiKey(locationId: string): string {
  const masterKey = process.env.HUB_MASTER_KEY;
  const salt = crypto.randomBytes(16);
  const info = `clickflash-node-${locationId}`;
  
  return hkdf(masterKey, salt, info, 32);
}
```

### Node Authentication
- Each Master has a unique API key
- API keys are HMAC-derived, not stored in plain text
- Heartbeat validates node is still active

---

## Simplified 1-Click Command

```bash
# Future simplified command
npx clickflash-install --hotel "Miami Beach Resort"

# Output:
# ✓ Location ID: miami-beach-resort
# ✓ Provisioning Cloudflare resources...
# ✓ Generating secure configuration...
# ✓ Downloading Master installer...
# 
# Installation package ready!
# 
# Run on hotel server:
# ./clickflash-master-miami-beach-resort.exe --config config.json
#
# Dashboard: https://management.clicketflash.com/nodes/miami-beach-resort
```

---

## Next Steps

1. **Update Hub API** - Add `/api/hub/provision` endpoint
2. **Add Node Model** - SQLite table for nodes
3. **Generate Config** - Auto-generate per-node configuration
4. **Simplify CLI** - Change `--hotel` input to use Hub provisioning
