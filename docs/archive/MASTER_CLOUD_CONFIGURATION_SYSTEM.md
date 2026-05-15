# Master Station Cloud Configuration System

Complete configuration system for deploying ClickFlash Master stations with automatic cloud connectivity.

---

## 📁 System Components

### 1. Setup Wizard (`cloud-setup-wizard.js`)
Interactive wizard that guides users through configuration:
- Desk identity setup
- Management Hub connection
- Gallery configuration
- Feature toggles
- Connection testing
- Configuration saving

**Usage**:
```bash
node setup/cloud-setup-wizard.js
```

### 2. Cloudflare Provisioner (`cloudflare-provision.js`)
Automates Cloudflare resource creation:
- Generates SQL for D1 database
- Creates wrangler.toml templates
- Provisions D1 databases (if API token provided)

**Usage**:
```bash
node setup/cloudflare-provision.js --desk-id=MASTER_XXX --api-token=xxx --account-id=xxx
```

### 3. Configuration Template (`config-template.env`)
Template for environment variables with documentation:
- All required settings
- Optional features
- Security configurations
- Advanced options

### 4. One-Command Setup Scripts
- **Linux/Mac**: `setup-master.sh`
- **Windows**: `setup-master.bat`

**Usage**:
```bash
# Linux/Mac
./setup-master.sh MASTER_MALDIVES_01 "Soneva Fushi" "Maldives"

# Windows
setup-master.bat MASTER_MALDIVES_01 "Soneva Fushi" "Maldives"
```

---

## 🚀 Quick Start

### For New Installations

#### Option A: One-Command Setup (Recommended)

```bash
# 1. Navigate to backend directory
cd apps/master/backend

# 2. Run setup script
./setup/setup-master.sh MASTER_MALDIVES_01 "Resort Name" "Location"

# 3. Start application
npm start
```

#### Option B: Interactive Wizard

```bash
# 1. Navigate to backend directory
cd apps/master/backend

# 2. Run wizard
node setup/cloud-setup-wizard.js

# 3. Answer prompts
# - Desk ID: MASTER_MALDIVES_01
# - Management Hub: https://management.clickflash.app
# - Credentials: admin@example.com / password

# 4. Start application
npm start
```

### For Cloudflare Administrators

#### Preparing Cloud Environment

```bash
# Generate provisioning SQL
node setup/cloudflare-provision.js --desk-id=MASTER_MALDIVES_01

# Output files:
# - provision-MASTER_MALDIVES_01.sql  (Run in D1 dashboard)
# - wrangler-MASTER_MALDIVES_01.toml  (Worker config)
# - setup-MASTER_MALDIVES_01.sh       (Station setup)
```

---

## 📋 Configuration Files

### Generated Files

| File | Purpose | Location |
|------|---------|----------|
| `.env` | Main environment configuration | `apps/master/` |
| `.env.cloud` | Cloud-specific settings | `apps/master/` |
| `cloud-config.json` | Full JSON configuration | `apps/master/backend/` |
| `.cloud-setup-complete` | Setup completion marker | `apps/master/` |
| `provision-XXX.sql` | D1 SQL statements | `apps/master/backend/setup/` |
| `wrangler-XXX.toml` | Worker configuration | `apps/master/backend/setup/` |

### Key Environment Variables

```bash
# Required
DESK_ID=MASTER_MALDIVES_01
DESK_NAME="Soneva Fushi - Main Reception"
DESK_LOCATION="Maldives, Baa Atoll"
CLOUD_API_URL=https://management.clickflash.app
CLOUD_EMAIL=admin@soneva.com
CLOUD_PASSWORD=secure-password

# Optional
GALLERY_URL=https://gallery.clickflash.app
CLOUD_SYNC_ENABLED=true
MONEYTRASH_ENABLED=true
RETENTION_DAYS=15
```

---

## 🔧 Configuration Workflows

