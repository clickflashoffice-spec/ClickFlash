# ClickFlash Ecosystem - Pre-Redeployment Checklist

## Critical Items to Verify Before Deployment

### 1. Code Quality & Builds
- [x] Management Hub lint passes
- [ ] Gallery lint issues (minor - eslint not found)
- [ ] Master App build verification
- [ ] Touch Kiosk build verification
- [ ] MoneyTrash build verification
- [ ] Website build verification

### 2. Database Schema Updates Required

#### Management Hub D1 Database
```sql
-- Check if these tables exist:
-- 1. fleet_heartbeat_history (for fleet monitoring)
-- 2. inventory (for inventory management)
-- 3. equipment (for equipment tracking)
-- 4. sync_operations (for sync logs)
-- 5. sync_conflicts (already exists from batch sync)
```

**Migration Files to Apply:**
- [ ] `apps/management/backend/migrations/010_add_inventory_and_equipment.sql`
- [ ] `apps/management/backend/migrations/011_multimaster_compatibility.sql`
- [ ] `apps/management/backend/migrations/012_add_conflict_logging.sql`

#### Master App SQLite
- [ ] Migration 052_add_sync_columns.sql
- [ ] Migration 053_add_order_sync_status.sql

### 3. API Endpoints Status

#### Existing Endpoints (Working)
- [x] `POST /api/cloud/sync-order` - Order sync
- [x] `POST /api/cloud/sync/batch` - Batch sync
- [x] `GET /api/cloud/poll-orders` - Order polling
- [x] `POST /api/cloud/upload-photo` - Photo upload
- [x] `POST /api/kiosks/heartbeat` - Kiosk heartbeat
- [x] `POST /api/masters/heartbeat` - Master heartbeat
- [x] `GET /api/masters/status` - Master status
- [x] `GET /api/system/health/all` - System health

#### NEW Endpoints Needed for UI
The new Management Hub UI expects these endpoints (currently using mock data):

**Fleet Monitor:**
- [ ] `GET /api/cloud/fleet/stations` - Get all stations with metrics
- [ ] `GET /api/cloud/fleet/stations/:id` - Get specific station
- [ ] `POST /api/cloud/fleet/stations/:id/sync` - Force sync single station
- [ ] `POST /api/cloud/fleet/sync-all` - Force sync all stations

**Sync Logs:**
- [ ] `GET /api/cloud/sync/operations` - Get sync operations with filters
- [ ] `POST /api/cloud/sync/operations/:id/retry` - Retry failed operation

**Inventory:**
- [ ] `GET /api/cloud/inventory` - Get inventory items
- [ ] `PATCH /api/cloud/inventory/:id/stock` - Update stock level
- [ ] `POST /api/cloud/inventory` - Create new inventory item

**Equipment:**
- [ ] `GET /api/cloud/equipment` - Get equipment list
- [ ] `POST /api/cloud/equipment` - Create new equipment
- [ ] `PATCH /api/cloud/equipment/:id/status` - Update equipment status
- [ ] `POST /api/cloud/equipment/:id/maintenance` - Add maintenance record

### 4. Environment Variables

#### Management Hub (.env)
```env
VITE_APP_URL=https://management.clickflash.app
VITE_API_URL=https://management-hub.clickflash.workers.dev/api
VITE_WS_URL=wss://management-hub.clickflash.workers.dev
```

#### Master App (.env)
```env
CLOUD_SYNC_ENABLED=true
MANAGEMENT_HUB_URL=https://management-hub.clickflash.workers.dev
GALLERY_URL=https://gallery.clickflash.app
```

### 5. Cloudflare Configuration

#### Workers
- [ ] Management Hub Worker deployed
- [ ] Gallery Worker deployed
- [ ] D1 Database bound to Management Hub
- [ ] R2 Bucket bound for photo storage

#### Pages
- [ ] Management Hub frontend deployed
- [ ] Gallery frontend deployed
- [ ] Website deployed

### 6. Critical Testing Checklist

#### Management Hub
- [ ] Dashboard loads with new UI
- [ ] Fleet Monitor shows stations (using mock data initially)
- [ ] Sync Logs display operations
- [ ] Inventory page loads
- [ ] Equipment page loads
- [ ] Navigation between pages works

#### Master App
- [ ] Cloud sync enabled
- [ ] Orders sync to Management Hub
- [ ] Photos sync to Gallery
- [ ] Heartbeat sent every 60s

#### Gallery
- [ ] Customer login works
- [ ] Photo display works
- [ ] Order placement works

#### Touch Kiosk
- [ ] Syncs orders to Master
- [ ] Photos upload correctly

### 7. Deployment Order

**Phase 1: Backend First**
1. Apply D1 database migrations
2. Deploy Management Hub Worker with new routes
3. Deploy Gallery Worker

**Phase 2: Frontend**
4. Build and deploy Management Hub frontend
5. Build and deploy Gallery frontend
6. Build and deploy Website

**Phase 3: Desktop Apps**
7. Build Master App installers
8. Build Touch Kiosk installers
9. Build MoneyTrash (if needed)

### 8. Rollback Plan

If issues occur:
1. Revert Management Hub to previous version
2. Switch NewDashboard back to ManagementDashboard
3. Remove new sidebar navigation items
4. Revert wrangler.toml if needed

### 9. Post-Deployment Verification

- [ ] All apps accessible
- [ ] Login works on all portals
- [ ] Data sync working (orders, photos)
- [ ] Fleet status visible
- [ ] No 500 errors in logs

## Immediate Actions Required

### Before Deployment:

1. **Add API Routes** to `apps/management/backend/server.js`:
```javascript
// Add these route handlers for new UI
app.get('/api/cloud/fleet/stations', ...);
app.get('/api/cloud/sync/operations', ...);
app.get('/api/cloud/inventory', ...);
app.get('/api/cloud/equipment', ...);
```

2. **Apply Database Migrations**:
```bash
cd apps/management/backend
wrangler d1 execute management-db --file=migrations/010_add_inventory_and_equipment.sql
```

3. **Test Build**:
```bash
cd apps/management
npm run build
```

## Decision Point

You have two options:

### Option A: Deploy with Mock Data (Recommended for now)
- Deploy the UI as-is with mock data
- API endpoints can be added later
- Users see the new interface immediately
- Lower risk

### Option B: Implement APIs First
- Create all backend endpoints first
- Test with real data
- Then deploy UI
- Higher effort but complete solution

**My Recommendation: Option A**
Deploy now with mock data - the UI is ready and provides value immediately. The API integration can be done incrementally.

## Files Changed Summary

### New Files (Need to be committed):
- `apps/management/src/components/management/NewDashboard.tsx`
- `apps/management/src/components/management/FleetMonitorPage.tsx`
- `apps/management/src/components/management/SyncLogsPage.tsx`
- `apps/management/src/components/management/InventoryPage.tsx`
- `apps/management/src/components/management/EquipmentPage.tsx`
- `apps/management/src/services/fleetService.ts`

### Modified Files:
- `apps/management/src/components/management/ManagementLayout.tsx`
- `apps/management/src/components/management/ManagementSidebar.tsx`

### Deleted Files (Intentional cleanup):
- `apps/mobile/*` - Removed mobile app
- `apps/delivery-app/*` - Removed delivery app
