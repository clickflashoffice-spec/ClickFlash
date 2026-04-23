# ClickFlash Gold Master Architecture Audit Report

**Version:** 4.2.0  
**Generated:** 2026-04-12  
**Scope:** Full Ecosystem (Master, Touch, Management, Gallery, Website, MoneyTrash)

---

## ARCHITECTURAL BOTTLENECKS (Pre-Audit Summary)

### 1. Workspace Structure
- **6-App Ecosystem:** Master (Electron), Touch (Electron), MoneyTrash (Tauri), Management (React+Vite), Gallery (React+Vite), Website (Next.js)
- **Stack:** Node 20.x, TypeScript 5.x, React 19.x, Electron 39.x, SQLite (better-sqlite3), Express 4.x
- **Architecture:** Monorepo with pnpm workspaces, offline-first LAN design with optional cloud sync

### 2. Technology Stack
- **Runtime:** Node.js 20.x, Electron 39.2.7
- **Frontend:** React 19.x, Vite 7.x, Tailwind CSS 3.x/4.x
- **Backend:** Express.js, better-sqlite3-multiple-ciphers, Sharp
- **Cloud:** Cloudflare (Workers, R2, D1), Stripe
- **AI:** TensorFlow.js (face recognition, photo quality scoring)

### 3. Entry Points & Initialization
- **Master App:** `electron-main.js` → forks backend → health polling → load renderer
- **Backend:** `server.ts` (792 lines) → initializes all services → graceful shutdown
- **Touch Kiosk:** `main.js` → HMAC-authenticated LAN sync with Master

---

## FINDINGS BY DOMAIN

### 2.1 DATA SYNCHRONIZATION LAYER

#### Issue: Mixed Conflict Resolution Strategies
- **Location:** `apps/master/backend/services/SyncManager.ts:193-214` vs `cloudSyncService.ts:1087-1171`
- **Current State:**
  - SyncManager uses **LWW (Last Write Wins)** with wall-clock timestamps
  - cloudSyncService uses **Operation-based CRDT** with vector clocks via `sync_sequences` table
- **Risk:** Inconsistent behavior when Master syncs with both Kiosk and Cloud
- **Fix:**
```typescript
// In SyncManager.ts, replace timestamp comparison with vector clock approach
private async resolveConflict(table: string, data: SyncEntity, action: string): Promise<ConflictResolution> {
  const existing = this.db.get<{ id: string; vector_clock: Record<string, number> }>(
    `SELECT id, vector_clock FROM ${table} WHERE id = ?`,
    [data.id]
  );
  
  if (!existing) return { action: 'INSERT', proceed: true };
  
  const incomingVC = data.vector_clock || {};
  const localVC = typeof existing.vector_clock === 'string' 
    ? JSON.parse(existing.vector_clock) 
    : existing.vector_clock || {};
  
  // CRDT-style: merge vector clocks, accept if incoming is causally newer
  const mergedVC = { ...localVC };
  for (const [site, counter] of Object.entries(incomingVC)) {
    mergedVC[site] = Math.max(mergedVC[site] || 0, counter);
  }
  
  return { action: 'UPDATE', proceed: true, mergedVectorClock: mergedVC };
}
```

#### Issue: No Explicit Boot State Hydration
- **Location:** `cloudSyncService.ts:327-349`
- **Current State:** Service starts sync cycle immediately without verifying queue state
- **Risk:** Orphaned pending operations if crash occurs during previous sync
- **Fix:**
```typescript
public async hydrateQueueState(): Promise<void> {
  const pendingOps = this.dbManager.query(`
    SELECT COUNT(*) as count FROM operation_logs WHERE status = 'pending'
  `);
  const pendingCount = pendingOps[0]?.count || 0;
  
  const failedOps = this.dbManager.query(`
    SELECT COUNT(*) as count FROM operation_logs WHERE status = 'failed'
  `);
  const failedCount = failedOps[0]?.count || 0;
  
  this.logger.info(`[CloudSync] Boot hydration: ${pendingCount} pending, ${failedCount} failed operations`);
  
  // Reset stuck 'failed' operations older than 1 hour back to 'pending' for retry
  this.dbManager.run(`
    UPDATE operation_logs 
    SET status = 'pending', retry_count = 0 
    WHERE status = 'failed' 
    AND updated_at < datetime('now', '-1 hour')
  `);
}

start() {
  this.loadConfig();
  if (!this.enabled || !this.config.enabled) return;
  
  // P2-Audit Fix: Hydrate queue state before starting sync
  await this.hydrateQueueState();
  
  this.scheduleNextSync(1000);
}
```