### Workflow 1: Single Master Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE MASTER SETUP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Cloudflare Admin                                            │
│     └─▶ Run: cloudflare-provision.js                            │
│     └─▶ Execute generated SQL in D1                             │
│                                                                  │
│  2. On-Site Technician                                          │
│     └─▶ Install Node.js                                         │
│     └─▶ Run: setup-master.sh                                    │
│     └─▶ Enter Management Hub credentials                        │
│                                                                  │
│  3. Application                                                 │
│     └─▶ Auto-connects to Management Hub                         │
│     └─▶ Begins cloud sync                                       │
│     └─▶ Available in Fleet Monitor                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 2: Multi-Master Fleet Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                   FLEET DEPLOYMENT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLOUDFLARE ADMIN                                                │
│  ────────────────                                                │
│  1. Generate provisioning for all stations                      │
│     for desk in MASTER_01 MASTER_02 MASTER_03; do               │
│       node cloudflare-provision.js --desk-id=$desk              │
│     done                                                        │
│                                                                  │
│  2. Execute all SQL files in D1                                 │
│                                                                  │
│  ON-SITE TEAMS                                                   │
│  ─────────────                                                   │
│  3. Each location runs setup script                             │
│     Location 1: ./setup-master.sh MASTER_01 ...                 │
│     Location 2: ./setup-master.sh MASTER_02 ...                 │
│     Location 3: ./setup-master.sh MASTER_03 ...                 │
│                                                                  │
│  4. All stations appear in Fleet Monitor                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 3: Automated CI/CD Deployment

```yaml
# Example GitHub Actions workflow
name: Deploy Master Station

on:
  workflow_dispatch:
    inputs:
      desk_id:
        description: 'Desk ID'
        required: true
      desk_name:
        description: 'Desk Name'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Provision Cloud Resources
        run: |
          node setup/cloudflare-provision.js \
            --desk-id=${{ github.event.inputs.desk_id }} \
            --api-token=${{ secrets.CLOUDFLARE_API_TOKEN }} \
            --account-id=${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      
      - name: Execute D1 SQL
        run: |
          # Use Cloudflare API to execute SQL
          curl -X POST "https://api.cloudflare.com/client/v4/accounts/${{ secrets.CLOUDFLARE_ACCOUNT_ID }}/d1/database/${{ secrets.D1_DATABASE_ID }}/query" \
            -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
            -d @provision-${{ github.event.inputs.desk_id }}.sql
      
      - name: Generate Setup Package
        run: |
          tar -czf ${{ github.event.inputs.desk_id }}-setup.tar.gz \
            setup-master.sh \
            cloud-setup-wizard.js \
            config-template.env
      
      - name: Upload to Releases
        uses: actions/upload-release-asset@v1
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./${{ github.event.inputs.desk_id }}-setup.tar.gz
          asset_name: ${{ github.event.inputs.desk_id }}-setup.tar.gz
```

---

## 🌐 Cloudflare Preparation

### Required Cloudflare Setup

1. **D1 Database** (Management Hub data)
   - Created during Management Hub deployment
   - Stores destinations, sync sequences, vector clocks

2. **Workers/Pages** (Management Hub)
   - Main API endpoint
   - Handles sync operations

3. **Optional: R2 Storage**
   - For photo storage (if using Cloudflare storage)

### Adding New Master to Cloudflare

#### Method 1: D1 Dashboard

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **D1**
3. Select your Management Hub database
4. Click **Console**
5. Execute SQL:
```sql
INSERT INTO destinations (id, name, site_code, type, status, created_at)
VALUES ('MASTER_NEW_01', 'New Station', 'SITE_NEW_01', 'Master', 'Active', CURRENT_TIMESTAMP);

INSERT INTO sync_sequences (id, site_id, counter, updated_at)
VALUES ('desk_MASTER_NEW_01', 'MASTER_NEW_01', 0, CURRENT_TIMESTAMP);
```

