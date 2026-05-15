# Phase 95: End-to-End Verification Guide

Complete guide for manually verifying the Master → Hub → Gallery sync pipeline.

## Prerequisites

1. **Master Station** running on port 8090
2. **Management Hub** running on port 8787 (or deployed Cloudflare Worker)
3. **Customer Gallery** running on port 5174
4. **Test data** seeded using `scripts/seed-phase95-test-data.ts`

## Quick Start

```bash
# 1. Seed test data
cd scripts
npx ts-node seed-phase95-test-data.ts

# 2. Start services (in separate terminals)
cd apps/master && npm run dev:backend      # Port 8090
cd apps/management && npm run dev          # Port 5173 + 8787
cd apps/gallery && npm run dev             # Port 5174

# 3. Trigger sync
curl -X POST http://localhost:8090/api/cloud/sync

# 4. Verify
curl "http://localhost:8787/api/orders/by-credentials?pin=123456&email=test-customer@clickflash.ai"
```

---

## Step-by-Step Verification

### Step 1: Verify Test Data in Master

**URL:** Direct database query or API

```bash
# Check albums
curl http://localhost:8090/api/collections/albums/records

# Check photos
curl http://localhost:8090/api/collections/photos/records

# Check orders
curl http://localhost:8090/api/collections/orders/records
```

**Expected Result:**
- Album: `album-phase95-001` with status "Finalized"
- 5 photos with albumId `album-phase95-001`
- Order: `order-phase95-001` with total $45.00

---

### Step 2: Trigger Cloud Sync

**Method A: Via API**
```bash
curl -X POST http://localhost:8090/api/cloud/sync
```

**Method B: Automatic**
Wait 60 seconds for the sync interval to trigger.

**Verify Sync Status:**
```bash
curl http://localhost:8090/api/cloud/stats
```

**Expected Result:**
```json
{
  "isConnected": true,
  "lastSuccessfulSync": "2026-03-13T12:34:56.789Z",
  "pendingOperations": 0
}
```

---

### Step 3: Verify in Management Hub

#### 3.1 Fleet Monitor

**URL:** http://localhost:5173/fleet

**What to Check:**
- [ ] Station `TEST_DESK_01` appears in the list
- [ ] Status shows "Online" or "Active"
- [ ] Last seen timestamp is recent (< 5 minutes)
- [ ] Metrics show:
  - Orders today: ≥ 1
  - Photos today: ≥ 5
  - Sync status: "idle" or "synced"

**Screenshot Check:**
```
┌─────────────────────────────────────────────────────────┐
│ Fleet Monitor                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────────┬────────┬─────────┬──────────────────┐ │
│ │ Station      │ Status │ Orders  │ Photos           │ │
│ ├──────────────┼────────┼─────────┼──────────────────┤ │
│ │ TEST_DESK_01 │ Online │ 1       │ 5                │ │
│ │              │        │ today   │ today            │ │
│ └──────────────┴────────┴─────────┴──────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 3.2 Orders List

**URL:** http://localhost:5173/orders

**What to Check:**
- [ ] Order `order-phase95-001` appears in list
- [ ] Customer: "Test Customer"
- [ ] Email: test-customer@clickflash.ai
- [ ] Total: $45.00
- [ ] Status: "Completed"
- [ ] Desk: TEST_DESK_01

#### 3.3 Direct API Verification

```bash
# Authenticate
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-desk@clickflash.ai",
    "password": "test_password_123",
    "machine_id": "test-machine"
  }'

# Use token to query orders
curl http://localhost:8787/api/collections/orders/records \
  -H "Authorization: Bearer <TOKEN>"
```

---

### Step 4: Verify in Customer Gallery

#### 4.1 Gallery Login

**URL:** http://localhost:5174

**Login Method A: PIN + Email**
- Order ID: `order-phase95-001`
- Email: `test-customer@clickflash.ai`
- Or use PIN: `123456`

**Login Method B: Magic Link**
```bash
# Generate magic link (from Master)
curl http://localhost:8090/api/galleryAuth/magic-link \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-phase95-001"}'
```

#### 4.2 Gallery View Verification

**What to Check:**
- [ ] Album displays with correct title
- [ ] All 5 photos are visible
- [ ] Photo thumbnails load correctly
- [ ] Photo metadata shows (if enabled)
- [ ] Download button works (if applicable)

---

### Step 5: Automated Verification

Run the verification scripts:

```bash
# Verify order sync
cd scripts
npx ts-node verify-order-sync.ts

