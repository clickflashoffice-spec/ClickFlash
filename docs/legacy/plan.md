# ClickFlash Offline-First Kiosk Sync — Optimization Plan

> **Version:** 1.0  
> **Date:** June 2026  
> **Status:** Pending Approval  

---

## 1. Architecture Assessment

### 1.1 Current State (Strengths)
- **Triple Idempotency:** `mutation_ack_log` (LAN), `client_mutation_id` (orders), `X-Idempotency-Key` (cloud)
- **Vector Clocks:** `SyncManager` implements proper `before`/`after`/`concurrent` comparison with merge
- **Persistent Write Queue:** `DbWriteQueue` uses SQLite `pending_writes` for power-cycle resilience
- **Circuit Breakers:** Global (10 failures → 5min) + Per-pipeline (5 failures → 2min) in `CloudSyncService`
- **WAL + Encryption:** SQLite WAL mode, SQLCipher via `better-sqlite3-multiple-ciphers`
- **Checkpoint Resume:** `syncCheckpointService` tracks album/photo sync progress
- **HMAC LAN Security:** `lanSigningMiddleware` with replay prevention

### 1.2 Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Non-standard `json_patch` SQL** | 🔴 Critical | `DbWriteQueue` uses `json_patch()` which is not standard SQLite. Will fail on fresh installs. |
| **No Touch Auto-Polling** | 🔴 Critical | `startSyncLoop()` only runs once. Orders sit unsynced if Master is temporarily offline. |
| **`localStorage` Quota Risk** | 🟡 High | `syncCheckpointService` stores photo ID arrays in `localStorage` (~5MB limit). 500+ photos will overflow. |
| **DbWriteQueue Race Condition** | 🟡 High | `pending_writes` rows are DELETEd inside the transaction but before COMMIT. Power loss between DELETE and COMMIT = data loss. |
| **CloudSyncService Monolith** | 🟡 Medium | 2400+ lines, 15+ pipelines. Violates SRP, hard to test and maintain. |
| **Silent Error Swallowing** | 🟡 Medium | `syncRemoteSettings()` and several cloud methods swallow all errors silently. |
| **HTTP-only Photo Pull** | 🟡 Medium | Touch backend uses `http.get` only — fails against HTTPS Master endpoints. |
| **No Proactive Connectivity** | 🟢 Low | No dedicated connectivity detection service. Reactive failure-based detection only. |
| **Missing Conflict UX** | 🟢 Low | Touch has no handling for `conflict_flag = 1` orders from Master. |

---

## 2. Recommended Improvements

### 2.1 Storage Strategy

#### Master: Fix `pending_writes` Merge Logic
**Current:**
```sql
ON CONFLICT(id) DO UPDATE SET
  payload_json = json_patch(payload_json, excluded.payload_json),
  ...
```
**Problem:** `json_patch()` is not standard SQLite.
**Fix:** Replace with application-level JSON merge in the `enqueue()` method:
```typescript
// Read existing payload, merge at JS level, then INSERT/REPLACE
const existing = this.db.get<{ payload_json: string }>(
  `SELECT payload_json FROM pending_writes WHERE id = ?`, [key]
);
const merged = existing ? { ...JSON.parse(existing.payload_json), ...data } : data;
this.db.run(
  `INSERT INTO pending_writes (...) VALUES (...) 
   ON CONFLICT(id) DO UPDATE SET payload_json = ?, priority = ...`,
  [..., JSON.stringify(merged), ...]
);
```

#### Touch: Migrate Checkpoint from `localStorage` to `IndexedDB`
**Current:** `syncCheckpointService` uses `localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(...))`
**Fix:** Use Dexie/IndexedDB with a `checkpoints` table. Supports >5MB, structured querying, and doesn't block the main thread.

#### Touch: Add Auto-Polling with Exponential Backoff
**Current:** `startSyncLoop(intervalMs)` runs `sync()` once and logs "auto-polling disabled".
**Fix:** Implement a proper polling loop:
- Online: poll every 15s
- After failure: exponential backoff up to 5min
- On network recovery: immediate sync trigger via `navigator.onLine` + `window.online` event
- Graceful stop on component unmount / app quit

### 2.2 Sync Mechanism

#### Master: Fix DbWriteQueue Race Condition
**Current:** `DELETE FROM pending_writes` happens inside `db.transaction()`, but the transaction commit is implicit. If power is lost after DELETE but before the filesystem fsyncs the WAL, the write is lost and the pending record is gone.
**Fix:** Use a **2-phase commit pattern**:
1. `UPDATE pending_writes SET status = 'flushing' WHERE id IN (...)`
2. Run target table UPDATEs in transaction
3. `DELETE FROM pending_writes WHERE status = 'flushing' AND id IN (...)`
4. On boot recovery: `SELECT * FROM pending_writes WHERE status = 'pending'` (flushing rows from crashed sessions are also recovered)

