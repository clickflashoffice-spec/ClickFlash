# ClickFlash — Offline-First Sync Architecture

> **Version:** 5.0.0  
> **Date:** 2026-06-06  
> **Applies to:** Master Portal, Touch Kiosk, Cloudflare Management Hub

---

## 1. Philosophy

ClickFlash is designed for **resorts and event venues** where internet connectivity is unreliable, expensive, or non-existent during operations. The system must function fully offline and seamlessly sync when connectivity returns.

**Core Principle:** *Local SQLite is the source of truth. The cloud is a replica. The user never waits for the network.*

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OFFLINE-FIRST SYNC STACK                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │   MASTER PORTAL         │    │   TOUCH KIOSK           │                 │
│  │   (Studio Control)        │    │   (Customer-Facing)     │                 │
│  │                         │    │                         │                 │
│  │  ┌─────────────────┐   │    │  ┌─────────────────┐   │                 │
│  │  │ React Frontend  │   │    │  │ React Frontend  │   │                 │
│  │  │ TanStack Query  │   │◄──►│  │ TanStack Query  │   │                 │
│  │  │ (Optimistic UI) │   │LAN │  │ (Optimistic UI) │   │                 │
│  │  └─────────────────┘   │    │  └─────────────────┘   │                 │
│  │           │             │    │           │             │                 │
│  │  ┌─────────────────┐   │    │  ┌─────────────────┐   │                 │
│  │  │ Express Backend │   │    │  │ Express Backend │   │                 │
│  │  │ SQLite (WAL)  │   │◄──►│  │ SQLite (WAL)  │   │                 │
│  │  │ better-sqlite3  │   │HMAC│  │ better-sqlite3  │   │                 │
│  │  └─────────────────┘   │    │  └─────────────────┘   │                 │
│  │           │             │    │           │             │                 │
│  │  ┌─────────────────┐   │    │  ┌─────────────────┐   │                 │
│  │  │ IndexedDB Cache │   │    │  │ IndexedDB Cache │   │                 │
│  │  │ (Dexie)         │   │    │  │ (Dexie)         │   │                 │
│  │  │ Photos, Orders  │   │    │  │ Photos, Orders  │   │                 │
│  │  └─────────────────┘   │    │  └─────────────────┘   │                 │
│  └───────────┬─────────────┘    └───────────┬─────────────┘                 │
│              │                              │                                │
│              │    ┌─────────────────────────┐                                │
│              │    │  CLOUD SYNC LAYER         │                                │
│              │    │  (Master Only)            │                                │
│              │    │  • 60s sync cycle         │                                │
│              │    │  • Operation logs         │                                │
│              │    │  • Batch uploads          │                                │
│              │    │  • Circuit breaker        │                                │
│              │    └───────────┬───────────────┘                                │
│              │                │                                               │
│              ▼                ▼                                               │
│   ╔═══════════════════════════════════════════════════════════════════╗     │
│   ║              CLOUDFLARE MANAGEMENT HUB (Online)                    ║     │
│   ║  ┌─────────────────────────────────────────────────────────────┐  ║     │
│   ║  │  D1 Database — Multi-tenant replica of all masters        │  ║     │
│   ║  │  R2 Storage — Photo archive with desk_id prefix          │  ║     │
│   ║  │  KV Namespace — Session tokens, rate limits, idempotency │  ║     │
│   ║  └─────────────────────────────────────────────────────────────┘  ║     │
│   ╚═══════════════════════════════════════════════════════════════════╝     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Local Storage Hierarchy

| Layer | Technology | Purpose | Durability |
|-------|-----------|---------|------------|
| **Primary Database** | SQLite (better-sqlite3) | All business data: photos, orders, albums, settings | Survives power loss (WAL mode) |
| **Frontend Cache** | IndexedDB (Dexie) | Photo thumbnails, order drafts, album metadata | Survives browser restart |
| **Write Queue** | SQLite `pending_writes` | Deferred writes that survive crashes | Survives power loss |
| **Sync Checkpoint** | `localStorage` | Album/photo sync progress for resume | Survives browser restart |
| **Blob Cache** | IndexedDB | Photo blob URLs for offline viewing | LRU eviction |

---

## 4. Sync Protocols

### 4.1 Master ↔ Touch Kiosk (LAN)

**Transport:** WebSocket (primary) + HTTP fallback (`/api/sync/mutation`)

**Security:** HMAC-SHA256 request signing
- Headers: `X-Kiosk-ID`, `X-Timestamp`, `X-Signature`
- Replay prevention: 5-minute timestamp window
- Secret: 32-byte random, exchanged during pairing

**Conflict Resolution:**
- Vector clocks per entity: `vectorClock: { [clientId]: number }`
- Idempotency: `mutation_ack_log` table keyed by `(client_id, mutation_id)`
- Duplicates receive `ALREADY_APPLIED` ack
- Zod schema validation before all mutations

**Order Sync:**
- Touch pushes pending orders to `/api/orders/kiosk/orders` with `clientMutationId`
- Master deduplicates via `orders.client_mutation_id`
- Conflict flag set if order edited on both sides while disconnected

### 4.2 Master ↔ Cloud (Global Sync)

**Transport:** HTTPS with RS256 JWT + hardware fingerprinting

**Sync Cycle:** Every 60 seconds (adaptive: 1min success → 30min repeated failure)

