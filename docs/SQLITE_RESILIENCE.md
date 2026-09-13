# ClickFlash SQLite WAL Resilience & Recovery Guide

> Architecture Decision: The ClickFlash Master OS edge node uses SQLite WAL (Write-Ahead Logging) as its primary local database, managed through `better-sqlite3` with a custom `DbWriteQueue.ts` write compaction layer.

## 1. Current Architecture

### DbWriteQueue.ts Write Compaction
The Master OS backend uses `DbWriteQueue.ts` as an in-memory JavaScript queue that batches SQLite writes:
- Incoming photo ingestion events are queued in memory
- Writes are compacted and flushed to SQLite in batches
- This prevents WAL file growth during burst ingestion (e.g., roller coaster burst shots)

### SQLite WAL Mode Configuration
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA wal_autocheckpoint = 1000;
PRAGMA foreign_keys = ON;
```

### Known Risk: Single Point of Failure (SPOF)
**Finding [ARCH-MED-001]**: If the SQLite file locks or corrupts during power loss at a resort (e.g., electrical storm), the in-memory queue loses all buffered writes, and queued guest photos stall until manual recovery.

## 2. Mitigation Strategy

### Automated WAL Checkpointing
Configure periodic WAL checkpoints to prevent unbounded WAL growth:
```typescript
// Schedule every 5 minutes
setInterval(() => {
  db.pragma('wal_checkpoint(PASSIVE)');
  logger.info('WAL checkpoint completed', { mode: 'PASSIVE' });
}, 5 * 60 * 1000);
```

### Database Snapshotting Schedule
- **Frequency**: Every 30 minutes during active operation (ingestion detected)
- **Method**: `better-sqlite3` `backup()` API to create atomic `.db.backup` file
- **Retention**: Keep last 3 snapshots on disk; rotate older backups
- **Location**: `./data/backups/clickflash-{timestamp}.db`

```typescript
import Database from 'better-sqlite3';

async function createSnapshot(db: Database.Database): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `./data/backups/clickflash-${timestamp}.db`;
  await db.backup(backupPath);
  logger.info('Database snapshot created', { path: backupPath });
  return backupPath;
}
```

### Power Loss Recovery Procedure
1. **Detect corruption**: On Master OS startup, run `PRAGMA integrity_check;`
2. **If corrupt**:
   a. Locate latest `.db.backup` in `./data/backups/`
   b. Copy backup to primary database path
   c. Run `PRAGMA wal_checkpoint(TRUNCATE);` to clean WAL
   d. Verify with `PRAGMA integrity_check;`
3. **If backup also corrupt**: Fall back to cloud sync from `cloud-backend` D1 database

### DbWriteQueue Durability Enhancement
To prevent in-memory queue loss on crash:
- Write queue state to a separate `queue-journal.jsonl` file (append-only)
- On startup, replay any unprocessed entries from the journal
- After successful SQLite flush, truncate the journal

## 3. Monitoring & Alerting

### Health Indicators
| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| WAL file size | > 50 MB | > 200 MB |
| Queue depth | > 500 entries | > 2000 entries |
| Checkpoint age | > 10 minutes | > 30 minutes |
| Backup age | > 1 hour | > 4 hours |

### Logging
```typescript
// Periodic WAL health log
const walPages = db.pragma('wal_checkpoint(PASSIVE)');
logger.info('WAL health', {
  busy: walPages[0].busy,
  log: walPages[0].log,
  checkpointed: walPages[0].checkpointed,
  dbSizeMB: fs.statSync(DB_PATH).size / (1024 * 1024),
});
```

## 4. Future Improvements
- **CRDT-based sync**: Replace the current queue with a CRDT (Conflict-free Replicated Data Type) for true multi-node resilience
- **SQLite replication**: Evaluate Litestream for continuous SQLite replication to S3/R2
- **Write-ahead journal**: Implement a proper WAL-of-WALs pattern where the DbWriteQueue writes to its own durable journal before batching to SQLite

## References
- [ADR-003: Offline-First Sync Protocol](file:///c:/Users/alamo/Desktop/ClickFlash/.agents/rules/adrs/ADR-003-offline-first-sync-protocol.md)
- [Finding ARCH-MED-001](file:///c:/Users/alamo/Desktop/ClickFlash/findings.md)
- [Architecture Rules](file:///c:/Users/alamo/Desktop/ClickFlash/.agents/rules/architecture.md)