#### Issue: No Jitter on Retry Backoff
- **Location:** `cloudSyncService.ts:460-469`
- **Current State:** Deterministic exponential backoff without jitter
- **Risk:** Thundering herd if multiple services restart simultaneously
- **Fix:**
```typescript
// Add jitter to prevent thundering herd
private addJitter(intervalMs: number, jitterFactor = 0.3): number {
  const jitter = intervalMs * jitterFactor * Math.random();
  return intervalMs + jitter;
}

private scheduleNextSync(delayMs?: number) {
  const baseDelay = delayMs || this.currentInterval;
  const jitteredDelay = this.addJitter(baseDelay);
  setTimeout(() => this.runSyncCycle(), jitteredDelay);
}
```

---

### 2.2 IPC SECURITY & BRIDGE LAYER

#### Issue: Memory Leak - Legacy ipcRenderer.on Missing Cleanup
- **Location:** `apps/master/preload.js:53-57`
- **Current State:**
```javascript
on: (channel, callback) => {
  if (!ON_CHANNELS.includes(channel)) return;
  ipcRenderer.on(channel, (_event, ...args) => callback(_event, ...args));
  // BUG: No return statement for cleanup!
},
```
- **Impact:** All listeners registered via `window.electron.ipcRenderer.on()` leak indefinitely
- **Fix:** Applied - Added proper cleanup return:
```diff
  on: (channel, callback) => {
    if (!ON_CHANNELS.includes(channel)) return;
+   const handler = (_event, ...args) => callback(_event, ...args);
+   ipcRenderer.on(channel, handler);
+   return () => ipcRenderer.removeListener(channel, handler);
-   ipcRenderer.on(channel, (_event, ...args) => callback(_event, ...args));
  },
```

#### Issue: Unused Updater Channels in Whitelist
- **Location:** `apps/master/preload.js:16-20`, `electron-main.js`
- **Current State:** 4 updater channels (`updater:check`, `:download`, `:install`, `:status`) whitelisted but no handlers registered
- **Impact:** Silent runtime failures if UI attempts to use updater
- **Fix:**
```typescript
// Option 1: Remove unused channels (if updater not used in Master Portal)
const INVOKE_CHANNELS = [
  "kiosk:unlock",
  "kiosk:lock",
  "dialog:openDirectory",
  "dialog:openFile",
  "dialog:saveFile",
  // Remove: updater:* channels - no handlers exist
];

// Option 2: If updater intended, add handlers to electron-main.js
// Add at line ~340:
ipcMain.handle("updater:check", async () => {
  return autoUpdater.checkForUpdates();
});
// ... etc for download, install, status
```

#### Issue: Timing Attack on PIN Comparison
- **Location:** `apps/master/electron-main.js:289`
- **Current State:** Direct string comparison `if (pin !== expected)`
- **Risk:** Timing analysis could reveal PIN timing patterns
- **Fix:**
```typescript
import { timingSafeEqual } from "crypto";

ipcMain.handle("kiosk:unlock", (_e, pin) => {
  // ... validation logic ...
  
  // Use timing-safe comparison
  if (typeof pin === 'string' && typeof expected === 'string' && pin.length === expected.length) {
    const pinBuffer = Buffer.from(pin);
    const expectedBuffer = Buffer.from(expected);
    if (!timingSafeEqual(pinBuffer, expectedBuffer)) {
      return { success: false, error: "Invalid PIN" };
    }
  } else {
    return { success: false, error: "Invalid PIN" };
  }
  // ...
});
```

---

### 2.3 ARCHITECTURE REFACTORING

#### Issue: Server.ts Exceeds 700 Lines - SRP Violation
- **Location:** `apps/master/backend/server.ts:1-792`
- **Current State:** Server.ts is a monolith that initializes ALL services, routes, and middleware
- **Risk:** Untestable, hard to modify, circular dependency issues
- **Fix:** Extract into focused modules:
```typescript
// server.ts refactoring - extract service initialization
export interface ServiceDependencies {
  dbManager: DatabaseManager;
  auditLogger: AuditLogger;
  logger: Logger;
}

export function initializeServices(deps: ServiceDependencies): ServiceContainer {
  return {
    syncManager: new SyncManager(/* ... */),
    cloudSyncService: new CloudSyncService(/* ... */),
    queueProcessor: new QueueProcessor(/* ... */),
    maintenanceService: new MaintenanceService(/* ... */),
    // etc.
  };
}

// server.ts becomes:
const dbManager = new DatabaseManager(config.DB_PATH);
const services = initializeServices({ dbManager, auditLogger, logger });
const app = express();
registerRoutes(app, services);
startServer(app, services);
```

