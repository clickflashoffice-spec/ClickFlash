# Phase 95: Main Version Testing & Validation - Implementation Plan

## Overview
This phase focuses on end-to-end testing and validation of the Master Station → Management Hub → Gallery sync pipeline. We verify that data flows correctly from the local Master Station to the cloud-based Management Hub and becomes accessible in the Customer Gallery.

## Architecture Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYNC PIPELINE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐      Cloud Sync Service      ┌──────────────────┐     │
│  │  MASTER STATION  │  ─────────────────────────►  │  MANAGEMENT HUB  │     │
│  │  Port: 8090      │   POST /api/cloud/sync/...   │  Cloudflare D1   │     │
│  │  SQLite          │                              │  R2 Storage      │     │
│  └──────────────────┘                              └────────┬─────────┘     │
│         │                                                   │               │
│         │ Operation Logs (pending → synced)                 │               │
│         │ Heartbeat & Analytics                             │               │
│         │ Orders, Photos, Albums                            │               │
│         │                                                   │               │
│         ▼                                                   ▼               │
│  ┌──────────────────┐                              ┌──────────────────┐     │
│  │  LOCAL FEATURES  │                              │  CUSTOMER GALLERY│     │
│  │  • Face Search   │                              │  Port: 5174      │     │
│  │  • Culling       │                              │  React + Vite    │     │
│  │  • Touch Sync    │                              │                  │     │
│  └──────────────────┘                              └──────────────────┘     │
│                                                              │               │
│                                                              │ Order Lookup  │
│                                                              │ by PIN/Email  │
│                                                              ▼               │
│                                                     ┌──────────────────┐     │
│                                                     │  ORDER ACCESS    │     │
│                                                     │  /api/orders/... │     │
│                                                     └──────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Tasks

### Task 1: Environment Configuration [.env.test_master]
**Status:** [x] Completed

Create environment file for local E2E testing that points to the staging/local Management Hub.

**File:** `.env.test_master`

```bash
# Phase 95: Test Environment for Master Station
NODE_ENV=test
PORT=8090

# Cloud Sync Configuration (Point to local/staging Hub)
CLOUD_API_URL=http://localhost:8787
# For production testing, use: https://management.clickflash-office.workers.dev

CLOUD_GALLERY_URL=http://localhost:5174
# For production testing, use: https://gallery.clickflash-office.workers.dev

# Test Desk Credentials
CLOUD_EMAIL=test-desk@clickflash.ai
CLOUD_PASSWORD=test_password_123
DESK_ID=TEST_DESK_01

# Database Configuration
DATA_DIR=./pb_data_test
DB_FILE=./pb_data_test/master.db

# JWT & Security (Test Keys)
JWT_SECRET=test_jwt_secret_for_phase_95_not_for_production
SESSION_SECRET=test_session_secret_for_phase_95_not_for_production
BCRYPT_ROUNDS=10

# Cloud Sync Settings
SYNC_INTERVAL_MS=60000
SYNC_ENABLED=true
SYNC_RETENTION_DAYS=7

# Test Data Configuration
TEST_ALBUM_ID=album-test-001
TEST_ORDER_ID=order-test-001
TEST_PHOTO_COUNT=5
TEST_CUSTOMER_EMAIL=test-customer@clickflash.ai
TEST_ACCESS_PIN=123456

# Email Configuration (Mock/Test)
EMAIL_ENABLED=false
EMAIL_RELAY_URL=http://localhost:8787/api/email/relay

# Feature Flags
ENABLE_FACE_SEARCH=true
ENABLE_CULLING=true
ENABLE_CLOUD_SYNC=true
ENABLE_ANALYTICS=true

# Logging
LOG_LEVEL=debug
LOG_TO_FILE=true
LOGS_DIR=./pb_data_test/logs
```

---

### Task 2: Hub Route Refactor (Master Sync Compatibility)
**Status:** [/] In Progress

The Management Hub (`apps/management/backend/src/server.ts`) already implements the necessary sync routes. We need to verify compatibility and document any needed adjustments.

