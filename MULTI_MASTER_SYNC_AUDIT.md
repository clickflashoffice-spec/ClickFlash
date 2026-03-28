# Multi-Master Cloud Sync Audit & Implementation Plan

## Executive Summary

This document provides a comprehensive audit of all data synchronization between Master Stations (local SQLite) and the Management Hub (Cloudflare D1), identifying gaps and providing implementation plans.

---

## 1. Current Architecture

### Master Station (Local SQLite)
**Location**: `apps/master/backend/`

#### Core Tables (20+ tables)
| Table | Purpose | Sync Status |
|-------|---------|-------------|
| `users` | Photographers & admins | ✅ Via operation_logs |
| `albums` | Photo albums | ✅ Via operation_logs |
| `photos` | Photo metadata | ✅ Via operation_logs + sync_status |
| `orders` | Customer orders | ✅ Via operation_logs |
| `products` | Product catalog | ✅ Via operation_logs |
| `kiosks` | Kiosk registry | ✅ Via operation_logs |
| `destinations` | Site/location data | ✅ Via operation_logs |
| `settings` | Key-value config | ✅ Via operation_logs |
| `photographer_ledger` | Payroll entries | ✅ **NEW: Via syncLedgerEntries()** |
| `daily_objectives` | Daily targets | ✅ Via operation_logs |
| `session_types` | Session definitions | ✅ Via operation_logs |
| `packs` | Product bundles | ✅ Via operation_logs |
| `bookings` | Appointments | ✅ Via operation_logs |
| `expenses` | Business expenses | ⚠️ **MISSING: Not in operation_logs** |
| `inventory` | Consumables stock | ⚠️ **MISSING: No sync mechanism** |
| `pairing_requests` | Kiosk pairing | ❌ Local-only (ephemeral) |
| `kiosk_sessions` | Session tracking | ❌ Local-only (ephemeral) |
| `assistance_requests` | Help requests | ❌ Local-only (ephemeral) |
| `fulfillment_queue` | Print queue | ❌ Local-only (operational) |
| `retention_queue` | Archive queue | ❌ Local-only (operational) |
| `operation_logs` | Sync event log | ✅ Core sync mechanism |
| `sync_sequences` | Vector clock | ✅ Sync state tracking |

### Management Hub (Cloudflare D1)
**Location**: `apps/management/backend/`

#### Core Tables
| Table | Multi-Desk | Purpose |
|-------|------------|---------|
| `users` | ❌ Global | Master user list (not per-desk) |
| `albums` | ✅ desk_id + original_id | Photo albums |
| `photos` | ✅ desk_id + original_id | Photo metadata |
| `orders` | ✅ desk_id + original_id | Customer orders |
| `products` | ❌ Global | Product catalog |
| `kiosks` | ❌ Global | Kiosk registry |
| `destinations` | ❌ Global | Site registry (with last_seen) |
| `settings` | ❌ Global | Hub settings |
| `photographer_ledger` | ✅ desk_id + original_id | Payroll entries |
| `daily_objectives` | ✅ desk_id + original_id | Daily targets |
| `session_types` | ❌ Global | Session definitions |
| `packs` | ❌ Global | Product bundles |
| `bookings` | ❌ Global | Appointments |
| `inventory` | ❌ Global | Consumables |
| `equipment` | ❌ Global | Equipment tracking |
| `operation_logs` | ✅ desk_id | Sync history |
| `sync_sequences` | ✅ site_id | Vector clock state |
| `sync_conflicts` | ✅ | Conflict tracking |

---

## 2. Sync Mechanisms

### 2.1 Operation-Based Sync (Primary)
**Location**: `cloudSyncService.syncOperationLogs()`

**How it works**:
1. Local mutations write to `operation_logs` table
2. Every 60s, pending operations are batched and sent to Hub
3. Hub applies operations via `recordService.applyOperations()`
4. Local `operation_logs` marked as 'synced'

**Coverage**:
- INSERT, UPDATE, DELETE on all mapped tables
- Automatic `desk_id` injection at Hub
- `original_id` preservation for idempotency

### 2.2 Ledger Sync (Payroll)
**Location**: `cloudSyncService.syncLedgerEntries()` (NEW)

**How it works**:
1. `photographer_ledger` entries created with `sync_status='pending'`
2. Every sync cycle, pending entries converted to operations
3. Sent to Hub via same `/api/cloud/sync/operations` endpoint
4. Local entries marked `sync_status='synced'`