# Verify photo upload
npx ts-node verify-photo-upload.ts
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════════╗
║                  VERIFICATION RESULTS                          ║
╚════════════════════════════════════════════════════════════════╝

✅ Master has test order
   Found order order-phase95-001

✅ Operation logs synced
   All operation logs marked as synced

✅ Hub has test order
   Found order order-phase95-001 in Hub

✅ Order ID matches
   ID: order-phase95-001 ✓

...

🎉 All verifications passed! Order sync is working correctly.
```

---

## Troubleshooting

### Issue: Sync not working

**Symptoms:**
- Operation logs remain "pending"
- Hub doesn't show test data

**Diagnostic Steps:**

1. Check Master logs for sync errors:
   ```bash
   tail -f pb_data_test/logs/*.log
   ```

2. Verify cloud credentials:
   ```bash
   curl http://localhost:8090/api/cloud/status
   ```

3. Test Hub connectivity:
   ```bash
   curl http://localhost:8787/api/health
   ```

4. Check authentication:
   ```bash
   curl -X POST http://localhost:8787/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test-desk@clickflash.ai",
       "password": "test_password_123"
     }'
   ```

**Common Fixes:**
- Ensure `.env.test_master` is copied to `apps/master/.env`
- Verify Hub URL is correct (localhost:8787 for local, workers.dev for prod)
- Check that desk is registered in Hub (use `/api/auth/register-desk`)

---

### Issue: Order not found in Gallery

**Symptoms:**
- Gallery login fails with "Order not found"
- Order exists in Hub but not accessible

**Diagnostic Steps:**

1. Verify order in Hub directly:
   ```bash
   curl "http://localhost:8787/api/orders/by-credentials?pin=123456&email=test-customer@clickflash.ai"
   ```

2. Check order has required fields:
   - `access_pin`
   - `email`
   - `status` = "Completed" or "Paid"

3. Verify desk_id isolation isn't filtering the order

---

### Issue: Photos not displaying

**Symptoms:**
- Gallery shows order but no photos
- Photo thumbnails broken

**Diagnostic Steps:**

1. Check photo records in Hub:
   ```bash
   curl http://localhost:8787/api/collections/photos/records \
     -H "Authorization: Bearer <TOKEN>"
   ```

2. Verify order items JSON contains photo references:
   ```bash
   curl "http://localhost:8787/api/orders/by-credentials?pin=123456&email=test-customer@clickflash.ai" | jq '.items'
   ```

3. Check R2 storage (if applicable):
   ```bash
   wrangler r2 objects list gallery-bucket --prefix="TEST_DESK_01/"
   ```

---

## Cleanup

After testing is complete:

```bash
# Automated cleanup
cd scripts
npx ts-node cleanup-phase95-test-data.ts

# Or manual cleanup
curl -X DELETE http://localhost:8787/api/collections/orders/records/order-phase95-001 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## Success Criteria Checklist

| # | Criteria | Status |
|---|----------|--------|
| 1 | Master Station syncs operation logs to Hub | ☐ |
| 2 | Hub D1 contains test records with correct desk_id | ☐ |
| 3 | Fleet Monitor displays TEST_DESK_01 | ☐ |
| 4 | Heartbeat timestamp is recent | ☐ |
| 5 | Customer Gallery allows login with PIN 123456 | ☐ |
| 6 | Gallery displays all 5 test photos | ☐ |
| 7 | Order total ($45.00) matches expected value | ☐ |
| 8 | Automated verification scripts pass | ☐ |

**Phase 95 Complete:** All 8 criteria must pass ☐

---

## Appendix: API Reference

### Master Station APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cloud/sync` | POST | Trigger manual sync |
| `/api/cloud/stats` | GET | Get sync status |
| `/api/collections/albums/records` | GET | List albums |
| `/api/collections/photos/records` | GET | List photos |
| `/api/collections/orders/records` | GET | List orders |

### Management Hub APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Authenticate |
| `/api/cloud/sync/operations` | POST | Receive operation logs |
| `/api/cloud/fleet` | GET | Get fleet status |
| `/api/orders/by-credentials` | GET | Gallery order lookup |
| `/api/collections/orders/records` | GET | List orders (authenticated) |
| `/api/collections/photos/records` | GET | List photos (authenticated) |

---

**Version:** 1.0  
**Last Updated:** 2026-03-13