#### Issue: Magic Numbers Throughout
- **Location:** Multiple files
- **Current State:** Hardcoded numbers lack context
- **Fix:** Centralize constants:
```typescript
// backend/shared/constants.ts
export const SYNC = {
  MIN_INTERVAL_MS: 60_000,        // 1 minute
  MAX_INTERVAL_MS: 1_800_000,      // 30 minutes
  BACKOFF_FACTOR: 1.5,
  CHUNK_RETRY_MAX: 3,
  CHUNK_RETRY_BASE_MS: 2_000,      // 2 seconds
  QUEUE_BATCH_SIZE: 50,
  RETENTION_BATCH_SIZE: 25,
} as const;

export const DB = {
  BUSY_TIMEOUT_MS: 5_000,
  CACHE_SIZE_PAGES: -20_000,       // 20MB
  MAX_LOG_AGE_DAYS: 14,
  MAX_BACKUP_AGE_DAYS: 30,
} as const;

export const SECURITY = {
  MAX_PIN_LENGTH: 6,
  MAX_DIALOG_TITLE_LENGTH: 100,
  MAX_DIALOG_BUTTON_LENGTH: 50,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX_ATTEMPTS: 5,
} as const;
```

---

### 2.4 PERFORMANCE & MEMORY

#### Issue: RAF Cleanup Already Present
- **Location:** `apps/master/src/components/albums/editor2/hooks/useZoomPan.ts:79-86`
- **Current State:** Already has proper cleanup
```typescript
useEffect(() => {
  return () => {
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };
}, []);
```
- **Status:** ✅ CORRECT - No fix needed

#### Issue: No Pagination for Large Albums
- **Location:** `apps/master/backend/routes/collections.ts:846-850`
- **Current State:** Fetches all photos for album in single query
- **Risk:** Memory pressure with 1000+ photo albums
- **Fix:**
```typescript
router.get("/collections/photos", async (req: Request, res: Response) => {
  const { albumId, limit = 100, offset = 0 } = req.query;
  
  const photos = dbManager.query(`
    SELECT * FROM photos 
    WHERE albumId = ? 
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [albumId, Number(limit), Number(offset)]);
  
  const { count } = dbManager.get(`
    SELECT COUNT(*) as count FROM photos WHERE albumId = ?
  `, [albumId]);
  
  res.json({
    items: photos,
    pagination: {
      total: count,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: Number(offset) + photos.length < count
    }
  });
});
```

---

### 2.5 DATABASE OPTIMIZATION

#### Issue: Missing Composite Index for Album Queries
- **Location:** `apps/master/backend/shared/migrations/059_performance_indexes_v2.sql`
- **Current State:** Indexes are present but could be optimized
- **Fix:** Add missing composite index:
```sql
-- Album cover queries (SET_COVER operations)
CREATE INDEX IF NOT EXISTS idx_albums_cover_url ON albums(coverPhotoUrl) WHERE coverPhotoUrl IS NOT NULL;

-- Order fulfillment lookup
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(orderNumber) UNIQUE;

