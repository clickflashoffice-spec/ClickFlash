# Management Hub Redeployment Checklist

## Pre-Deployment Verification

### 1. Code Quality
- [x] TypeScript compilation passes
- [x] ESLint checks pass
- [x] No console errors in development
- [x] All imports resolved correctly

### 2. New Files Created
- [x] `NewDashboard.tsx` - Modern dashboard with fleet overview
- [x] `FleetMonitorPage.tsx` - Master station monitoring
- [x] `SyncLogsPage.tsx` - Sync operation logs
- [x] `InventoryPage.tsx` - Multi-desk inventory management
- [x] `EquipmentPage.tsx` - Equipment tracking & maintenance
- [x] `fleetService.ts` - API service layer

### 3. Modified Files
- [x] `ManagementSidebar.tsx` - Added new navigation items
- [x] `ManagementLayout.tsx` - Added new view types and imports

## Build & Deploy

### Step 1: Build Management Hub
```bash
cd apps/management
npm run build
```

### Step 2: Verify Build Output
- [ ] `dist/` folder contains all assets
- [ ] No missing chunk errors
- [ ] Index.html properly generated

### Step 3: Deploy to Cloudflare Pages
```bash
cd apps/management
npm run deploy
# or
wrangler pages deploy dist
```

## Post-Deployment Verification

### Navigation
- [ ] Dashboard loads correctly
- [ ] Fleet Monitor accessible from sidebar
- [ ] Sync Logs accessible from sidebar
- [ ] Inventory accessible from sidebar (Operations section)
- [ ] Equipment accessible from sidebar (Operations section)

### Dashboard Page
- [ ] Statistics cards display correctly
- [ ] Fleet status visible
- [ ] Quick actions buttons work
- [ ] Recent activity section visible

### Fleet Monitor Page
- [ ] All 4 mock stations displayed
- [ ] Status badges color-coded correctly
- [ ] CPU/RAM/Disk bars visible
- [ ] Station selection works
- [ ] Details panel updates on selection
- [ ] Filter buttons work

### Sync Logs Page
- [ ] Operations table displays
- [ ] Status badges show correctly
- [ ] Expandable rows work
- [ ] Filters functional
- [ ] Export button present

### Inventory Page
- [ ] Inventory grid displays
- [ ] Stock bars show correct levels
- [ ] +/- buttons functional
- [ ] Filters work
- [ ] Statistics update

### Equipment Page
- [ ] Equipment cards display
- [ ] Status badges correct
- [ ] Modal opens on click
- [ ] Maintenance history visible
- [ ] Warranty warnings show

## API Integration (Future)

When ready to switch from mock data to real API:

1. **Uncomment API calls** in:
   - `FleetMonitorPage.tsx` - `fetchStations()`
   - `SyncLogsPage.tsx` - `fetchOperations()`
   - `InventoryPage.tsx` - `fetchInventory()`
   - `EquipmentPage.tsx` - `fetchEquipment()`

2. **Ensure Backend Endpoints Exist**:
   - `GET /api/cloud/fleet/stations`
   - `GET /api/cloud/sync/operations`
   - `GET /api/cloud/inventory`
   - `GET /api/cloud/equipment`
   - `POST /api/cloud/fleet/sync-all`
   - `POST /api/cloud/sync/operations/{id}/retry`
   - `PATCH /api/cloud/inventory/{id}/stock`

## Rollback Plan

If issues occur:
1. Revert `ManagementLayout.tsx` to use `ManagementDashboard` instead of `NewDashboard`
2. Remove new navigation items from `ManagementSidebar.tsx`
3. Redeploy previous version

## Support Contacts

- Technical Issues: Dev team
- UI/UX Feedback: Design team
- API Issues: Backend team