#### Method 2: Using Provision Script

```bash
node setup/cloudflare-provision.js --desk-id=MASTER_NEW_01

# Then execute the generated SQL file in D1 dashboard
```

---

## 🔄 Update/Change Configuration

### Updating Cloud Credentials

```bash
# 1. Edit .env file
nano .env

# 2. Update values
CLOUD_EMAIL=newemail@example.com
CLOUD_PASSWORD=newpassword

# 3. Restart application
pm2 restart MASTER_MALDIVES_01
```

### Changing Desk ID

⚠️ **Warning**: Changing Desk ID requires re-provisioning in Cloudflare

```bash
# 1. Stop application
pm2 stop MASTER_OLD_01

# 2. Update .env
DESK_ID=MASTER_NEW_01

# 3. Provision new desk in Cloudflare
node setup/cloudflare-provision.js --desk-id=MASTER_NEW_01

# 4. Start application
pm2 start MASTER_NEW_01
```

---

## 🛠️ Troubleshooting

### Setup Script Fails

```bash
# Check Node.js version
node --version  # Should be v18+

# Check file permissions (Linux/Mac)
ls -la setup-master.sh
chmod +x setup-master.sh

# Run with debug output
bash -x setup-master.sh MASTER_TEST_01
```

### Cannot Connect to Management Hub

1. Verify URL in `.env`:
   ```bash
   cat .env | grep CLOUD_API_URL
   ```

2. Test connection:
   ```bash
   curl https://management.clickflash.app/api/health
   ```

3. Check credentials:
   ```bash
   curl -X POST https://management.clickflash.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"xxx"}'
   ```

### Desk Not Appearing in Fleet Monitor

1. Check cloud sync is enabled:
   ```bash
   cat .env | grep CLOUD_SYNC_ENABLED
   ```

2. Verify desk is provisioned in D1:
   ```sql
   SELECT * FROM destinations WHERE id = 'MASTER_XXX';
   ```

3. Check sync logs:
   ```bash
   tail -f logs/cloud-sync.log
   ```

---

## 📊 Monitoring Setup

### Post-Setup Verification Checklist

- [ ] Configuration files created (`.env`, `cloud-config.json`)
- [ ] Database migrations applied
- [ ] Application starts without errors
- [ ] Cloud connection shows "online"
- [ ] Desk appears in Fleet Monitor
- [ ] Test sync: Create order, verify it appears in Hub

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

DESK_ID=$(grep DESK_ID .env | cut -d'=' -f2)
CLOUD_URL=$(grep CLOUD_API_URL .env | cut -d'=' -f2)

echo "Health Check for: $DESK_ID"
echo ""

# Check local server
curl -s http://localhost:8090/api/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Local server: Running"
else
    echo "❌ Local server: Not running"
fi

# Check cloud connection
curl -s ${CLOUD_URL}/api/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Management Hub: Reachable"
else
    echo "❌ Management Hub: Unreachable"
fi

# Check sync status
curl -s http://localhost:8090/api/cloud/stats | grep -q "online"
if [ $? -eq 0 ]; then
    echo "✅ Cloud Sync: Online"
else
    echo "❌ Cloud Sync: Offline"
fi
```

---

## 📚 Additional Resources

- **Full Guide**: [MASTER_SETUP_GUIDE.md](MASTER_SETUP_GUIDE.md)
- **Architecture**: [MULTI_MASTER_SYNC_FINAL.md](MULTI_MASTER_SYNC_FINAL.md)
- **Troubleshooting**: See Troubleshooting section in setup guide

---

## 📝 Changelog

### Version 1.0 (2026-02-21)
- Initial configuration system
- Interactive setup wizard
- Cloudflare provisioning script
- One-command setup scripts (bash + batch)
- Comprehensive documentation

---

*Configuration System Version: 1.0*  
*Compatible with: ClickFlash Master v2.0+*  
*Last Updated: 2026-02-21*
