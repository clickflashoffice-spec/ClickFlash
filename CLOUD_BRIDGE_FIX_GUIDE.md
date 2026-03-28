# Cloud Bridge Authentication Fix Guide

## Problem Summary

The Cloud Bridge verification is failing with **"Auth Failed"** error. This is caused by:

1. **Missing Credentials**: `CLOUD_EMAIL` and `CLOUD_PASSWORD` not configured
2. **Hardware Lock**: Desk ID registered to different machine (HTTP 423)
3. **Invalid Credentials**: Wrong email/password (HTTP 401)

## Quick Fix

### Step 1: Add Credentials to .env

Edit `apps/master/backend/.env`:

```bash
# Add these lines (if missing)
CLOUD_EMAIL=your-email@clickflash.ai
CLOUD_PASSWORD=your-password
```

### Step 2: Run Diagnostic

```bash
cd apps/master/backend/scripts
node cloud-bridge-diagnostic.js
```

### Step 3: Fix Hardware Lock (if needed)

If you see "Hardware Lock Error", contact support:

```
Email: support@clickflash.ai
Subject: Hardware Lock Reset Request
Desk ID: TN001
Machine ID: (shown in diagnostic output)
```

## Diagnostic Tools Created

### 1. `cloud-bridge-diagnostic.js`
**Purpose**: Full diagnostic of Cloud Bridge connectivity
**Usage**:
```bash
cd apps/master/backend/scripts
node cloud-bridge-diagnostic.js
```

**Output**:
```
╔════════════════════════════════════════════════════════════════╗
║           CLOUD BRIDGE DIAGNOSTIC TOOL                         ║
╚════════════════════════════════════════════════════════════════╝

✅ Credentials configured
✅ Hub is reachable
✅ Authentication successful
✅ Heartbeat successful

✨ ALL CHECKS PASSED!
```

### 2. `test-cloud-auth.js`
**Purpose**: Quick auth test only
**Usage**:
```bash
$env:CLOUD_EMAIL="your-email@clickflash.ai"
$env:CLOUD_PASSWORD="your-password"
node test-cloud-auth.js
```

### 3. `verify-bridge.ts`
**Purpose**: Full Cloud Bridge verification with order sync test
**Usage**:
```bash
npx ts-node services/verify-bridge.ts
```

## Credential Sources

### For Testing (Local Development)

| File | Email | Password | Status |
|------|-------|----------|--------|
| `.env.test_master` | test-desk@clickflash.ai | test_password_123 | 🔴 Invalid on prod |
| `apps/master/.env` | test@clickflash.photo | test123 | 🟡 Hardware locked |
| Deployments | alaeddine@example.com | DEFAULT_PASSWORD_PLACEHOLDER | 🟢 Production |

### For Production

Contact your system administrator for:
- Management Hub account credentials
- Desk ID assignment
- Hardware registration

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUD_EMAIL` | ✅ Yes | Management Hub login email |
| `CLOUD_PASSWORD` | ✅ Yes | Management Hub password |
| `CLOUD_API_URL` | ⚪ No | Hub URL (default: production) |
| `DESK_ID` | ⚪ No | Station identifier (default: MASTER_01) |

## Hardware Lock Explained

The Management Hub uses **hardware fingerprinting** for security:

```
┌─────────────────────────────────────────────────────────────┐
│                    HARDWARE LOCK FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. First Login                                             │
│     └── Machine ID + Desk ID registered to account          │
│                                                              │
│  2. Subsequent Logins                                       │
│     └── Machine ID must match registered ID                 │
│                                                              │
│  3. Different Machine                                       │
│     └── HTTP 423 Locked (Station locked to another device)  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### To Reset Hardware Lock:

1. **Contact Support** (fastest)
   ```
   Email: support@clickflash.ai
   Subject: Hardware Lock Reset - [Your Desk ID]
   Body: Desk ID: TN001, Machine ID: [from diagnostic]
   ```

2. **Use Different Desk ID** (temporary workaround)
   ```bash
   DESK_ID=TN001_NEW
   ```

3. **Database Reset** (admin only)
   ```sql
   -- Run on Management Hub database
   DELETE FROM desk_machines WHERE desk_id = 'TN001';
   ```

## Testing the Fix

### 1. Run Diagnostic
```bash
cd apps/master/backend/scripts
node cloud-bridge-diagnostic.js
```

### 2. Verify Cloud Sync Service
```bash
# Start Master server
cd apps/master
npm run dev:backend

# Check logs for:
# [CloudSync] Authenticated successfully with Cloud Hub.
# [CloudSync] Service started.Target: https://...
```

### 3. Test Order Sync
```bash
# Create test order
curl -X POST http://localhost:8090/api/collections/orders/records \
  -H "Content-Type: application/json" \
  -d '{"total": 50, "status": "paid", "customerEmail": "test@test.com"}'

# Check if sync happens within 1 minute
# Look for: [CloudSync] Order synced successfully
```

## Common Errors

### "CLOUD_EMAIL not configured"
**Solution**: Add to `.env` file
```bash
CLOUD_EMAIL=your-email@clickflash.ai
CLOUD_PASSWORD=your-password
```

### "Invalid email or password" (401)
**Solution**: Verify credentials at Management Hub login page

### "Station is locked to another hardware device" (423)
**Solution**: Contact support to reset hardware lock or use different DESK_ID

### "Cloud Hub is not reachable"
**Solution**: Check internet connection and firewall settings

## Verification Checklist

- [ ] CLOUD_EMAIL set in .env
- [ ] CLOUD_PASSWORD set in .env
- [ ] Diagnostic shows "ALL CHECKS PASSED"
- [ ] Master server starts without auth errors
- [ ] Heartbeat sends successfully (every 1 minute)
- [ ] Order sync works (create order → check Hub)

## Status Update

**Phase 200: Cloud Bridge Verification**

| Task | Status |
|------|--------|
| Create verify-bridge.ts | ✅ Complete |
| Fix authentication | 🔄 In Progress |
| Validate heartbeat | ⬜ Pending |
| Confirm Order Push | ⬜ Pending |
