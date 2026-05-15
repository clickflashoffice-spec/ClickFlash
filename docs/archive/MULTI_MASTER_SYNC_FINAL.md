# Multi-Master Cloud Sync Architecture (Final)

## Overview

This document describes the finalized multi-master synchronization architecture for the ClickFlash photography platform, enabling multiple Master Stations (on-site) to synchronize data with a centralized Management Hub (cloud).

---

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLICKFLASH ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐        ┌─────────────────────┐                     │
│  │   MASTER STATION 1  │        │   MASTER STATION 2  │      ... N stations │
│  │   (Resort/Hotel)    │        │   (Resort/Hotel)    │                     │
│  │                     │        │                     │                     │
│  │  ┌───────────────┐  │        │  ┌───────────────┐  │                     │
│  │  │  SQLite DB    │  │        │  │  SQLite DB    │  │                     │
│  │  │  (Local)      │  │        │  │  (Local)      │  │                     │
│  │  └───────┬───────┘  │        │  └───────┬───────┘  │                     │
│  │          │          │        │          │          │                     │
│  │  ┌───────▼───────┐  │        │  ┌───────▼───────┐  │                     │
│  │  │ CloudSyncSvc  │  │        │  │ CloudSyncSvc  │  │                     │
│  │  └───────┬───────┘  │        │  └───────┬───────┘  │                     │
│  └──────────┼──────────┘        └──────────┼──────────┘                     │
│             │                              │                                │
│             └──────────────┬───────────────┘                                │
│                            │                                                │
│                            ▼ HTTPS/WSS                                       │
│              ┌─────────────────────────────┐                                │
│              │    CLOUDFLARE WORKERS       │                                │
│              │    (Management Hub)         │                                │
│              │                             │                                │
│              │  ┌─────────────────────┐    │                                │
│              │  │  D1 Database        │    │                                │
│              │  │  (Aggregated Data)  │    │                                │
│              │  └─────────────────────┘    │                                │
│              │                             │                                │
│              │  ┌─────────────────────┐    │                                │
│              │  │  R2 Storage         │    │                                │
│              │  │  (Photo Files)      │    │                                │
│              │  └─────────────────────┘    │                                │
│              └─────────────────────────────┘                                │
│                            │                                                │
│                            ▼                                                │
│              ┌─────────────────────────────┐                                │
│              │   MANAGEMENT PORTAL UI      │                                │
│              │   (React + Vite)            │                                │
│              │                             │                                │
│              │  - Fleet Monitor            │                                │
│              │  - Payroll Dashboard        │                                │
│              │  - Analytics                │                                │
│              │  - Multi-Desk Reports       │                                │
│              └─────────────────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sync Mechanisms

### 1. Operation-Based Sync (Primary)

**Purpose**: Real-time data synchronization for core business entities

**Tables**: `users`, `albums`, `photos`, `orders`, `products`, `kiosks`, `destinations`, `settings`, `session_types`, `packs`, `bookings`, `daily_objectives`

**How it works**:
1. Local mutation → Write to `operation_logs` table (status='pending')
2. Every 60s → `syncOperationLogs()` batches pending operations
3. POST to `/api/cloud/sync/operations`
4. Hub applies operations → Updates `sync_sequences`
5. Local operations marked 'synced'

**Conflict Resolution**: Last-Write-Wins (LWW) with vector clocks

### 2. Ledger Sync (Payroll)

**Purpose**: Photographer compensation tracking

**Table**: `photographer_ledger`

**How it works**:
1. Order completion → `LedgerService.recordOrderCommission()`
2. Entry created with `sync_status='pending'`
3. `syncLedgerEntries()` converts to operations
4. Synced to Hub for consolidated payroll

### 3. Expenses Sync (NEW)

**Purpose**: Business expense tracking across all sites

**Table**: `expenses`

**Implementation**:
```typescript
// Master: cloudSyncService.syncExpenses()
// Fetches pending expenses → Converts to operations → POST to Hub
```

**API Endpoints**:
- `POST /api/cloud/sync/expenses` - Manual trigger
- `GET /api/cloud/stats/expenses` - Sync stats

### 4. Inventory Sync (NEW)

**Purpose**: Consumables tracking (ribbon, paper, etc.)

**Table**: `inventory`

**Implementation**:
```typescript
// Master: cloudSyncService.syncInventory()
// Fetches pending inventory updates → Syncs to Hub
```

**API Endpoints**:
- `POST /api/cloud/sync/inventory` - Manual trigger
- `GET /api/cloud/stats/inventory` - Sync stats + low stock alerts