#### Master: Modularize CloudSyncService
**Target:** Extract each pipeline into a `SyncPipeline` class/interface.
```
services/cloudSync/
  ├── CloudSyncService.ts      (orchestrator, scheduling, auth)
  ├── pipelines/
  │   ├── OperationLogPipeline.ts
  │   ├── LedgerPipeline.ts
  │   ├── AnalyticsPipeline.ts
  │   └── ...
  ├── circuitBreaker.ts        (shared state machine)
  └── idempotency.ts           (key generation & storage)
```
**Benefit:** Each pipeline is independently testable, circuit-breakable, and replaceable.

#### Touch: Add Proactive Connectivity Detection
**New Service:** `ConnectivityService`
- Uses `navigator.onLine` as coarse signal
- Probes Master `/api/health` with `HEAD` request every 10s when offline
- Emits `online`/`offline` events that `syncService` subscribes to
- `SyncStatusIndicator` reacts to these events for real-time UX

### 2.3 Conflict Resolution

#### Touch: Handle `conflict_flag` from Master
**Current:** Master sets `conflict_flag = 1` on orders edited concurrently. Touch ignores this.
**Fix:**
1. When pulling albums/orders, check `conflict_flag`
2. If set, show "Review Required" badge in `SyncStatusIndicator`
3. Disable local editing of conflicted orders until staff resolves on Master
4. Log conflict to `offlineStorage.conflicts` for audit trail

### 2.4 Security & Resilience

- **HTTP → HTTPS in photo pull:** Update `touch/backend/routes/sync.ts` to use `fetch` or support both `http` and `https` modules based on URL protocol.
- **Rate limiting on kiosk orders:** Add `strictRateLimiter` to `/api/orders/kiosk/orders` to prevent burst abuse.
- **Message size limits on WebSocket:** `SyncManager` already mentions >1MB rejection — verify this is enforced.

---

## 3. Step-by-Step Implementation Roadmap

### Stage A: Critical Fixes (P0) — Estimated 2-3 hours
1. **Fix `json_patch` in `DbWriteQueue.ts`**
   - Replace SQL-level merge with JS-level merge
   - Update `enqueue()` to read → merge → write
   - Verify with unit test
2. **Add Touch Auto-Polling**
   - Implement `startSyncLoop()` with `setInterval` / `setTimeout` loop
   - Add exponential backoff on failure
   - Wire `window.addEventListener('online', ...)` for immediate retry
3. **Fix DbWriteQueue Race Condition**
   - Add `status` column usage: `pending` → `flushing` → deleted
   - Update `recoverPendingWrites()` to recover both `pending` and `flushing`
   - Add unit test simulating crash mid-flush

### Stage B: High-Impact Improvements (P1) — Estimated 3-4 hours
4. **Migrate Checkpoint to IndexedDB**
   - Add `checkpoints` table to Dexie schema in `apps/touch/src/services/db.ts`
   - Rewrite `syncCheckpointService` to use IndexedDB
   - Add migration: read from `localStorage` once, write to IndexedDB, clear `localStorage`
5. **Fix Hardcoded E2E Path**
   - Replace `ARTIFACTS_DIR` in `preview-verification.spec.ts` with `test.info().outputPath()` or env var
6. **Add Rate Limiting to Kiosk Orders**
   - Apply `strictRateLimiter` to `/api/orders/kiosk/orders`

### Stage C: Medium Improvements (P2) — Estimated 4-5 hours
7. **Modularize CloudSyncService (partial)**
   - Extract `circuitBreaker.ts` and `idempotency.ts` as shared utilities
   - Extract `OperationLogPipeline` as proof-of-concept
   - Leave remaining pipelines in place to minimize risk
8. **Add ConnectivityService to Touch**
   - Create `apps/touch/src/services/connectivityService.ts`
   - Probe Master health every 10s when offline
   - Emit events; wire into `syncService` and `SyncStatusIndicator`
9. **Handle `conflict_flag` on Touch**
   - Update `syncService.pullAlbumsFromMaster()` to check for conflicts
   - Update `SyncStatusIndicator` to show conflict badge
   - Add `offlineStorage.conflicts` table

### Stage D: Testing & Documentation (P3) — Estimated 3-4 hours
10. **Expand Test Coverage**
    - Add `DbWriteQueue` crash-recovery unit test
    - Add `SyncManager` concurrent mutation conflict test
    - Add `CloudSyncService` circuit breaker state transition test
    - Add Touch `syncService` auto-polling test
    - Add `syncCheckpointService` IndexedDB migration test
11. **Run Full Test Suite**
    - `npm run test:master` (unit + integration)
    - `npm run test:touch` (unit)
    - `npx playwright test sync-reliability.spec.ts` (E2E)
    - `npx tsx scripts/simulate-kiosk-usage.ts` (simulation)
12. **Update Documentation**
    - Update `docs/OFFLINE_FIRST_STANDARDS.md` with new checkpoint design and connectivity detection
    - Update `ARCHITECTURE.md` with DbWriteQueue 2-phase commit diagram
    - Update `CHANGELOG.md` with all changes

---

## 4. Testing Strategy