### 2.3 Photo File Sync (Binary)
**Location**: `cloudSyncService.syncPhotos()` (INCOMPLETE)

**Status**: ⚠️ Partial implementation - needs completion

### 2.4 Retention Sync
**Location**: `cloudSyncService.syncRetentionStats()`

**Purpose**: Upload retention policy compliance data

---

## 3. Sync Gaps Analysis

### Critical Gaps (High Priority)

#### 3.1 Expenses Sync
**Issue**: `expenses` table exists in Master but not synced
**Impact**: Business expenses not visible in Management Hub
**Solution**: Add to operation_logs sync

#### 3.2 Inventory Sync
**Issue**: `inventory` table exists in both but no sync mechanism
**Impact**: Stock levels not synchronized
**Solution**: Add sync_status column + sync method

#### 3.3 Equipment Sync
**Issue**: Equipment tracking exists only in Hub
**Impact**: Master stations can't report equipment status
**Solution**: Add equipment table to Master + sync

### Medium Priority Gaps

#### 3.4 Fleet Heartbeat
**Issue**: Master stations don't report health metrics to Hub
**Impact**: Fleet Monitor shows offline status
**Solution**: Implement periodic heartbeat with health metrics

#### 3.5 Analytics Sync
**Issue**: Analytics calculated locally, not aggregated in Hub
**Impact**: Management Dashboard incomplete
**Solution**: Sync analytics snapshots or compute from synced data

### Low Priority (Local-Only by Design)

| Table | Reason |
|-------|--------|
| `pairing_requests` | Ephemeral, security-sensitive |
| `kiosk_sessions` | Operational, high-frequency |
| `assistance_requests` | Real-time, local-only |
| `fulfillment_queue` | Operational print queue |
| `retention_queue` | Local archival queue |
| `face_indexing_queue` | Local processing queue |

---

## 4. Implementation Plan

### Phase 1: Critical Sync (Immediate)

#### 4.1.1 Expenses Sync
```typescript
// Add to cloudSyncService.ts
private async syncExpenses() {
    const expenses = this.dbManager.query(`
        SELECT * FROM expenses 
        WHERE sync_status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 50
    `);
    // Convert to operations and send
}
```

#### 4.1.2 Inventory Sync
```sql
-- Add to Master schema
ALTER TABLE inventory ADD COLUMN sync_status TEXT DEFAULT 'pending';
ALTER TABLE inventory ADD COLUMN sync_id TEXT;
```

```typescript
// Add to cloudSyncService.ts
private async syncInventory() {
    // Similar pattern to syncLedgerEntries()
}
```

#### 4.1.3 Fleet Heartbeat
```typescript
// Add to cloudSyncService.ts
private async sendHeartbeat() {
    const health = {
        desk_id: this.deskId,
        timestamp: Date.now(),
        version: process.env.APP_VERSION,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        disk: await getDiskUsage(),
        orders_today: await getTodayOrderCount(),
        photos_today: await getTodayPhotoCount()
    };
    // POST to /api/cloud/heartbeat
}
```

### Phase 2: Enhanced Sync

#### 4.2.1 Bi-directional Config Sync
- Hub can push config updates to Master stations
- Settings like pricing, products synced from Hub to Master

#### 4.2.2 Real-time Sync
- WebSocket connection for critical updates
- Order status changes sync instantly

### Phase 3: Analytics Aggregation

#### 4.3.1 Analytics Sync
```typescript
// Daily analytics snapshot
interface AnalyticsSnapshot {
    desk_id: string;
    date: string;
    revenue: number;
    orders_count: number;
    photos_count: number;
    avg_order_value: number;
}
```

---

## 5. Security & Isolation

### Current Security Model
1. **JWT Authentication**: All sync requests authenticated
2. **desk_id Injection**: Hub enforces data isolation
3. **original_id**: Prevents duplicate records
4. **Vector Clocks**: Conflict resolution

### Security Gaps
1. No rate limiting on sync endpoints
2. No payload size limits
3. No sync audit logging in Hub

### Recommendations
```typescript
// Add to Management Hub
const SYNC_LIMITS = {
    maxOperationsPerBatch: 100,
    maxPayloadSize: '10MB',
    maxSyncFrequency: '30s',
    requireChecksum: true
};
```

---

## 6. Monitoring & Observability

