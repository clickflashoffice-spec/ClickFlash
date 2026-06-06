# Offline-First Standards — ClickFlash Kiosk Ecosystem

> **Version:** 1.1  
> **Last Updated:** June 2026  
> **Applies to:** `apps/master`, `apps/touch`

---

## 1. Design Principles

1. **Local-first**: All user actions must be captured locally before any network attempt.
2. **Queue durability**: Pending operations must survive power cycles, app crashes, and OS kills.
3. **Idempotency**: Every sync operation must be safely retryable without side effects.
4. **Graceful degradation**: When offline, the UX must remain fully functional with clear visual indicators.
5. **Eventual consistency**: Conflicts are resolved with vector clocks or manual review — never silent data loss.
6. **Proactive connectivity**: Detect network changes before operations fail, not after.

---

## 2. Queue Design

### 2.1 Persistent Write Queue (Master)
- **Location:** SQLite `pending_writes` table
- **Schema:** `id, table_name, record_id, payload_json, priority, status, retry_count, created_at, updated_at`
- **Behavior:**
  - `enqueue()` → INSERT into `pending_writes` (application-level JSON merge, **not** `json_patch`) → add to in-memory Map
  - `flush()` → **2-Phase Commit:**
    1. `UPDATE pending_writes SET status = 'flushing'`
    2. BEGIN TRANSACTION → UPDATE target table → COMMIT
    3. `DELETE FROM pending_writes WHERE status = 'flushing'`
  - On boot → SELECT rows WHERE `status IN ('pending', 'flushing')` → hydrate into Map → immediate flush
- **Power-Cycle Safety:** If power is lost between Phase 1 and Phase 3, recovered rows are re-applied. Zero data loss.

### 2.2 Offline Queue (Touch)
- **Location:** IndexedDB (`offlineQueue` via Dexie) + PocketBase `orders` collection
- **Behavior:**
  - Order creation → save to IndexedDB first (never blocks on PB)
  - If PB is available → also save to PB for structured querying
  - Sync loop → push PB pending orders + IndexedDB orphan orders
  - ACK from Master → mark PB status = `Synced` → delete from IndexedDB

---

## 3. Idempotency Contract

### 3.1 Master ↔ Kiosk (LAN)
- **Key:** `mutation_ack_log` table keyed by `(client_id, mutation_id, payload_hash)`
- **Flow:**
  1. Kiosk sends `MUTATION` over WebSocket or HTTP fallback
  2. Master checks `mutation_ack_log` before applying
  3. If found → returns `MUTATION_ACK` with status `ALREADY_APPLIED`
  4. If not found → applies inside transaction → INSERT ack → broadcast

### 3.2 Master ↔ Cloud Hub
- **Key:** `X-Idempotency-Key` header = `sha256(desk_id + pipeline + sequence_number + timestamp)`
- **Flow:**
  1. Master generates key before sending batch
  2. Stores key in `sync_idempotency_keys` table
  3. Hub returns `208 Already Reported` if duplicate
  4. Master treats `208` as success and marks ops as `synced`

### 3.3 Touch Kiosk ↔ Master (Orders)
- **Key:** `clientMutationId` = `kioskId:timestamp:random`
- **Flow:**
  1. Touch generates `clientMutationId` at order creation time
  2. Sends to Master `/api/orders/kiosk/orders`
  3. Master checks `orders.client_mutation_id` column
  4. If found → returns `208` with existing order ID
  5. If not found → INSERT new order
- **Rate Limiting:** `strictRateLimiter` (5 req/min) applied to `/api/orders/kiosk/orders`

---

## 4. Conflict Resolution

### 4.1 Vector Clocks (Master ↔ Kiosk State Sync)
- Each mutation carries a `vectorClock: { [clientId]: number }`
- Master increments the client's counter on apply
- Comparison rules:
  - `after` → apply update
  - `before` → reject (stale)
  - `concurrent` → merge vector clocks and apply (last-write-wins with audit)

### 4.2 Manual Review Flag (Touch Orders)
- If an order was edited on both Touch and Master while disconnected:
  - Touch sync pushes with `clientMutationId`
  - Master detects timestamp divergence
  - Master sets `conflict_flag = 1` on the order
  - Staff UI shows "Review Required" badge
- **Touch Conflict Tracking:** `offlineStorage.saveConflict()` stores unresolved conflicts in IndexedDB `conflicts` table. `SyncStatusIndicator` displays conflict count.

---