### 5. Fleet Heartbeat (NEW)

**Purpose**: Health monitoring for all Master stations

**Implementation**:
```typescript
// Master: cloudSyncService.sendHeartbeat()
// Reports: version, uptime, orders_today, photos_today, sync_status
```

**API Endpoints**:
- `POST /api/cloud/heartbeat` - Receive heartbeat
- `GET /api/cloud/fleet` - Get fleet status

---

## Data Isolation Model

### Multi-Desk Architecture

Each Master station identified by `desk_id` (e.g., "MASTER_01", "HOTEL_MALDIVES_A")

**Hub Table Schema**:
```sql
-- All synced tables have:
desk_id TEXT,      -- Source Master station
original_id TEXT   -- Original ID from source (for idempotency)
```

**Example Query** (Orders from specific Master):
```sql
SELECT * FROM orders 
WHERE desk_id = 'MASTER_01' 
  AND date >= '2026-02-01'
```

**Aggregated Query** (All orders across fleet):
```sql
SELECT desk_id, COUNT(*) as order_count, SUM(total) as revenue
FROM orders 
WHERE date >= '2026-02-01'
GROUP BY desk_id
```

---

## Sync Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     SYNC CYCLE (Every 60s)                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Master Station                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Promise.allSettled([                                    │  │
│  │    syncOperationLogs(),      -- Core data               │  │
│  │    syncLedgerEntries(),      -- Payroll                 │  │
│  │    syncExpenses(),           -- Business expenses       │  │
│  │    syncInventory(),          -- Stock levels            │  │
│  │    sendHeartbeat(),          -- Health metrics          │  │
│  │    pullRemoteOperations(),   -- Bi-directional          │  │
│  │    syncRetentionStats()      -- Archive compliance      │  │
│  │  ])                                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ POST /api/cloud/sync/operations
┌─────────────────────────────────────────────────────────────────┐
│  Management Hub (Cloudflare)                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  recordService.applyOperations(deskId, operations)       │  │
│  │                                                          │  │
│  │  For each operation:                                     │  │
│  │    1. Idempotency check (original_id)                   │  │
│  │    2. Inject desk_id into payload                       │  │
│  │    3. UPSERT into target table                          │  │
│  │    4. Update sync_sequences                             │  │
│  │    5. Log to operation_logs (Hub history)               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ Response: { processed: [...] }
┌─────────────────────────────────────────────────────────────────┐
│  Master Station                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Mark local records as 'synced'                          │  │
│  │  Update lastSuccessfulSync timestamp                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Master Station APIs

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/cloud/status` | GET | Cloud service status | No |
| `/api/cloud/stats` | GET | General sync stats | JWT |
| `/api/cloud/stats/payroll` | GET | Payroll sync stats | JWT |
| `/api/cloud/stats/expenses` | GET | Expenses sync stats | JWT |
| `/api/cloud/stats/inventory` | GET | Inventory sync stats | JWT |
| `/api/cloud/sync` | POST | Trigger full sync | JWT |
| `/api/cloud/sync/payroll` | POST | Trigger payroll sync | JWT |
| `/api/cloud/sync/expenses` | POST | Trigger expenses sync | JWT |
| `/api/cloud/sync/inventory` | POST | Trigger inventory sync | JWT |
| `/api/cloud/heartbeat` | POST | Send heartbeat | JWT |
| `/api/cloud/queue/pause` | POST | Pause sync | JWT |
| `/api/cloud/queue/resume` | POST | Resume sync | JWT |
| `/api/cloud/queue/purge` | POST | Clear queues | JWT |

### Management Hub APIs

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/health` | GET | Service health | No |
| `/api/auth/login` | POST | Authenticate | No |
| `/api/collections/:name/records` | GET | Query collection | JWT |
| `/api/collections/:name/records` | POST | Create record | JWT |
| `/api/collections/:name/records/:id` | PATCH | Update record | JWT |
| `/api/collections/:name/records/:id` | DELETE | Delete record | JWT |
| `/api/cloud/sync/operations` | POST | Receive operations | JWT + desk_id |
| `/api/cloud/sync/operations` | GET | Pull remote operations | JWT + desk_id |
| `/api/cloud/heartbeat` | POST | Receive heartbeat | JWT + desk_id |
| `/api/cloud/fleet` | GET | Get fleet status | JWT |
| `/api/analytics/dashboard` | GET | Dashboard stats | JWT |

---

