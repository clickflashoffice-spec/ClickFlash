# ClickFlash Multi-Master Cloud Deployment Checklist

## Pre-Deployment Checklist

### 1. Code Verification ✅

- [ ] All sync methods implemented (Ledger, Expenses, Inventory, Orders)
- [ ] MoneyTrash upload fixed (field names corrected)
- [ ] Configuration system tested
- [ ] Architecture documentation updated
- [ ] No console.log statements in production code
- [ ] All TODOs resolved or documented

### 2. Database Migrations ✅

**Master Station Migrations**:
- [ ] `052_add_sync_columns.sql` - Expenses/Inventory sync columns
- [ ] `053_add_order_sync_status.sql` - Order sync tracking

**Management Hub Schema**:
- [ ] `expenses` table with desk_id
- [ ] `fleet_heartbeat_history` table
- [ ] `inventory` table with desk_id
- [ ] `equipment` table with sync columns

### 3. Environment Configuration ✅

**Management Hub (.env)**:
```bash
JWT_SECRET=<generated>
D1_DATABASE_ID=<your-d1-id>
R2_BUCKET_NAME=<your-r2-bucket>
```

**Master Station (.env)**:
```bash
DESK_ID=<unique-id>
CLOUD_API_URL=<hub-url>
CLOUD_EMAIL=<admin-email>
CLOUD_PASSWORD=<admin-password>
```

### 4. Cloudflare Resources ✅

- [ ] D1 Database created
- [ ] Workers deployed (Management Hub)
- [ ] Pages deployed (Customer Gallery)
- [ ] R2 Bucket created (optional)
- [ ] Custom domains configured (optional)

---

## Deployment Steps

### Phase 1: Cloud Infrastructure (30 mins)

#### 1.1 Deploy Management Hub

```bash
cd apps/management/backend

# Install dependencies
npm install

# Deploy to Cloudflare
wrangler deploy

# Verify deployment
curl https://your-hub.pages.dev/api/health
```

**Expected Response**:
```json
{"status": "ok", "timestamp": "2026-02-21T..."}
```

#### 1.2 Deploy Customer Gallery

```bash
cd apps/gallery/backend

# Deploy to Cloudflare
wrangler deploy

# Verify deployment
curl https://your-gallery.pages.dev/api/health
```

#### 1.3 Initialize D1 Database

```bash
# Create database (if not exists)
wrangler d1 create clickflash-hub

# Apply schema
wrangler d1 execute clickflash-hub --file=schema.sql

# Verify tables
wrangler d1 execute clickflash-hub --command="SELECT name FROM sqlite_master WHERE type='table'"
```

#### 1.4 Create Admin User in Hub

```sql
-- In D1 console
INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@yourdomain.com', '<hashed-password>', 'Admin');
```

---

### Phase 2: First Master Station (45 mins)

#### 2.1 Prepare Master Installation

```bash
# Clone repository
git clone https://github.com/yourorg/clickflash.git
cd clickflash/apps/master

# Install dependencies
npm install
```

#### 2.2 Run Setup Wizard

```bash
cd backend
node setup/cloud-setup-wizard.js

# Or automated
./setup/setup-master.sh MASTER_01 "Station Name" "Location"
```

#### 2.3 Run Migrations

```bash
# SQLite should be installed
sqlite3 pb_data/data.db < backend/shared/migrations/052_add_sync_columns.sql
sqlite3 pb_data/data.db < backend/migrations/053_add_order_sync_status.sql
```

#### 2.4 Build & Start

```bash
# Development mode
npm run dev:full

# Or production build
npm run build
npm run package
```

#### 2.5 Verify Cloud Connection

```bash
# Check cloud status
curl http://localhost:8090/api/cloud/stats

# Expected response:
{
  "enabled": true,
  "cloudConnection": "online",
  "lastSuccessfulSync": "..."
}
```

#### 2.6 Verify Fleet Monitor