### 4.1 Unit Tests

| Target | Cases | Tool |
|--------|-------|------|
| `DbWriteQueue` | enqueue, flush, recovery, crash-simulation, priority | Jest (master) |
| `SyncManager` | heartbeat, mutation apply, duplicate rejection, vector clock merge, invalid payload | Jest (master) |
| `SyncCheckpointService` | save, load, expire, migrate from localStorage | Jest (touch) |
| `syncService` | push orders, handle 208, retry failed photos, auto-polling | Jest (touch) |
| `CloudSyncService` | circuit breaker transitions, idempotency key generation, auth failure | Jest (master) |

### 4.2 Integration Tests

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Offline order → online sync | 1. Create order on Touch while Master down  2. Start Master  3. Touch auto-polls and syncs | Order appears on Master with same `clientMutationId` |
| Power cycle mid-flush | 1. Enqueue 10 writes  2. Call `flush()`  3. Simulate crash after `status='flushing'`  4. Reboot `DbWriteQueue` | All 10 writes recovered and applied; zero duplicates |
| Concurrent edit conflict | 1. Kiosk edits order A  2. Master edits order A  3. Kiosk syncs | Master record wins; `conflict_flag = 1` set; Touch shows review badge |
| Idempotency stress | 1. Push same order 10 times rapidly | 1 created, 9 deduplicated (208) |
| Large dataset resume | 1. Start sync of 500 photos  2. Kill Touch app at photo 250  3. Restart | Resume from photo 250; checkpoint valid |

### 4.3 E2E Tests

| Test | Tool | Notes |
|------|------|-------|
| Kiosk order creation + dedup | Playwright | Use `request` fixture for API calls |
| Dashboard resilience under sync | Playwright | Verify no crash toasts |
| Offline mode UX | Playwright | Use `context.setOffline(true)` to simulate |
| Auto-polling recovery | Playwright | Block Master URL, create order, unblock, verify sync |

### 4.4 Simulation

| Script | Scenarios |
|--------|-----------|
| `scripts/simulate-kiosk-usage.ts` | Normal sync, idempotency stress, offline burst, verification |

---

## 5. Edge Cases & Mitigations

| Edge Case | Mitigation |
|-----------|------------|
| **Power loss during `DbWriteQueue.flush()`** | 2-phase commit: `pending` → `flushing` → delete. Recovery picks up both states. |
| **Power loss during Touch order save** | Order saved to IndexedDB first (Dexie is ACID). PB write is secondary. |
| **Network flap (1s offline, 1s online)** | Exponential backoff prevents thundering herd. Circuit breaker opens after sustained failure. |
| **Concurrent kiosk usage (2 kiosks, 1 Master)** | Vector clocks resolve conflicts. Orders use `clientMutationId` for dedup. |
| **Large photo dataset (10GB, 1000+ photos)** | Checkpoint resume with IndexedDB. Batch processing (5 albums at a time). Max 3 concurrent downloads. |
| **Master clock drift** | NTP drift correction via `timeService.updateDrift()` from cloud `Date` header. |
| **SQLite corruption** | WAL mode + `synchronous = NORMAL` + `busy_timeout = 5000`. Encryption optional. |
| **`localStorage` cleared by user/OS** | Checkpoint migrated to IndexedDB. `kioskId` and `masterLocalIPAddress` should also be backed up to IndexedDB. |
| **Hub returns 500 for batch** | Per-pipeline circuit breaker opens. Retry count incremented. DLQ after 5 failures. |
| **Kiosk re-pairs with new Master** | `syncService` updates `masterUrl` and clears checkpoint for full re-sync. |

---

## 6. Production Readiness Checklist

- [ ] `json_patch` replaced with JS merge
- [ ] Touch auto-polling implemented
- [ ] DbWriteQueue 2-phase commit implemented
- [ ] Checkpoint migrated to IndexedDB
- [ ] All unit tests passing (>80% coverage target)
- [ ] All integration tests passing
- [ ] E2E tests passing (no hardcoded paths)
- [ ] Simulation script passing
- [ ] Documentation updated (`OFFLINE_FIRST_STANDARDS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`)
- [ ] No silent error swallowing in critical paths
- [ ] Rate limiting on kiosk endpoints
- [ ] Graceful shutdown handlers registered

---

## 7. Approval Request

**This plan proposes destructive changes to:**
- `apps/master/backend/services/DbWriteQueue.ts` (core write path)
- `apps/touch/src/services/syncService.ts` (core sync loop)
- `apps/touch/src/services/syncCheckpointService.ts` (checkpoint storage)
- Database schema behavior (2-phase commit status field)

**Please confirm:**
1. ✅ **Approve full plan** — Execute Stages A through D sequentially.
2. ⚠️ **Approve Stage A only** — Execute critical P0 fixes first, pause for review.
3. ❌ **Request modifications** — Specify changes to the plan.

> **Default recommendation:** Approve Stage A immediately (critical fixes are safe and low-risk), then review Stages B–D before proceeding.
