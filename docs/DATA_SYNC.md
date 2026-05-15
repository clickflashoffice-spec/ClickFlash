# Data Sync & Offline Mechanism

## Overview

ClickFlash uses a hub-and-spoke sync model: the **Master** is the source of truth for each hotel, syncing upward to the **cloud** (CF Workers + D1 + R2) and downward to **Touch kiosks** over LAN.

```
Cloud (D1 + R2)
      ^
      | HMAC-signed HTTPS
      |
  [ Master ]  <-- Source of truth (SQLite)
   /       \
  /   LAN   \
Touch-1   Touch-2   ...  (stateless kiosks)
```

---

## 1. Master-to-Cloud Sync

**Service**: `apps/master/src/services/cloudSyncService.ts` (frontend) + `apps/master/backend/services/cloudSyncService.ts` (backend)

### How it works

1. `CloudSyncService` is a singleton initialized on master startup
2. Adaptive sync interval adjusts based on network quality:
   - Good network: sync every 30 seconds
   - Fair network: sync every 2 minutes
   - Poor network: pause and retry
3. Changes are queued in a `syncQueue` (Set of collection names)
4. Each sync cycle pushes changed records to the cloud API

### HMAC Authentication

All cloud sync requests are signed with HMAC-SHA256:
- Master generates a signature from the request body + timestamp
- Cloud Worker verifies the signature before accepting data
- Prevents unauthorized data injection from rogue clients

### Sync queue management

```
GET  /api/cloud/status       -- Current sync state and queue depth
GET  /api/cloud/stats        -- Detailed sync metrics
POST /api/cloud/queue/pause  -- Pause sync (e.g., during maintenance)
POST /api/cloud/queue/resume -- Resume sync
POST /api/cloud/queue/purge  -- Clear the queue (data loss risk)
```

---

## 2. Touch-to-Master LAN Sync

**Service**: `apps/touch/src/services/pb.ts` + `apps/touch/backend/routes/`

### How it works

1. Touch kiosk discovers the master via configured IP (set during pairing)
2. All data fetches go directly to `http://<master-ip>:8090/api/...`
3. Touch never writes to its own database -- all mutations go through master API
4. Photo thumbnails are cached locally in Dexie (IndexedDB) for offline browsing

### Kiosk pairing protocol

1. Admin generates a pairing code on master (Settings > Kiosks)
2. Kiosk operator enters the master IP + pairing code
3. HMAC handshake establishes trust
4. Kiosk receives a JWT for subsequent API calls

---

## 3. Offline Support

### Touch kiosk offline mode

- **Dexie** (IndexedDB wrapper) caches photo thumbnails and album metadata
- Guests can browse previously loaded photos without network
- New photo loads require master connectivity
- Payment processing requires network (Stripe)

### Master offline mode

- Master operates fully offline with local SQLite
- Cloud sync queue accumulates changes while offline
- When connectivity returns, queued changes sync automatically
- No data loss -- SQLite is the canonical store

---

## 4. Photo Sync Protocol (Master to R2)

1. Camera photos are imported to master's local filesystem
2. Master's photo worker processes images (resize, watermark, face detection)
3. Processed photos are queued for R2 upload via `CloudSyncService`
4. Upload includes: original, thumbnail, and watermarked variants
5. R2 object keys follow: `{hotelId}/{albumId}/{photoId}/{variant}.{ext}`
6. Gallery CF Worker serves photos directly from R2 with signed URLs

---

## 5. D1 Database Sync

Master pushes structured data (albums, orders, clients, settings) to D1:

| Collection | Sync direction | Frequency |
|------------|---------------|-----------|
| Albums | Master -> D1 | On change |
| Photos metadata | Master -> D1 | On change |
| Orders | Master -> D1 | On change |
| Clients | Master -> D1 | On change |
| Settings | Master -> D1 | On change |
| Analytics | Master -> D1 | Hourly batch |

D1 data is read-only from the gallery and management Workers' perspective. All writes originate from master.

---

## 6. Conflict Resolution

Since master is the single source of truth, conflicts are resolved by **last-write-wins from master**:

- If cloud data diverges (manual D1 edit), master's next sync overwrites it
- Touch kiosks never write data, so no client-side conflicts occur
- Multi-master scenarios (multiple hotels) use hotel-scoped data -- each master owns its own namespace

---

## 7. Monitoring Sync Health

| Metric | Endpoint | Healthy threshold |
|--------|----------|-------------------|
| Queue depth | `GET /api/cloud/stats` | < 50 items |
| Last sync time | `GET /api/cloud/status` | < 5 minutes ago |
| Sync errors | `GET /api/cloud/stats` | 0 in last hour |
| Network quality | `GET /api/system/network` | "good" or "fair" |