1. Log into Management Hub
2. Navigate to Fleet Monitor
3. Verify MASTER_01 appears as "Online"
4. Check last heartbeat timestamp

---

### Phase 3: Additional Master Stations (20 mins each)

#### 3.1 Automated Deployment Script

```bash
#!/bin/bash
# deploy-new-master.sh

DESK_ID=$1
DESK_NAME=$2
LOCATION=$3
HUB_URL=$4
ADMIN_EMAIL=$5
ADMIN_PASS=$6

# Provision in Cloudflare
cd apps/master/backend/setup
node cloudflare-provision.js \
  --desk-id=$DESK_ID \
  --api-token=$CF_API_TOKEN \
  --account-id=$CF_ACCOUNT_ID

# Execute SQL in D1
wrangler d1 execute clickflash-hub --file=provision-${DESK_ID}.sql

# Deploy to new machine
ssh user@new-master "bash -s" < setup-master.sh $DESK_ID "$DESK_NAME" "$LOCATION"

# Configure remote .env
ssh user@new-master "echo 'CLOUD_API_URL=$HUB_URL' >> .env"
ssh user@new-master "echo 'CLOUD_EMAIL=$ADMIN_EMAIL' >> .env"
ssh user@new-master "echo 'CLOUD_PASSWORD=$ADMIN_PASS' >> .env"

# Start service
ssh user@new-master "cd clickflash/apps/master && npm start"
```

**Usage**:
```bash
./deploy-new-master.sh \
  MASTER_MALDIVES_02 \
  "Soneva Jani" \
  "Maldives" \
  "https://management.clickflash.app" \
  "admin@clickflash.app" \
  "DEFAULT_PASSWORD_PLACEHOLDER"
```

---

### Phase 4: Testing (60 mins)

#### 4.1 Core Sync Tests

| Test | Command | Expected Result |
|------|---------|-----------------|
| Health Check | `curl /api/health` | `{"status":"ok"}` |
| Cloud Stats | `curl /api/cloud/stats` | `cloudConnection: "online"` |
| Sync Trigger | `POST /api/cloud/sync` | `{"success": true}` |
| Payroll Stats | `GET /api/cloud/stats/payroll` | Pending/synced counts |

#### 4.2 End-to-End Tests

**Test 1: Order Sync**
1. Create order at Master Kiosk
2. Verify sync to Management Hub
3. Check Hub's orders table
4. Verify order appears in Gallery

**Test 2: MoneyTrash Upload**
1. Import photo
2. Mark order as paid (exclude from MoneyTrash)
3. Wait for retention period
4. Verify watermarked photo uploads to Gallery

**Test 3: Payroll Sync**
1. Complete commission-based order
2. Verify ledger entry created locally
3. Trigger payroll sync
4. Verify entry appears in Hub's photographer_ledger

**Test 4: Multi-Master Isolation**
1. Create order on MASTER_01
2. Create order on MASTER_02
3. Verify both appear in Hub with correct desk_id
4. Verify no cross-contamination

#### 4.3 Load Tests

```bash
# Simulate 100 sync operations
for i in {1..100}; do
  curl -X POST http://localhost:8090/api/cloud/sync
done

# Monitor queue sizes
curl http://localhost:8090/api/cloud/stats
```

---

### Phase 5: Monitoring Setup (30 mins)

#### 5.1 Fleet Monitor Dashboard

Verify all stations report:
- Online status
- Version
- Orders today
- Photos today
- Sync status

#### 5.2 Alert Configuration

Set up alerts for:
- Master station offline > 5 minutes
- Sync lag > 10 minutes
- Failed operations > 10 in 1 hour
- Low disk space < 10GB

#### 5.3 Log Aggregation

