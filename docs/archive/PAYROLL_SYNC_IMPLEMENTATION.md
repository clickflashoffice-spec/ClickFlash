# Payroll Sync Implementation

## Overview
Implemented payroll data synchronization from Master Station (local SQLite) to Management Hub (Cloud D1) for consolidated business reporting.

## Problem Statement
- Master Station calculates photographer payroll (commissions, bonuses, deductions) locally in SQLite `photographer_ledger` table
- Management Hub needs to display consolidated payroll across multiple Master stations
- The `sync_status` field existed but no sync mechanism was implemented

## Solution Architecture

### 1. Master Station Changes (`apps/master/backend/`)

#### `services/cloudSyncService.ts`
Added `syncLedgerEntries()` method:
- Queries pending ledger entries (`sync_status = 'pending'`)
- Converts entries to operation format for the Hub
- Sends to `/api/cloud/sync/operations` endpoint
- Updates local `sync_status` to 'synced' on success

Added `getLedgerStats()` method:
- Returns counts of pending/synced entries
- Lists recent pending entries for monitoring

Modified `sync()` to include payroll sync in parallel operations:
```typescript
await Promise.allSettled([
    this.syncOperationLogs(),
    this.syncLedgerEntries(),  // NEW: Payroll sync
    this.pullRemoteOperations(),
    this.pollPaidOrders(),
    this.syncRetentionStats(),
    ArchiveService.checkAndArchiveSyncCandidates(this.dbManager, this.logger)
]);
```

#### `routes/cloud.ts`
Added new API endpoints:
- `POST /api/cloud/sync/payroll` - Manual payroll sync trigger
- `GET /api/cloud/stats/payroll` - Get pending payroll sync stats

### 2. Management Hub (Already Configured)

#### `backend/src/services/recordService.ts`
`applyOperations()` method already handles ledger entries:
- Maps `photographer_ledger` table correctly
- Injects `desk_id` for multi-station isolation
- Stores `original_id` for idempotency

#### `backend/src/config.ts`
Table and column mappings already include:
```typescript
TABLE_MAP: {
    'photographer_ledger': 'photographer_ledger',
    // ...
}
ALLOWED_COLUMNS: {
    photographer_ledger: ['id', 'photographer_id', 'order_id', 'amount', 'currency', 
                         'type', 'rate_snapshot', 'description', 'desk_id', 
                         'original_id', 'created_at', 'updated_at'],
    // ...
}
```

#### `backend/schema.sql`
Schema already supports multi-desk aggregation:
```sql
CREATE TABLE IF NOT EXISTS photographer_ledger (
    id TEXT PRIMARY KEY,
    photographer_id INTEGER,
    order_id TEXT,
    amount REAL,
    currency TEXT,
    type TEXT,
    rate_snapshot REAL,
    description TEXT,
    desk_id TEXT,          -- For multi-station isolation
    original_id TEXT,      -- Idempotency
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Data Flow

```
Master Station (Local SQLite)
    │
    ├── Order Completed
    │   └── LedgerService.recordOrderCommission()
    │       └── INSERT INTO photographer_ledger (sync_status='pending')
    │
    └── Cloud Sync Cycle (every 60s)
        └── cloudSyncService.sync()
            └── syncLedgerEntries()
                ├── SELECT * FROM photographer_ledger WHERE sync_status='pending'
                │
                └── POST /api/cloud/sync/operations
                    └── { desk_id, operations: [...] }

Management Hub (Cloud D1)
    │
    └── POST /api/cloud/sync/operations
        └── recordService.applyOperations()
            ├── INSERT INTO photographer_ledger (with desk_id, original_id)
            └── UPDATE sync_sequences

Management Hub UI
    │
    └── PayrollPage
        ├── apiService.getUsers() → All photographers
        ├── apiService.getOrders() → All orders (cross-desk)
        └── apiService.getAdjustments() → All adjustments
            └── Calculates consolidated payroll per photographer per period
```

## API Endpoints

### Master Station
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cloud/sync/payroll` | POST | Trigger manual payroll sync |
| `/api/cloud/stats/payroll` | GET | Get pending payroll stats |

### Management Hub
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cloud/sync/operations` | POST | Receive operations from Master |
| `/api/collections/photographer_ledger/records` | GET | Query ledger entries |

## Payroll Calculation (Management Hub)

The PayrollPage calculates:

1. **Base Pay**: For Salary photographers
   - `monthlySalary` from user record
   
2. **Commission**: For Commission photographers  
   - `totalSales * commissionRate`
   
3. **Adjustments**: From `photographer_ledger` table
   - Bonuses (positive amounts)
   - Deductions (negative amounts)
   
4. **Total Pay**: `basePay + commissionPay + adjustmentsTotal`

## Security & Isolation

1. **desk_id Isolation**: Each record tagged with originating Master station
2. **original_id**: Prevents duplicate entries from same Master
3. **JWT Authentication**: All sync requests authenticated
4. **Vector Clock**: Sequence tracking for conflict resolution

## Monitoring

### Master Station Logs
```
[CloudSync] Syncing 5 ledger entries to Cloud Hub (Desk: MASTER_01)...
[CloudSync] Successfully synced 5 ledger entries to Hub.
```

### Fleet Monitor
- Shows Master station online/offline status
- Sync queue status

### Sync Log Viewer
- Real-time sync events
- Error tracking

## Testing

1. **Create Order** on Master Station → Commission calculated locally
2. **Trigger Sync** → Ledger entry pushed to Cloud
3. **Check Management Hub** → Payroll shows updated commission
4. **Verify desk_id** → Entry tagged with correct Master station

## Future Enhancements

1. **Bi-directional Sync**: Pull payroll adjustments from Hub to Master
2. **Real-time Sync**: WebSocket-based instant sync for critical entries
3. **Conflict Resolution**: UI for resolving sync conflicts
4. **Audit Trail**: Complete history of payroll changes per photographer