## Database Schema (Sync-Enabled Tables)

### Master Station (SQLite)

```sql
-- Core tables with operation_logs sync
CREATE TABLE users (...);
CREATE TABLE albums (...);
CREATE TABLE photos (...);
CREATE TABLE orders (...);
-- etc.

-- Tables with sync_status column
CREATE TABLE photographer_ledger (
    id TEXT PRIMARY KEY,
    photographer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    sync_status TEXT DEFAULT 'pending',  -- 'pending', 'synced'
    sync_id TEXT,
    ...
);

CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    sync_status TEXT DEFAULT 'pending',
    sync_id TEXT,
    desk_id TEXT,
    ...
);

CREATE TABLE inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    current_count INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'pending',
    sync_id TEXT,
    desk_id TEXT,
    ...
);

-- Sync infrastructure
CREATE TABLE operation_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,           -- INSERT, UPDATE, DELETE
    table_name TEXT,
    record_id TEXT,
    payload TEXT,                 -- JSON
    status TEXT DEFAULT 'pending',
    sequence_number INTEGER,
    desk_id TEXT,
    ...
);

CREATE TABLE sync_sequences (
    id TEXT PRIMARY KEY,
    site_id TEXT UNIQUE,
    counter INTEGER DEFAULT 0,
    ...
);
```

### Management Hub (D1)

```sql
-- All tables have desk_id + original_id for multi-tenancy
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    desk_id TEXT,              -- Source Master
    original_id TEXT,          -- Original ID from Master
    ...
);

CREATE TABLE photographer_ledger (
    id TEXT PRIMARY KEY,
    desk_id TEXT,
    original_id TEXT,
    photographer_id INTEGER,
    amount REAL,
    type TEXT,
    ...
);

-- Fleet management
CREATE TABLE destinations (
    id TEXT PRIMARY KEY,       -- desk_id
    name TEXT,
    site_code TEXT,
    type TEXT,                 -- 'Master', 'Gallery'
    status TEXT,               -- 'Online', 'Offline'
    last_seen DATETIME,
    version TEXT,
    health_metrics JSON,
    ...
);

CREATE TABLE fleet_heartbeat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    desk_id TEXT NOT NULL,
    timestamp TEXT,
    orders_today INTEGER,
    photos_today INTEGER,
    pending_sync INTEGER,
    sync_status TEXT,
    ...
);

-- Conflict tracking
CREATE TABLE sync_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    existing_desk_id TEXT NOT NULL,
    incoming_desk_id TEXT NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved INTEGER DEFAULT 0
);
```

---

## Security Model

### Authentication
- **Master → Hub**: JWT tokens obtained via `/api/auth/login`
- **Token Expiry**: 24 hours
- **Refresh**: Automatic via token refresh middleware

### Authorization
- **desk_id Isolation**: Hub enforces data isolation at query level
- **Role-Based Access**: Users, Admins, System roles
- **Hardware Fingerprinting**: Master stations can be locked to specific hardware

### Data Protection
- **HTTPS/TLS**: All traffic encrypted
- **Payload Validation**: Zod schemas validate all inputs
- **SQL Injection Prevention**: Parameterized queries only
- **Rate Limiting**: 100 requests/minute per IP

---

## Monitoring & Observability

### Master Station Metrics
```typescript
interface MasterMetrics {
    // Sync status
    pendingOperations: number;
    lastSuccessfulSync: string;
    syncStatus: 'idle' | 'syncing' | 'paused' | 'error';
    
    // Payroll
    pendingLedger: number;
    syncedLedger: number;
    
    // Expenses
    pendingExpenses: number;
    syncedExpenses: number;
    
    // Inventory
    pendingInventory: number;
    lowStockItems: number[];
    
    // Business
    ordersToday: number;
    photosToday: number;
    revenueToday: number;
}
```

### Fleet Dashboard (Hub)
```typescript
interface FleetDashboard {
    totalStations: number;
    onlineStations: number;
    offlineStations: number;
    
    fleetMetrics: {
        totalOrdersToday: number;
        totalPhotosToday: number;
        totalRevenueToday: number;
        avgSyncLatency: number;
    };
    
    stations: Array<{
        desk_id: string;
        status: 'Online' | 'Offline';
        last_seen: string;
        version: string;
        orders_today: number;
        photos_today: number;
        pending_sync: number;
    }>;
}
```

---

## Conflict Resolution

### Conflict Types
1. **Simultaneous Edits**: Same record modified on multiple masters
2. **Offline-Online**: Changes made while disconnected
3. **Schema Drift**: Different versions have different fields