```bash
# Centralized logging (optional)
# Forward logs to Cloudflare Workers

# Or use local log rotation
logrotate -f /etc/logrotate.d/clickflash
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check all services
curl https://management.clickflash.app/api/health
curl https://gallery.clickflash.app/api/health

# Check each Master
for desk in MASTER_01 MASTER_02 MASTER_03; do
  echo "Checking $desk..."
  # Assuming SSH access
  ssh $desk "curl -s localhost:8090/api/cloud/stats | grep cloudConnection"
done
```

### 2. Data Integrity

```sql
-- In D1 console, verify data from all desks
SELECT desk_id, COUNT(*) as order_count 
FROM orders 
GROUP BY desk_id;

SELECT desk_id, COUNT(*) as ledger_count 
FROM photographer_ledger 
GROUP BY desk_id;

SELECT desk_id, COUNT(*) as photo_count 
FROM photos 
GROUP BY desk_id;
```

### 3. Sync Lag Check

```bash
# Check last sync time for each Master
wrangler d1 execute clickflash-hub --command="SELECT site_id, updated_at FROM sync_sequences"
```

---

## Rollback Plan

### Scenario 1: Master Sync Issues

```bash
# 1. Pause sync on affected Master
curl -X POST http://localhost:8090/api/cloud/queue/pause

# 2. Purge problematic queue
curl -X POST http://localhost:8090/api/cloud/queue/purge

# 3. Resume sync
curl -X POST http://localhost:8090/api/cloud/queue/resume
```

### Scenario 2: Management Hub Issues

```bash
# 1. Deploy previous version
cd apps/management/backend
git checkout <previous-tag>
wrangler deploy

# 2. Verify Masters reconnect
# (They will retry automatically)
```

### Scenario 3: Data Corruption

```sql
-- Restore from D1 backup
-- Contact Cloudflare support for point-in-time recovery
```

---

## Troubleshooting Guide

### Issue: Master Shows Offline

```bash
# Check local service
systemctl status clickflash

# Check logs
tail -f logs/cloud-sync.log

# Test cloud connection manually
curl -v https://management.clickflash.app/api/health

# Check credentials
grep CLOUD .env
```

### Issue: Sync Not Working

```bash
# Check pending operations
sqlite3 pb_data/data.db "SELECT COUNT(*) FROM operation_logs WHERE status='pending'"

# Check sync stats
curl http://localhost:8090/api/cloud/stats

# Trigger manual sync
curl -X POST http://localhost:8090/api/cloud/sync
```

### Issue: MoneyTrash Not Uploading

```bash
# Check retention queue
sqlite3 pb_data/data.db "SELECT COUNT(*) FROM retention_queue WHERE status='pending'"

# Check MoneyTrash config
sqlite3 pb_data/data.db "SELECT value FROM settings WHERE key='moneytrash_settings'"

# Check upload endpoint response
# (Enable debug logging in cloudSyncService.ts)
```

---

## Deployment Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Pre-deployment | 1 hour | Verification, backups, staging tests |
| Phase 1 | 30 mins | Deploy cloud infrastructure |
| Phase 2 | 45 mins | First Master setup |
| Phase 3 | 20 mins x N | Additional Masters |
| Phase 4 | 60 mins | Testing & validation |
| Phase 5 | 30 mins | Monitoring setup |
| **Total** | **~4 hours** | First deployment |

---

## Success Criteria

✅ **All checks must pass**:

1. [ ] All Masters report "online" in Fleet Monitor
2. [ ] Sync operations complete without errors
3. [ ] Payroll data aggregates correctly in Hub
4. [ ] MoneyTrash uploads work end-to-end
5. [ ] Multi-master isolation verified
6. [ ] Order sync works both directions
7. [ ] Response times < 2 seconds for API calls
8. [ ] Zero data loss during migration

---

## Sign-Off

**Deployed By**: _________________ **Date**: _________________

**Verified By**: _________________ **Date**: _________________

**Notes**:

---

*Document Version: 1.0*  
*Last Updated: 2026-02-21*