**Pipelines (15+):**
1. `syncOperationLogs` — Core data sync
2. `syncLedgerEntries` — Payroll data
3. `syncExpenses` — Business expenses
4. `syncInventory` — Consumables stock
5. `syncOrdersToGallery` — Order fulfillment
6. `sendHeartbeat` — Fleet health
7. `uploadRetentionAsset` — MoneyTrash photos
8. `uploadHighRes` — High-res order photos

**Reliability:**
- **Circuit Breaker:** Per-pipeline failure tracking. Global counter resets only when all pipelines succeed.
- **Retry Policy:** Exponential backoff with jitter (factor 1.5, max 30min interval)
- **Idempotency:** `X-Idempotency-Key` = `sha256(desk_id + pipeline + sequence_number + timestamp)`
- **Dead Letter Queue:** After 5 consecutive failures, operations marked `dead_letter`
- **Batching:** Operation logs grouped by pipeline and sent in batches

### 4.3 Touch Offline-First

**Local Storage Stack:**
- **IndexedDB (Dexie):** Albums/orders cache, blob URLs
- **PocketBase (SQLite):** Structured local backend
- **Queue:** Orders saved to IndexedDB first (never blocks UI), then PocketBase, then Master

**Checkpoint/Resume:**
- `syncCheckpointService` tracks album/photo progress in `localStorage`
- Interruptions resume from last checkpoint
- Progress indicator shows "Syncing 45/200 photos..."

---

## 5. Conflict Resolution Strategies

| Scenario | Strategy | Implementation |
|----------|----------|---------------|
| Same field edited on two masters | Last-Write-Wins (LWW) | `updated_at` tiebreaker, vector clock comparison |
| Order created on Touch + Master offline | Merge additive | Combine line items, flag for review if totals differ |
| Photo deleted on Master, edited on Touch | Tombstone wins | `deleted_at` timestamp, Touch receives deletion on sync |
| Settings changed on multiple masters | Hub authoritative | Hub settings override local after sync |
| Pricing changed during offline order | Price-at-time-of-order | Order stores snapshot price, not live price |

---

## 6. Handling Network Interruptions

### 6.1 Detection

```typescript
// Network status monitoring
const isOnline = navigator.onLine && await canReachMaster();

// Master → Cloud
const cloudReachable = await fetch(`${CLOUD_API_URL}/api/health`, 
  { signal: AbortSignal.timeout(5000) }
).then(r => r.ok).catch(() => false);
```

### 6.2 Behavior Matrix

| Network State | Master Behavior | Touch Behavior |
|--------------|-----------------|----------------|
| **Fully Online** | Sync to cloud every 60s, real-time SSE | Sync to Master via WebSocket |
| **LAN Only** (no internet) | Queue cloud sync, LAN sync active | Normal operation, queue for Master |
| **Master Offline** | Queue all operations, show offline banner | Queue orders in IndexedDB, show "Orders saved locally" |
| **Touch Offline** | N/A | Full offline mode: browse cached albums, create orders, queue for sync |
| **Cloud Down** | Circuit breaker opens, exponential backoff | Unaware (Master handles cloud) |

### 6.3 Recovery Procedures

1. **Power Loss During Sync:**
   - SQLite WAL replay on next boot
   - `pending_writes` table flushed before accepting new writes
   - Sync resumes from last checkpoint

2. **Network Flapping (on/off every few seconds):**
   - Debounce: wait 30s of stable connection before declaring "online"
   - Batch queued operations instead of individual retries
   - Circuit breaker prevents thrashing

3. **Large Photo Batch Interrupted:**
   - Track progress per photo in `syncCheckpointService`
   - Resume from last successful photo
   - Already-uploaded photos skipped via hash check

---

## 7. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| LAN sync latency | < 1s | Touch → Master order push |
| Cloud sync latency | < 5s | Master → Hub operation log |
| Offline order creation | < 100ms | Touch UI response time |
| Photo thumbnail load (offline) | < 200ms | IndexedDB blob URL |
| Sync resume time | < 2s | From checkpoint after interruption |
| Queue depth alert | > 1000 | Pending operations in SQLite |

---

## 8. Testing Offline Scenarios

```bash
# Simulate offline mode
# 1. Start Master and Touch
pnpm run dev:master
pnpm run dev:touch

# 2. Disconnect internet (keep LAN)
# Windows: Disable Wi-Fi, keep Ethernet LAN
# macOS: networksetup -setairportpower en0 off

# 3. Create orders on Touch while offline
# Orders queue in IndexedDB

# 4. Reconnect internet
# Watch sync resume from checkpoint

# 5. Verify cloud sync
# Check Management Hub fleet dashboard
```

---

## 9. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Cloud features unavailable offline | No gallery uploads, no fleet analytics | Queue all operations, sync on reconnect |
| Payment processing requires internet | Cannot charge cards offline | Cache payment intent, process on reconnect |
| Email delivery requires internet | No instant order confirmations | Queue emails, batch send on reconnect |
| Large RAW files (100MB+) slow on slow networks | Upload takes minutes | Background upload with progress, resume support |
| mDNS discovery blocked on some corporate networks | Auto-pairing fails | QR code fallback, manual IP entry |

---

## 10. References

- `apps/master/backend/services/cloudSyncService.ts` — Cloud sync implementation
- `apps/master/backend/services/DbWriteQueue.ts` — Persistent write queue
- `apps/touch/src/context/KioskContext.tsx` — Touch offline state management
- `apps/touch/backend/services/watcherService.ts` — File system watcher
- `ARCHITECTURE.md` — Full system architecture

---

*End of Offline Sync Documentation*