#### Existing Hub Routes (Verified):

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/cloud/sync/operations` | POST | Receive operation logs from Master | ✅ Implemented |
| `/api/cloud/sync/operations` | GET | Send remote operations to Master | ✅ Implemented |
| `/api/cloud/heartbeat` | POST | Receive fleet heartbeat | ✅ Implemented |
| `/api/cloud/fleet` | GET | Get fleet status | ✅ Implemented |
| `/api/analytics/daily-audit` | POST | Receive daily analytics | ✅ Implemented |
| `/api/settings/upsert` | POST | Update settings | ✅ Implemented |
| `/api/auth/login` | POST | Authenticate Master station | ✅ Implemented |
| `/api/orders/by-credentials` | GET | Gallery order lookup | ✅ Implemented |
| `/api/orders/by-token` | GET | Magic link order lookup | ✅ Implemented |
| `/api/orders/by-room` | GET | Room number order lookup | ✅ Implemented |

#### Verified Sync Flow:

1. **Master Authentication** (cloudSyncService.ts:364-409)
   - POST to `/api/auth/login` with email, password, machine_id
   - Receives JWT token for subsequent requests
   - Hardware fingerprinting enforced

2. **Operation Log Sync** (cloudSyncService.ts:449-515)
   - Master queries `operation_logs` table for pending records
   - POST to `/api/cloud/sync/operations` with batch
   - Hub applies operations via `RecordService.applyOperations()`
   - Master marks processed IDs as 'synced'

3. **Bi-directional Pull** (cloudSyncService.ts:968-1000)
   - Master GET from `/api/cloud/sync/operations?since_hub_index={n}`
   - Receives operations from OTHER desks
   - Applies via `applyRemoteOperations()`

4. **Heartbeat** (cloudSyncService.ts:870-963)
   - POST to `/api/cloud/heartbeat` with metrics
   - Includes: orders_today, photos_today, pending_sync, system health

#### Refactor Requirements: NONE
The existing implementation is compatible. No code changes required.

---

### Task 3: Seed Master Station with Test Data
**Status:** [ ] Pending

Create a comprehensive seed script that populates the Master Station with test data for E2E validation.

**File:** `scripts/seed-phase95-test-data.ts`

The seed script creates:
- 1 Test Album (with categories)
- 1 Test Order (with items, access PIN)
- 5 Test Photos (linked to album)
- 1 Test Customer
- Operation logs marked as 'pending' for sync testing

**Data Structure:**
```typescript
Test Data Package:
├── Album: "Phase 95 Test Album"
│   ├── id: "album-phase95-001"
│   ├── status: "Finalized"
│   ├── categories: ["Beach", "Portrait"]
│   └── photographerId: "photog-test-001"
│
├── Photos (5):
│   ├── id: "photo-phase95-00{1-5}"
│   ├── albumId: "album-phase95-001"
│   ├── sync_status: "pending"
│   └── metadata: { width, height, fileSize }
│
├── Order:
│   ├── id: "order-phase95-001"
│   ├── albumId: "album-phase95-001"
│   ├── customerEmail: "test-customer@clickflash.ai"
│   ├── access_pin: "123456"
│   ├── status: "Completed"
│   ├── total: 45.00
│   └── items: [photo references]
│
└── Operation Logs:
    ├── INSERT album
    ├── INSERT photos (×5)
    └── INSERT order