### Current Monitoring
- `CloudSyncService.getStats()` - Queue sizes
- `CloudSyncService.getLedgerStats()` - Payroll sync status
- Fleet Monitor - Basic online/offline

### Missing Monitoring
1. Sync lag (time since last successful sync)
2. Conflict rate
3. Failed operation retry count
4. Bandwidth usage
5. Per-table sync statistics

### Recommended Metrics
```typescript
interface SyncMetrics {
    desk_id: string;
    last_sync_at: string;
    operations_pending: number;
    operations_failed: number;
    avg_sync_duration_ms: number;
    conflicts_detected: number;
    bytes_transferred: number;
}
```

---

## 7. Conflict Resolution

### Current State
- `sync_conflicts` table exists in Hub
- No automatic resolution implemented
- Conflicts logged but not surfaced to UI

### Conflict Types
1. **Simultaneous Edits**: Same record modified on multiple masters
2. **Offline-Online Transition**: Changes made while offline
3. **Schema Mismatch**: Different versions have different fields

### Resolution Strategy
```typescript
enum ConflictResolution {
    LAST_WRITE_WINS = 'lww',      // Default
    HUB_WINS = 'hub',             // Hub version preferred
    MASTER_WINS = 'master',       // Master version preferred
    MANUAL = 'manual',            // Requires admin intervention
    MERGE = 'merge'               // Field-level merge
}
```

---

## 8. Implementation Checklist

### Immediate (This Session)
- [ ] Implement `syncExpenses()` method
- [ ] Add `sync_status` to inventory table
- [ ] Implement `syncInventory()` method
- [ ] Add fleet heartbeat mechanism
- [ ] Add sync metrics collection

### Short Term (Next Week)
- [ ] Conflict resolution UI in Management Hub
- [ ] Bi-directional config sync
- [ ] Sync audit logging
- [ ] Rate limiting on sync endpoints

### Long Term (Next Month)
- [ ] Real-time sync via WebSocket
- [ ] Compression for large batches
- [ ] Delta sync (only changed fields)
- [ ] Offline-first architecture

---

## 9. API Endpoints

### Master Station APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cloud/sync` | POST | Trigger full sync |
| `/api/cloud/sync/payroll` | POST | Trigger payroll sync |
| `/api/cloud/stats/payroll` | GET | Payroll sync stats |
| `/api/cloud/stats/expenses` | GET | Expenses sync stats (NEW) |
| `/api/cloud/stats/inventory` | GET | Inventory sync stats (NEW) |
| `/api/cloud/heartbeat` | POST | Fleet heartbeat (NEW) |

### Management Hub APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/cloud/sync/operations` | POST | Receive operations |
| `/api/cloud/sync/operations` | GET | Pull remote operations |
| `/api/cloud/heartbeat` | POST | Receive heartbeat (NEW) |
| `/api/cloud/conflicts` | GET | List conflicts (NEW) |
| `/api/cloud/conflicts/:id/resolve` | POST | Resolve conflict (NEW) |

---

## 10. Testing Strategy

### Unit Tests
- Operation serialization/deserialization
- Conflict detection logic
- Retry mechanism

### Integration Tests
- End-to-end sync flow
- Offline/online transition
- Multi-master conflict scenario

### Load Tests
- 1000+ operations per batch
- 100+ concurrent masters
- Slow network conditions

---

## Appendix A: Table Compatibility Matrix

| Master Table | Hub Table | Sync Method | Status |
|--------------|-----------|-------------|--------|
| users | users | operation_logs | ✅ Active |
| albums | albums | operation_logs | ✅ Active |
| photos | photos | operation_logs | ✅ Active |
| orders | orders | operation_logs | ✅ Active |
| products | products | operation_logs | ✅ Active |
| kiosks | kiosks | operation_logs | ✅ Active |
| destinations | destinations | operation_logs | ✅ Active |
| settings | settings | operation_logs | ✅ Active |
| photographer_ledger | photographer_ledger | syncLedgerEntries | ✅ **NEW** |
| daily_objectives | daily_objectives | operation_logs | ✅ Active |
| session_types | session_types | operation_logs | ✅ Active |
| packs | packs | operation_logs | ✅ Active |
| bookings | bookings | operation_logs | ✅ Active |
| expenses | - | **NONE** | ❌ **GAP** |
| inventory | inventory | **NONE** | ❌ **GAP** |
| equipment | equipment | **N/A** | ❌ **GAP** |

---

*Document Version: 1.0*
*Last Updated: 2026-02-21*
