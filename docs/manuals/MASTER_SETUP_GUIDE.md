# Master Station Setup Guide

Complete guide for deploying and configuring new Master stations with cloud connectivity.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Setup Wizard](#setup-wizard)
4. [Cloudflare Preparation](#cloudflare-preparation)
5. [Configuration](#configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **OS**: Windows 10/11, macOS, or Linux
- **Node.js**: v18 or higher
- **Storage**: At least 100GB free space
- **RAM**: 8GB minimum, 16GB recommended
- **Network**: Stable internet connection

### Cloudflare Requirements
- Cloudflare account (free tier works)
- Access to Management Hub deployment
- API Token with permissions:
  - Cloudflare Workers:Edit
  - D1:Edit
  - R2:Edit (optional)

### Required Information
Before starting, gather:
- Management Hub URL (e.g., `https://management.yourdomain.com`)
- Admin email and password for Management Hub
- Unique Desk ID (or let system generate)
- Location name (e.g., "Resort Maldives - Reception")

---

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Navigate to Master backend
cd apps/master/backend

# 2. Run the setup wizard
node setup/cloud-setup-wizard.js

# 3. Follow the prompts
# - Enter Desk ID (or auto-generate)
# - Enter Management Hub URL
# - Enter credentials
# - Configure features

# 4. Start the application
npm start
```

### Option 2: Manual Configuration

```bash
# 1. Copy template
cp setup/config-template.env .env

# 2. Edit with your settings
nano .env

# 3. Run database migrations
npm run migrate

# 4. Start application
npm start
```

---

## Setup Wizard

The setup wizard (`cloud-setup-wizard.js`) automates the entire configuration process.

### Step-by-Step Walkthrough

#### Step 1: Desk Identity
```
📍 STEP 1: Desk Identity
────────────────────────────────────────────────────────────

Enter Desk ID (or press Enter for auto-generated: MASTER_A1B2C3D4): MASTER_MALDIVES_01
Enter Desk Name (e.g., "Resort Maldives - Reception"): Soneva Fushi - Main Reception
Enter Location (e.g., "Maldives, North Atoll"): Maldives, Baa Atoll

✓ Desk configured: MASTER_MALDIVES_01
```

**Notes**:
- Desk ID must be unique across all Master stations
- Use format: `MASTER_{LOCATION}_{NUMBER}`
- Keep desk name descriptive for easy identification

#### Step 2: Management Hub
```
☁️  STEP 2: Management Hub Configuration
────────────────────────────────────────────────────────────

Do you have an existing Management Hub URL? (yes/no): yes
Enter Management Hub URL (e.g., https://hub.yourdomain.com): https://management.clickflash.app
Enter Management Hub Admin Email: admin@soneva.com
Enter Management Hub Admin Password: ********

✓ Management Hub configured
```

**Finding Your Management Hub URL**:
1. Log into Cloudflare Dashboard
2. Go to Workers & Pages
3. Find your Management Hub deployment
4. Copy the URL (e.g., `https://xxx.pages.dev`)

#### Step 3: Gallery Configuration
```
🖼️  STEP 3: Gallery Configuration
────────────────────────────────────────────────────────────

Enable Customer Gallery? (yes/no, default: yes): yes
Do you have an existing Gallery URL? (yes/no): no
   Using: https://gallery.clickflash.app

✓ Gallery configured
```

#### Step 4: Feature Configuration
```
⚙️  STEP 4: Feature Configuration
────────────────────────────────────────────────────────────

Enable Cloud Sync? (yes/no, default: yes): yes
Enable MoneyTrash (unsold photo monetization)? (yes/no, default: yes): yes
Retention period in days (default: 15): 15

✓ Features configured
```

**Feature Descriptions**:
- **Cloud Sync**: Syncs orders, photos, payroll data to Management Hub
- **MoneyTrash**: Uploads unsold photos to cloud for customer purchase
- **Retention Period**: Days before unsold photos are uploaded

#### Step 5: Connection Testing
```
🧪 STEP 5: Testing Connections
────────────────────────────────────────────────────────────

Testing Management Hub connection...
  ✅ Management Hub: Connected
Testing Gallery connection...
  ✅ Gallery: Connected
```

#### Step 6: Save Configuration
```
💾 STEP 6: Saving Configuration
────────────────────────────────────────────────────────────

  ✓ Saved: cloud-config.json
  ✓ Saved: .env.cloud
  ✓ Updated: .env
```

**Generated Files**:
- `cloud-config.json`: Full configuration in JSON format
- `.env.cloud`: Environment variables for cloud features
- `.env`: Main environment file (updated with cloud config)

---

## Cloudflare Preparation

### Creating a New Master Station Entry

#### Method 1: Using Cloudflare Dashboard

1. **Access D1 Database**:
   - Go to Cloudflare Dashboard → Workers & Pages → D1
   - Select your Management Hub database
   - Click "Console"

2. **Insert Destination Record**:
   ```sql
   INSERT INTO destinations (
       id, name, site_code, country, type, 
       licenseKey, status, last_seen, created_at
   ) VALUES (
       'MASTER_MALDIVES_01',
       'Soneva Fushi - Main Reception',
       'SITE_MALDIVES_01',
       'Maldives',
       'Master',
       'LICENSE_KEY_HERE',
       'Active',
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
   );
   ```

3. **Initialize Sync Tracking**:
   ```sql
   INSERT INTO sync_sequences (
       id, site_id, counter, updated_at
   ) VALUES (
       'desk_MASTER_MALDIVES_01',
       'MASTER_MALDIVES_01',
       0,
       CURRENT_TIMESTAMP
   );
   ```

#### Method 2: Using Provision Script

```bash
# Generate provisioning SQL
node setup/cloudflare-provision.js --desk-id=MASTER_MALDIVES_01

# This creates: provision-MASTER_MALDIVES_01.sql
# Run this SQL in your D1 dashboard
```

### Setting Up DNS (Optional)

If using custom domain:

```bash
# Add CNAME record in Cloudflare DNS
Type: CNAME
Name: master-maldives
Target: management.clickflash.app
Proxy: Enabled
```

---

## Configuration

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DESK_ID` | Yes | - | Unique station identifier |
| `DESK_NAME` | Yes | - | Human-readable name |
| `CLOUD_API_URL` | Yes | - | Management Hub URL |
| `CLOUD_EMAIL` | Yes | - | Admin email |
| `CLOUD_PASSWORD` | Yes | - | Admin password |
| `GALLERY_URL` | No | - | Gallery URL |
| `CLOUD_SYNC_ENABLED` | No | `true` | Enable cloud sync |
| `MONEYTRASH_ENABLED` | No | `true` | Enable MoneyTrash |
| `RETENTION_DAYS` | No | `15` | Photo retention period |

### Feature-Specific Configuration

#### MoneyTrash Settings
```bash
# In .env file
MONEYTRASH_ENABLED=true
RETENTION_DAYS=15

# Additional settings (in database)
# These can be configured via Settings UI:
# - retentionMinutes: 120
# - discountPercentage: 50
# - emailTriggerTime: 30
```

#### Cloud Sync Settings
```bash
# Sync interval (seconds)
SYNC_INTERVAL=60

# Batch size
SYNC_BATCH_SIZE=50

# Enable bidirectional sync
BIDIRECTIONAL_SYNC=true
```

---

## Verification

### 1. Check Configuration Files

```bash
# Verify .env exists and is populated
cat .env | grep -E "(DESK_ID|CLOUD_API_URL)"

# Output should show:
# DESK_ID=MASTER_MALDIVES_01
# CLOUD_API_URL=https://management.clickflash.app
```

### 2. Test Cloud Connection

```bash
# Start the application
npm start

# In another terminal, test endpoints
curl http://localhost:8090/api/cloud/status
```

**Expected Response**:
```json
{
  "enabled": true,
  "status": "online",
  "cloudConnection": "connected",
  "lastSuccessfulSync": "2026-02-21T10:30:00.000Z"
}
```

### 3. Verify Sync Statistics

```bash
# Check sync stats
curl http://localhost:8090/api/cloud/stats
```

**Expected Response**:
```json
{
  "enabled": true,
  "status": "idle",
  "cloudConnection": "online",
  "queues": {
    "retention": 0,
    "fulfillment": 0
  }
}
```

### 4. Check Management Hub

1. Log into Management Hub
2. Navigate to **Fleet Monitor**
3. Verify your Master appears as "Online"
4. Check last heartbeat timestamp

---

## Troubleshooting

### Issue: Cannot connect to Management Hub

**Symptoms**:
- Status shows "offline"
- Sync not working

**Solutions**:
1. Check URL in `.env`:
   ```bash
   cat .env | grep CLOUD_API_URL
   ```

2. Test connectivity:
   ```bash
   curl https://management.clickflash.app/api/health
   ```

3. Verify credentials:
   ```bash
   # Try manual login
   curl -X POST https://management.clickflash.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"xxx"}'
   ```

### Issue: Desk ID already exists

**Symptoms**:
- "Duplicate desk_id" error
- Cannot register in Management Hub

**Solution**:
1. Generate new Desk ID:
   ```bash
   node setup/cloud-setup-wizard.js
   ```

2. Or manually update `.env`:
   ```bash
   DESK_ID=MASTER_MALDIVES_02
   ```

### Issue: MoneyTrash not uploading

**Symptoms**:
- Photos not appearing in Gallery
- retention_queue stuck

**Solutions**:
1. Check MoneyTrash is enabled:
   ```bash
   cat .env | grep MONEYTRASH
   ```

2. Verify retention settings in database:
   ```sql
   SELECT * FROM settings WHERE key = 'moneytrash_settings';
   ```

3. Check retention queue:
   ```bash
   curl http://localhost:8090/api/cloud/stats
   ```

### Issue: Sync showing many pending items

**Symptoms**:
- High pending count in stats
- Sync lag

**Solutions**:
1. Check network connectivity
2. Review sync logs:
   ```bash
   tail -f logs/cloud-sync.log
   ```

3. Manually trigger sync:
   ```bash
   curl -X POST http://localhost:8090/api/cloud/sync
   ```

---

## Advanced Configuration

### Multi-Master Deployment

For deploying multiple Master stations:

```bash
# Station 1
cd /opt/clickflash/master-01
DESK_ID=MASTER_MALDIVES_01 npm start

# Station 2
cd /opt/clickflash/master-02
DESK_ID=MASTER_MALDIVES_02 npm start
```

Each station must have:
- Unique `DESK_ID`
- Same `CLOUD_API_URL`
- Same credentials

### Automated Deployment Script

```bash
#!/bin/bash
# deploy-master.sh

DESK_ID=$1
DESK_NAME=$2
LOCATION=$3

# Create directory
mkdir -p /opt/clickflash/${DESK_ID}
cd /opt/clickflash/${DESK_ID}

# Clone/pull application
git clone https://github.com/yourorg/clickflash.git .

# Run setup
node backend/setup/cloud-setup-wizard.js << EOF
${DESK_ID}
${DESK_NAME}
${LOCATION}
yes
https://management.clickflash.app
admin@clickflash.app
DEFAULT_PASSWORD_PLACEHOLDER
yes
no
yes
yes
15
EOF

# Start with PM2
pm2 start backend/server.js --name ${DESK_ID}
```

Usage:
```bash
./deploy-master.sh MASTER_MALDIVES_01 "Soneva Fushi" "Maldives"
```

---

## Maintenance

### Regular Checks

1. **Daily**: Check Fleet Monitor for online status
2. **Weekly**: Review sync statistics
3. **Monthly**: Check disk space and clean old archives

### Updating Configuration

```bash
# Edit configuration
nano .env

# Restart application
pm2 restart MASTER_MALDIVES_01
```

### Backup Configuration

```bash
# Backup important files
cp .env .env.backup.$(date +%Y%m%d)
cp cloud-config.json cloud-config.json.backup.$(date +%Y%m%d)
```

---

## Support

For additional help:
- Check logs in `logs/` directory
- Review documentation in `docs/`
- Contact support with Desk ID and error messages

---

*Document Version: 1.0*  
*Last Updated: 2026-02-21*