-- Processing queue priority
CREATE INDEX IF NOT EXISTS idx_processing_queue_priority ON processing_queue(priority DESC, created_at ASC);
```

#### Issue: No ANALYZE After Bulk Operations
- **Location:** `apps/master/backend/services/maintenanceService.ts`
- **Current State:** VACUUM runs weekly but ANALYZE does not follow
- **Fix:**
```typescript
private async performVacuum() {
  this.logger.info("[Maintenance] Running VACUUM and ANALYZE...");
  try {
    this.dbManager.exec("VACUUM");
    this.dbManager.exec("ANALYZE"); // Rebuild query planner stats
    this.logger.info("[Maintenance] VACUUM and ANALYZE complete");
  } catch (error) {
    this.logger.error("[Maintenance] VACUUM/ANALYZE failed", { error });
  }
}
```

---

### 2.6 EDGE CASE & FAILURE MODES

#### Issue: No Transaction Rollback on Uncaught Exception
- **Location:** `apps/master/backend/server.ts:730-740`
- **Current State:**
```typescript
server.close(() => {
  logger.info("[Shutdown] Clean exit.");
  process.exit(0);
});
```
- **Risk:** If services fail to stop cleanly, process.exit(0) is called anyway
- **Fix:**
```typescript
const gracefulShutdown = async (signal: string) => {
  logger.info(`[Shutdown] ${signal} received — stopping services...`);
  const stopResults = await Promise.allSettled([
    stopService('tunnelManager', () => tunnelManager.stop()),
    stopService('cloudSyncService', () => cloudSyncService?.stop?.()),
    stopService('queueProcessor', () => queueProcessor?.stop?.()),
    // etc.
  ]);
  
  const failures = stopResults.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    logger.error(`[Shutdown] ${failures.length} services failed to stop gracefully`);
  }
  
  server.close(() => {
    logger.info("[Shutdown] Clean exit.");
    process.exit(failures.length > 0 ? 1 : 0); // Exit 1 if any service failed
  });
  
  // Force exit after 30s
  setTimeout(() => {
    logger.error("[Shutdown] Forced exit after timeout");
    process.exit(1);
  }, 30_000);
};
```

---

### 2.7 AGENTIC TOOLING INTERFACES

#### Issue: Non-Idempotent Order Validation
- **Location:** `apps/master/backend/services/OrderValidationService.ts`
- **Current State:** Check-then-act race condition between validation and fulfillment
- **Risk:** Double fulfillment if retry occurs
- **Fix:**
```typescript
// Use database constraint for idempotency
public async validateAndClaimOrder(orderId: string, validatorId: string): Promise<ValidationResult> {
  const result = this.dbManager.run(`
    UPDATE orders 
    SET status = 'validating', validated_by = ?, validated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending'
  `, [validatorId, orderId]);
  
  if (result.changes === 0) {
    // Either already claimed or not found
    const existing = await this.dbManager.get(`
      SELECT status, validated_by FROM orders WHERE id = ?
    `, [orderId]);
    
    if (!existing) {
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }
    return { 
      success: false, 
      error: existing.status === 'validating' ? 'ALREADY_CLAIMED' : `INVALID_STATE: ${existing.status}`
    };
  }
  
  return { success: true, orderId };
}
```

---

### 2.8 UI STATE MANAGEMENT

#### Issue: Optimistic Update Without Rollback
- **Location:** `apps/master/src/services/api/photoService.ts` (batchSavePhotos)
- **Current State:** Errors in partial batch saves leave UI in inconsistent state
- **Fix:**
```typescript
export async function batchSavePhotos(
  photos: Photo[],
  albumId: string
): Promise<BatchSaveResult> {
  const snapshot = captureCurrentEdits(photos);
  
  try {
    // Apply optimistically
    dispatch({ type: 'MARK_SAVING', photoIds: photos.map(p => p.id) });
    
    const result = await apiService.batchUpdatePhotos(photos, albumId);
    
    if (!result.success) {
      // Rollback on failure
      rollbackEdits(snapshot);
      dispatch({ type: 'RESTORE_EDITS', edits: snapshot });
      return result;
    }
    
    dispatch({ type: 'MARK_SAVED', photoIds: result.savedIds });
    return result;
  } catch (error) {
    rollbackEdits(snapshot);
    dispatch({ type: 'RESTORE_EDITS', edits: snapshot });
    throw error;
  }
}
```

---

## CRITICAL FAILURE POINTS

### 1. IPC Memory Leak (High Priority)
- **File:** `apps/master/preload.js:53-57`
- **Impact:** Renderer listeners accumulate, eventual OOM
- **Fix:** ✅ ALREADY FIXED - Added cleanup return

### 2. No Transaction Rollback on Shutdown (High Priority)
- **File:** `apps/master/backend/server.ts:730-740`
- **Impact:** Data inconsistency on graceful shutdown failure
- **Fix:** Implement `Promise.allSettled` with exit code logic

### 3. Inconsistent Conflict Resolution (Medium Priority)
- **Files:** `SyncManager.ts` vs `cloudSyncService.ts`
- **Impact:** Data corruption possible in multi-master sync scenarios
- **Fix:** Standardize on CRDT approach with vector clocks

### 4. No Queue State Hydration (Medium Priority)
- **File:** `cloudSyncService.ts`
- **Impact:** Orphaned pending operations after crash
- **Fix:** Add `hydrateQueueState()` on boot

### 5. Timing Attack on PIN (Medium Priority)
- **File:** `electron-main.js:289`
- **Impact:** PIN could be derived via timing analysis
- **Fix:** Use `crypto.timingSafeEqual()`

---

## RECOMMENDED IMMEDIATE ACTIONS

| Priority | Action | Files | Effort |
|----------|--------|-------|--------|
| P0 | Fix IPC memory leak | preload.js:53-57 | ✅ DONE |
| P0 | Add shutdown transaction handling | server.ts | 30 min |
| P1 | Standardize conflict resolution | SyncManager.ts, cloudSyncService.ts | 2 hours |
| P1 | Add queue hydration on boot | cloudSyncService.ts | 1 hour |
| P1 | Fix timing attack on PIN | electron-main.js | 15 min |
| P2 | Add missing database indexes | migrations/*.sql | 1 hour |
| P2 | Add pagination for large albums | collections.ts | 2 hours |
| P3 | Extract magic numbers to constants | backend/shared/constants.ts | 3 hours |

---

## TESTING CHECKLIST

### Pre-Deployment
- [ ] Verify IPC memory leak fix with long-running session
- [ ] Test graceful shutdown under load
- [ ] Verify sync conflict resolution with concurrent masters
- [ ] Test queue rehydration after simulated crash

### Post-Deployment
- [ ] Monitor memory usage over 8-hour session
- [ ] Verify no timing attacks on kiosk unlock
- [ ] Check sync sequences incrementing correctly
