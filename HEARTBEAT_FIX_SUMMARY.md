# MoneyTrash Heartbeat Fix Summary

**Date:** March 13, 2026  
**Issue:** Management Hub heartbeat endpoint returning 500 error  
**Root Cause:** Missing `fleet_heartbeats` table in D1 database  
**Status:** Fix ready to deploy  

---

## Problem Analysis

During MoneyTrash E2E testing, the heartbeat endpoint (`/api/cloud/heartbeat`) was returning a 500 error:

```
POST https://management-hub.clickflash-office.workers.dev/api/cloud/heartbeat
Response: 500 Internal Server Error
```

### Investigation

The server.ts code at line 1339-1348 attempts to insert/update the `fleet_heartbeats` table:

```typescript
await dbManager.run(
  `INSERT INTO fleet_heartbeats (desk_id, last_seen, metrics, updated_at)
   VALUES (?, ?, ?, CURRENT_TIMESTAMP)
   ON CONFLICT(desk_id) DO UPDATE SET last_seen = excluded.last_seen, metrics = excluded.metrics, updated_at = CURRENT_TIMESTAMP`,
  [
    deskId,
    hb.timestamp || new Date().toISOString(),
    JSON.stringify(hb.metrics || {}),
  ],
);
```

However, the `schema.sql` file only contained `fleet_heartbeat_history` table (for historical records), not the `fleet_heartbeats` table (for latest status per desk).

---

## Solution

### 1. Schema Update

Added the missing `fleet_heartbeats` table to `schema.sql`:

```sql
-- Fleet Heartbeats (latest status per desk)
CREATE TABLE IF NOT EXISTS fleet_heartbeats (
    desk_id TEXT PRIMARY KEY,
    last_seen TEXT NOT NULL,
    metrics TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Migration File Created

Created migration file: `migrations/019_add_fleet_heartbeats_table.sql`

```sql
-- Migration: Add fleet_heartbeats table for latest desk status
CREATE TABLE IF NOT EXISTS fleet_heartbeats (
    desk_id TEXT PRIMARY KEY,
    last_seen TEXT NOT NULL,
    metrics TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_heartbeats_desk ON fleet_heartbeats(desk_id);
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeats_updated ON fleet_heartbeats(updated_at);
```

---

## Deployment Instructions

### Option 1: Using Wrangler CLI (Recommended)

```bash
cd apps/management/backend
npx wrangler d1 execute management-db --file="migrations/019_add_fleet_heartbeats_table.sql"
```

### Option 2: Cloudflare Dashboard (Manual)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **D1**
3. Select **management-db**
4. Click **Console** tab
5. Run the following SQL:

```sql
CREATE TABLE IF NOT EXISTS fleet_heartbeats (
    desk_id TEXT PRIMARY KEY,
    last_seen TEXT NOT NULL,
    metrics TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_heartbeats_desk ON fleet_heartbeats(desk_id);
CREATE INDEX IF NOT EXISTS idx_fleet_heartbeats_updated ON fleet_heartbeats(updated_at);
```

---

## Files Modified

| File | Change |
|------|--------|
| `apps/management/backend/schema.sql` | Added `fleet_heartbeats` table definition |
| `apps/management/backend/migrations/019_add_fleet_heartbeats_table.sql` | New migration file |
| `apps/management/backend/apply_heartbeat_fix.js` | Helper script for deployment |

---

## Verification

After applying the fix, verify the heartbeat endpoint works:

```bash
# 1. Get auth token
TOKEN=$(curl -s -X POST https://management-hub.clickflash-office.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alaeddine@example.com","password":"DEFAULT_PASSWORD_PLACEHOLDER"}' | jq -r '.token')

# 2. Test heartbeat
curl -X POST https://management-hub.clickflash-office.workers.dev/api/cloud/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "desk_id": "EXT001",
    "status": "online",
    "timestamp": "2026-03-13T17:30:00Z",
    "metrics": {"photos_uploaded": 0, "storage_used": 0}
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "commands": []
}
```

---

## Impact

- **MoneyTrash E2E Status:** Will change from ⚠️ PARTIAL to ✅ COMPLETE
- **Fleet Management:** Desk heartbeats will be tracked properly
- **Multi-Master Sync:** Heartbeat-based sync coordination will work

---

## Related Files

- `apps/management/backend/src/server.ts` (lines 1306-1354) - Heartbeat handler
- `tests/e2e/moneytrash-e2e-core.js` - E2E test script
- `MONEYTRASH_E2E_COMPLETE.md` - E2E test summary