```

---

### Task 4: Trigger and Verify Order Sync to Hub
**Status:** [ ] Pending

Manual and automated verification steps for order synchronization.

#### Manual Steps:

1. **Start Master Station with test environment:**
   ```bash
   cp .env.test_master .env
   cd apps/master
   npm run dev:backend
   ```

2. **Trigger manual sync:**
   ```bash
   curl -X POST http://localhost:8090/api/cloud/sync \
     -H "Authorization: Bearer <token>"
   ```

3. **Verify sync in Hub database:**
   ```sql
   -- Query D1 database
   SELECT * FROM orders WHERE desk_id = 'TEST_DESK_01';
   SELECT * FROM operation_logs WHERE desk_id = 'TEST_DESK_01';
   ```

#### Automated Verification Script:
**File:** `scripts/verify-order-sync.ts`

Checks:
- Master operation_logs marked as 'synced'
- Hub orders table contains test order
- Order items JSON parsed correctly
- access_pin matches
- Hub sequence counter incremented

---

### Task 5: Trigger and Verify Photo Upload to Gallery
**Status:** [ ] Pending

Photos flow through the sync pipeline in two stages:
1. Photo metadata syncs via operation logs (→ D1)
2. Photo files upload to R2 storage (direct or via retention batch)

#### Verification Steps:

1. **Verify photo metadata in Hub:**
   ```sql
   SELECT * FROM photos WHERE desk_id = 'TEST_DESK_01';
   ```

2. **Verify R2 storage:**
   ```bash
   # Using wrangler
   wrangler r2 objects list gallery-bucket --prefix="TEST_DESK_01/"
   ```

3. **Test gallery access:**
   ```bash
   curl "http://localhost:8787/api/orders/by-credentials?pin=123456&email=test-customer@clickflash.ai"
   ```

---

### Task 6: End-to-End Verification (Management UI / Gallery UI)
**Status:** [ ] Pending

Final validation using actual UI components.

#### Management Hub UI Verification:

1. **Fleet Monitor:**
   - Navigate to: http://localhost:5173/fleet
   - Verify TEST_DESK_01 appears in station list
   - Check heartbeat timestamp is recent
   - Verify metrics: orders_today, photos_today

2. **Orders List:**
   - Navigate to: http://localhost:5173/orders
   - Filter by desk_id = TEST_DESK_01
   - Verify test order appears with correct total ($45.00)
   - Check customer email: test-customer@clickflash.ai

3. **Location Audits (Phase 70):**
   - Navigate to: http://localhost:5173/analytics/audits
   - Select today's date
   - Verify photographer metrics appear
   - Check AI-generated audit description

#### Customer Gallery UI Verification:

1. **Order Login:**
   - Navigate to: http://localhost:5174
   - Enter Order ID: order-phase95-001
   - Enter Email: test-customer@clickflash.ai
   - Or use PIN: 123456

2. **Gallery View:**
   - Verify album photos display
   - Check photo count matches (5 photos)
   - Test download functionality

3. **Magic Link Flow:**
   - Generate magic link token
   - Access via: http://localhost:5174/gallery?token=<token>
   - Verify direct access works

---

## Test Execution Checklist

### Pre-Flight Checks
- [ ] Master Station runs on port 8090
- [ ] Management Hub runs on port 8787 (or deployed URL)
- [ ] Customer Gallery runs on port 5174
- [ ] `.env.test_master` copied to `apps/master/.env`
- [ ] Test database directory created (`mkdir -p pb_data_test`)

### Data Seeding
- [ ] Run seed script: `npx ts-node scripts/seed-phase95-test-data.ts`
- [ ] Verify album created in local SQLite
- [ ] Verify photos created with sync_status='pending'
- [ ] Verify order created with access_pin
- [ ] Verify operation_logs created for all entities

### Sync Verification
- [ ] Trigger cloud sync via API
- [ ] Check Master logs for sync success
- [ ] Query Hub D1 for synced records
- [ ] Verify operation_logs marked 'synced' in Master

### UI Verification
- [ ] Fleet Monitor shows TEST_DESK_01
- [ ] Orders list shows test order
- [ ] Gallery login works with PIN
- [ ] Gallery displays photos correctly

### Cleanup
- [ ] Optional: Run `scripts/cleanup-phase95-test-data.ts`
- [ ] Remove test records from Hub
- [ ] Clear test photos from R2

---

## Artifacts Created

| File | Purpose |
|------|---------|
| `.env.test_master` | Environment configuration for testing |
| `scripts/seed-phase95-test-data.ts` | Seed test data into Master |
| `scripts/verify-order-sync.ts` | Automated sync verification |
| `scripts/verify-photo-upload.ts` | Photo sync verification |
| `scripts/cleanup-phase95-test-data.ts` | Test data cleanup |
| `PHASE_95_IMPLEMENTATION_PLAN.md` | This document |

---

## Success Criteria

✅ **PASS** Criteria:
1. Master Station syncs operation logs to Hub within 60 seconds
2. Hub D1 contains all test records with correct desk_id
3. Fleet Monitor displays TEST_DESK_01 with recent heartbeat
4. Customer Gallery allows login with test PIN (123456)
5. Gallery displays all 5 test photos
6. Order total and items match expected values

❌ **FAIL** Criteria:
- Any sync operation throws error
- Records missing from Hub after sync
- UI fails to display test data
- Authentication errors during sync

---

## Next Steps

After Phase 95 completion:
1. Document any sync latency issues
2. File bug reports for any failed verifications
3. Update CI/CD with E2E sync tests
4. Proceed to Phase 96: Production Deployment Prep

---

**Version:** 1.0  
**Last Updated:** 2026-03-13  
**Owner:** ClickFlash Dev Team