### Resolution Strategy
```typescript
enum ConflictStrategy {
    LAST_WRITE_WINS = 'lww',   // Default (timestamp-based)
    HUB_WINS = 'hub',          // Hub version preferred
    MASTER_WINS = 'master',    // Master version preferred
    MANUAL = 'manual'          // Admin intervention required
}
```

### Conflict Detection
```sql
-- Hub detects conflicts during applyOperations
INSERT INTO sync_conflicts (
    table_name, 
    record_id, 
    existing_desk_id, 
    incoming_desk_id
) VALUES (?, ?, ?, ?);
```

---

## Error Handling & Retries

### Retry Policy
```typescript
const RETRY_CONFIG = {
    maxRetries: 5,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
    maxDelayMs: 30000
};
```

### Error Categories
1. **Network Errors**: Retry with exponential backoff
2. **Auth Errors**: Refresh token, then retry
3. **Validation Errors**: Log and skip (data issue)
4. **Conflict Errors**: Queue for manual resolution

### Dead Letter Queue
Failed operations after max retries are stored in:
```sql
CREATE TABLE sync_dead_letter (
    id TEXT PRIMARY KEY,
    operation JSON,
    error_message TEXT,
    retry_count INTEGER,
    created_at DATETIME
);
```

---

## Deployment Checklist

### Master Station
- [ ] Configure `cloud_url`, `cloud_email`, `cloud_password`
- [ ] Set unique `desk_id`
- [ ] Run migration 052 (sync columns)
- [ ] Test sync: `POST /api/cloud/sync`
- [ ] Verify heartbeat: `POST /api/cloud/heartbeat`

### Management Hub
- [ ] Deploy Cloudflare Worker
- [ ] Run D1 migrations (schema.sql)
- [ ] Configure JWT_SECRET
- [ ] Test operation endpoint: `POST /api/cloud/sync/operations`
- [ ] Verify fleet endpoint: `GET /api/cloud/fleet`

### Post-Deployment
- [ ] Monitor sync lag (should be < 60s)
- [ ] Check conflict rate (should be < 1%)
- [ ] Verify data isolation (desk_id filtering)
- [ ] Test failover (offline → online transition)

---

## Future Enhancements

### Phase 2 (Next Month)
- [ ] **Real-time Sync**: WebSocket for critical updates
- [ ] **Delta Sync**: Only changed fields
- [ ] **Compression**: Gzip for large batches
- [ ] **Offline Queue**: SQLite-based pending queue

### Phase 3 (Next Quarter)
- [ ] **Conflict Resolution UI**: Admin panel for manual resolution
- [ ] **Sync Analytics**: Detailed metrics and alerting
- [ ] **Bi-directional Config**: Hub pushes settings to Masters
- [ ] **Multi-Region**: Regional hubs for latency

---

## Appendix A: Troubleshooting

### Symptom: Sync not working
**Check**:
1. Master logs: `[CloudSync] Auth Error`
2. Hub logs: `Worker Error`
3. Network: `curl -X POST $CLOUD_URL/api/health`

### Symptom: Data not appearing in Hub
**Check**:
1. Master: `GET /api/cloud/stats` (pending count)
2. Hub: `SELECT COUNT(*) FROM orders WHERE desk_id = 'MASTER_X'`
3. Check operation_logs: `SELECT * FROM operation_logs WHERE status = 'failed'`

### Symptom: Fleet shows offline
**Check**:
1. Master: `POST /api/cloud/heartbeat` response
2. Hub: `SELECT last_seen FROM destinations WHERE id = 'MASTER_X'`
3. Time drift between Master and Hub

---

## Appendix B: Migration Guide

### Adding New Sync Table

1. **Add to Master**:
```sql
ALTER TABLE new_table ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE new_table ADD COLUMN sync_id TEXT;
```

2. **Add sync method**:
```typescript
// cloudSyncService.ts
public async syncNewTable() {
    // Similar to syncExpenses()
}
```

3. **Add to Hub config**:
```typescript
// config.ts
TABLE_MAP['new_table'] = 'new_table';
ALLOWED_COLUMNS['new_table'] = [...];
```

4. **Add to Hub schema**:
```sql
CREATE TABLE new_table (
    id TEXT PRIMARY KEY,
    desk_id TEXT,
    original_id TEXT,
    ...
);
```

---

*Document Version: 2.0*  
*Last Updated: 2026-02-21*  
*Status: IMPLEMENTED*