## 5. Retry & DLQ Policies

| Pipeline | Max Retries | Backoff | DLQ After | Action |
|---|---|---|---|---|
| `operation_logs` | 5 | Exponential (1.5x) + jitter | 5 failures | Move to `dead_letter` status |
| `ledger` | 3 | Exponential | 3 failures | Alert + manual review |
| `expenses` | 3 | Exponential | 3 failures | Alert + manual review |
| `inventory` | 3 | Exponential | 3 failures | Alert + manual review |
| `photos` | 3 | Exponential + 1h clear | 3 failures | Retry queue in localStorage |
| **Touch Auto-Poll** | ∞ | Exponential (2x) up to 5min | — | Resume on `online` event |

### Circuit Breaker
- **Global:** 10 consecutive full-sync failures → OPEN for 5 minutes
- **Per-pipeline:** 5 consecutive pipeline failures → OPEN for 2 minutes
- **Recovery:** HALF_OPEN after timeout → one successful call closes circuit

---

## 6. Power-Cycle Recovery

1. **Master:**
   - `DbWriteQueue` hydrates from `pending_writes` on boot (recovers both `pending` and `flushing`)
   - `CloudSyncService` hydrates queue state (counts pending/failed/DLQ)
   - `SyncManager` has no in-memory state to lose (connections re-establish)

2. **Touch:**
   - `syncService` reads checkpoint from **IndexedDB** (Dexie) on boot — migrated from legacy `localStorage`
   - `offlineStorage` (IndexedDB) persists orders/albums/conflicts
   - `failedPhotoQueue` is serialized to `localStorage`
   - `connectivityService` probes Master health every 10s when offline

---

## 7. Connectivity Detection

### 7.1 Touch Kiosk
- **Coarse:** `navigator.onLine` (browser API)
- **Fine-grained:** `connectivityService` probes Master `/api/health` every 10s when offline
- **Debounced:** 2-second debounce to prevent rapid state flapping
- **Events:** `online`/`offline` emitted to subscribers (`syncService`, `SyncStatusIndicator`)
- **UX:** `SyncStatusIndicator` shows 5 states:
  - `synced` (green) — all caught up
  - `syncing` (blue, spinning) — active sync
  - `error` (orange) — sync failed but Master reachable
  - `unreachable` (yellow) — browser online but Master unreachable
  - `offline` (red) — browser offline

---

## 8. Monitoring & Alerting

### Metrics to Track
- `sync_latency_ms` — end-to-end sync duration
- `operations_synced` — throughput per cycle
- `operations_failed` — error rate per pipeline
- `dlq_size` — dead letter queue growth
- `pending_writes_count` — Master write queue depth
- `pending_orders_count` — Touch offline queue depth
- `connectivity_state` — Master reachability (0/1)
- `conflict_count` — unresolved sync conflicts

### Log Levels
- `info` — successful sync completion, checkpoint resume, connectivity restored
- `warn` — retry attempts, circuit breaker OPEN, partial failures, conflicts detected
- `error` — DLQ insertion, unrecoverable sync failure, schema mismatch

---

## 9. Security

1. **LAN Signing:** All kiosk HTTP mutations use HMAC-SHA256 (`lanSigningMiddleware`)
2. **IP Whitelisting:** `NetworkDetectionManager` restricts kiosk access to private ranges
3. **Rate Limiting:** `strictRateLimiter` on `/sync/mutation` and `/orders/kiosk/orders`
4. **Payload Validation:** Zod schemas on all mutation endpoints
5. **Message Size:** WebSocket messages > 1MB are rejected

---

## 10. Testing Requirements

### Unit Tests
- Vector clock comparison and merge
- Idempotency deduplication (ack log, 208 response)
- Circuit breaker state transitions
- DbWriteQueue recovery and flush (including 2-phase commit crash simulation)
- ConnectivityService debounce and state transitions

### Integration Tests
- Offline order creation → online sync → verify Master record
- Power cycle mid-flush → verify zero data loss
- Concurrent edit → verify conflict flag
- 500-photo batch → verify checkpoint resume (IndexedDB)
- Master health probe → verify connectivity state transitions

### E2E Tests
- Playwright: `offline.spec.ts` extended with order sync scenarios
- Kiosk simulation: network loss/recovery, page reload mid-sync
- Auto-polling: block Master URL, create order, unblock, verify sync within 15s

---

*For architecture details, see `ARCHITECTURE.md`.*
*For implementation roadmap, see `plan.md`.*
