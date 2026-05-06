# Phase 27: Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the ClickFlash ecosystem to production environments.

**Target Audience**: System administrators, DevOps engineers, photographers deploying self-hosted solutions

**Deployment Options**:

1. **React Stack** (Master + Touch + Cloud) - Modern, recommended for new deployments
2. **Python Stack** (Master + Touch) - Maximum stability, mature ecosystem
3. **C++ Stack** (Master + Touch) - High performance, low resource usage
4. **Cloud Services** (Management + Customer Gallery) - Always required

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PHOTOGRAPHER'S LOCATION                  │
│                                                             │
│  ┌──────────────┐              ┌──────────────┐            │
│  │  Touch App   │─────LAN─────→│  Master App  │            │
│  │  (Kiosk)     │              │  (Workstation)│            │
│  │  Port 8091   │              │  Port 8090   │            │
│  │              │              │              │            │
│  │ React/       │              │ React/       │            │
│  │    │              │   │            │
│  └──────────────┘              └──────┬───────┘            │
│                                       │                     │
│                                       │ Cloud Sync (HTTPS)  │
└───────────────────────────────────────┼─────────────────────┘
                                        │
                                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD (Public Internet)                  │
│                                                             │
│  ┌──────────────────────────────────────┐                  │
│  │  Management App (Backend + Frontend) │                  │
│  │  URL: https://api.clickflash.com     │                  │
│  │  Port: 8092 (HTTPS: 443)             │                  │
│  │                                      │                  │
│  │  - Admin Dashboard (Frontend)        │                  │
│  │  - Customer API (Backend)            │                  │
│  │  - Photo Storage                     │                  │
│  └──────────────┬───────────────────────┘                  │
│                 │                                           │
│                 │ Public API (HTTPS)                        │
│                 ↓                                           │
│  ┌──────────────────────────────────────┐                  │
│  │  Customer Gallery (Static Site)      │                  │
│  │  URL: https://gallery.clickflash.com │                  │
│  │  Hosted: Netlify/Vercel/Cloudflare   │                  │
│  └──────────────────────────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Hardware Requirements

#### Master App (Photographer's Workstation)

- **CPU**: Intel Core i5 or AMD Ryzen 5 (8th gen or newer)
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 500GB SSD minimum (1TB+ recommended for large photo libraries)
- **GPU**: Dedicated GPU recommended for photo processing
- **Network**: Gigabit Ethernet (for LAN communication with Touch)
- **OS**: Windows 10/11, Ubuntu 20.04+, or macOS 11+

#### Touch App (Guest Kiosk)

- **CPU**: Intel Core i3 or equivalent
- **RAM**: 8GB minimum
- **Storage**: 256GB SSD
- **Display**: Touchscreen monitor (1920x1080 minimum)
- **Network**: Gigabit Ethernet or WiFi 5+
- **OS**: Windows 10/11, Ubuntu 20.04+

#### Cloud Server (Management App)

- **CPU**: 2 vCPUs minimum
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100GB SSD (+ additional storage for customer photos)
- **Network**: 100 Mbps minimum bandwidth
- **OS**: Ubuntu 20.04 LTS or newer

### Software Prerequisites

#### All Stacks

- **Node.js**: v18+ (for React stack and build tools)
- **SQLite**: 3.35+ (bundled with most systems)

#### React Stack

- **npm**: 8+ or **yarn**: 1.22+
- **Electron**: (bundled as dependency)

#### Cloud Services

- **Docker**: 24.0+ (recommended for Management App)
- **Nginx**: 1.24+ (for reverse proxy)
- **Certbot**: 2.0+ (for SSL certificates)

---

## Part 1: Local Deployment (Master + Touch Apps)

### Option A: React Stack Deployment

#### Step 1: Prepare Environment

**On Master Workstation:**

```bash
# Install Node.js (if not already installed)
# Windows: Download from https://nodejs.org
# Linux:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18+
npm --version   # Should be 8+
```

**On Touch Kiosk:**

```bash
# Same Node.js installation as above
```

#### Step 2: Build Master App

```bash
cd e:\ClickFlash\master-app\react-new

# Install dependencies
npm install

# Create production .env file
cp .env.example .env.production

# Edit .env.production
notepad .env.production
```

**Production .env Configuration:**

```env
# Master App - Production Environment
NODE_ENV=production
PORT=8090

# Database
DATA_DIR=./pb_data
DATABASE_URL=file:./pb_data/database.sqlite

# Security
JWT_SECRET=CHANGE_TO_SECURE_RANDOM_STRING_MINIMUM_32_CHARS

# Cloud Sync (Management App)
MANAGEMENT_API_URL=https://api.clickflash.com
MANAGEMENT_API_KEY=YOUR_MANAGEMENT_API_KEY_HERE

# Touch App Communication
TOUCH_API_URL=http://192.168.1.100:8091  # Replace with Touch IP

# Thermal Monitoring
THERMAL_MONITORING_ENABLED=true
THERMAL_WARNING_THRESHOLD=75
THERMAL_CRITICAL_THRESHOLD=80
THERMAL_EMERGENCY_THRESHOLD=85

# Disk Management
DISK_CLEANUP_ENABLED=true
DISK_CLEANUP_THRESHOLD=90
```

**Build for Production:**

```bash
# Build frontend
npm run build

# Build Electron app (standalone executable)
npm run electron:build

# Output will be in: dist-electron/
# Windows: ClickFlash-Master-Setup.exe
# Linux: ClickFlash-Master.AppImage
# macOS: ClickFlash-Master.dmg
```

#### Step 3: Build Touch App

```bash
cd e:\ClickFlash\touch-app\react

# Install dependencies
npm install

# Create production .env
cp .env.example .env.production

# Edit .env.production
notepad .env.production
```

**Touch App .env Configuration:**

```env
# Touch App - Production Environment
NODE_ENV=production
PORT=8091

# Database
DATA_DIR=./pb_data
DATABASE_URL=file:./pb_data/database.sqlite

# Master App Communication
MASTER_API_URL=http://192.168.1.10:8090  # Replace with Master IP

# Kiosk Mode
KIOSK_MODE=true  # Fullscreen, no exit
AUTO_START=true

# QR Login (optional)
QR_LOGIN_ENABLED=true
CUSTOMER_GALLERY_URL=https://gallery.clickflash.com
```

**Build:**

```bash
npm run build
npm run electron:build

# Output: dist-electron/ClickFlash-Touch-Setup.exe
```

#### Step 4: Install and Configure

**Master App Installation:**

1. Run `ClickFlash-Master-Setup.exe` on workstation
2. Install to `C:\Program Files\ClickFlash\Master`
3. First launch will create `pb_data/` directory
4. Configure settings via Settings page

**Touch App Installation:**

1. Run `ClickFlash-Touch-Setup.exe` on kiosk
2. Install to `C:\Program Files\ClickFlash\Touch`
3. Configure Windows Kiosk Mode:

**Windows Kiosk Mode Setup:**

```powershell
# Run as Administrator
# Configure Assigned Access (Kiosk Mode)
Set-AssignedAccess -AppUserModelId "ClickFlash.Touch" -UserName "KioskUser"

# Disable Windows shortcuts
# HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Policies\System
New-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System" -Name "DisableTaskMgr" -Value 1 -PropertyType DWORD
```

#### Step 5: Network Configuration

**Static IP Assignment (Recommended):**

**Master (Workstation):**

- IP: `192.168.1.10`
- Subnet: `255.255.255.0`
- Gateway: `192.168.1.1`

**Touch (Kiosk):**

- IP: `192.168.1.100`
- Subnet: `255.255.255.0`
- Gateway: `192.168.1.1`

**Firewall Rules:**

```bash
# Windows Firewall - Allow inbound on port 8090 (Master)
netsh advfirewall firewall add rule name="ClickFlash Master" dir=in action=allow protocol=TCP localport=8090

# Windows Firewall - Allow inbound on port 8091 (Touch)
netsh advfirewall firewall add rule name="ClickFlash Touch" dir=in action=allow protocol=TCP localport=8091
```

#### Step 6: Test Local Communication

```bash
# From Touch kiosk, test Master connection:
curl http://192.168.1.10:8090/api/health

# Expected response:
# {"status":"online","version":"4.4.0","database":"connected"}

# From Master, test Touch connection:
curl http://192.168.1.100:8091/api/health
```

---

### Option B: Python Stack Deployment

#### Step 1: Install Python Dependencies

**On Master Workstation:**

```bash
cd e:\ClickFlash\master-app\python

# Create virtual environment
python -m venv .venv_master

# Activate virtual environment
# Windows:
.venv_master\Scripts\activate
# Linux:
source .venv_master/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Install additional packages
pip install pyinstaller  # For creating executable
```

#### Step 2: Build Executable

```bash
# Build standalone executable
pyinstaller MasterApp.spec

# Output: dist/MasterApp.exe (Windows) or dist/MasterApp (Linux)
```

#### Step 3: Create Installer (Windows NSIS)

```bash
# Install NSIS (Nullsoft Scriptable Install System)
# Download from: https://nsis.sourceforge.io/

# Compile installer
makensis installer_master.nsi

# Output: MasterApp-Setup.exe
```

#### Step 4: Deploy

```bash
# Install MasterApp-Setup.exe on workstation
# Executable will be in: C:\Program Files\MasterApp\

# First run creates pb_data/ directory
MasterApp.exe
```

**Python Configuration:**

Location: `C:\Program Files\MasterApp\config.json`

```json
{
  "port": 8090,
  "data_dir": "./pb_data",
  "master_api_url": "http://192.168.1.10:8090",
  "touch_api_url": "http://192.168.1.100:8091",
  "management_api_url": "https://api.clickflash.com",
  "thermal_monitoring": {
    "enabled": true,
    "warning_threshold": 75,
    "critical_threshold": 80,
    "emergency_threshold": 85
  },
  "disk_management": {
    "enabled": true,
    "auto_cleanup_threshold": 90,
    "thumbnail_retention_days": 30
  }
}
```

---

### Option C: C++ Stack Deployment

#### Step 1: Build from Source

**On Development Machine:**

```bash
cd e:\ClickFlash\master-app\cpp

# Create build directory
mkdir build
cd build

# Configure with CMake
cmake .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build . --config Release

# Output: build/bin/MasterApp.exe
```

#### Step 2: Package Dependencies

```bash
# Windows: Use windeployqt to bundle Qt libraries
windeployqt build/bin/MasterApp.exe

# This copies all necessary Qt DLLs to the same directory
```

#### Step 3: Deploy

```bash
# Copy entire build/bin/ directory to target machine
# Recommended location: C:\Program Files\ClickFlash\Master\

# Create desktop shortcut manually or via installer
```

---

## Part 2: Cloud Services Deployment

### Management App Deployment (Docker - Recommended)

#### Step 1: Provision Cloud Server

**Recommended Providers:**

- DigitalOcean: $12/month for 2 vCPU, 4GB RAM
- AWS Lightsail: $10/month for 2 vCPU, 2GB RAM
- Hetzner: €5/month for 2 vCPU, 4GB RAM

**OS**: Ubuntu 22.04 LTS

#### Step 2: Install Docker

```bash
# SSH into server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Verify
docker --version
docker compose version
```

#### Step 3: Prepare Application

```bash
# Create application directory
mkdir -p /opt/clickflash/management
cd /opt/clickflash/management

# Clone or upload your code
# (You'll need to transfer files from e:\ClickFlash\web\management)

# Create production .env
nano .env.production
```

**Production .env:**

```env
# Management App - Production
NODE_ENV=production
PORT=8092

# Security
JWT_SECRET=GENERATE_STRONG_32_CHAR_RANDOM_STRING_HERE

# Database
DATA_DIR=./pb_data

# CORS (Allow connections from galleries)
CORS_ORIGINS=https://gallery.clickflash.com

# Upload limits
MAX_UPLOAD_SIZE=100MB

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/management.log
```

#### Step 4: Create Dockerfile

**File**: `/opt/clickflash/management/Dockerfile`

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built app from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create data directory
RUN mkdir -p pb_data/uploads

# Expose port
EXPOSE 8092

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:8092/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "backend/server.js"]
```

#### Step 5: Create docker-compose.yml

**File**: `/opt/clickflash/management/docker-compose.yml`

```yaml
version: '3.8'

services:
  management:
    build: .
    container_name: clickflash-management
    restart: unless-stopped
    ports:
      - "8092:8092"
    volumes:
      - ./pb_data:/app/pb_data
      - ./logs:/app/logs
    env_file:
      - .env.production
    networks:
      - clickflash

  nginx:
    image: nginx:alpine
    container_name: clickflash-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on:
      - management
    networks:
      - clickflash

networks:
  clickflash:
    driver: bridge
```

#### Step 6: Configure Nginx Reverse Proxy

**File**: `/opt/clickflash/management/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    upstream management_backend {
        server management:8092;
    }

    # HTTP - Redirect to HTTPS
    server {
        listen 80;
        server_name api.clickflash.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name api.clickflash.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # SSL Configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Proxy to Management App
        location / {
            proxy_pass http://management_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # File upload size limit
        client_max_body_size 100M;
    }
}
```

#### Step 7: Obtain SSL Certificate

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --webroot -w /var/www/certbot \
  -d api.clickflash.com \
  --email your-email@example.com \
  --agree-tos

# Copy certificates to nginx volume
sudo cp /etc/letsencrypt/live/api.clickflash.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/api.clickflash.com/privkey.pem ./ssl/

# Set up auto-renewal
sudo crontab -e
# Add line:
# 0 0 1 * * certbot renew --quiet && docker restart clickflash-nginx
```

#### Step 8: Deploy

```bash
# Build and start containers
docker compose up -d --build

# Check logs
docker compose logs -f management

# Verify health
curl https://api.clickflash.com/api/health
```

---

### Customer Gallery Deployment (Static Hosting)

#### Step 1: Build for Production

```bash
cd e:\ClickFlash\web\customer-gallery

# Update .env for production
nano .env.production
```

**Production .env:**

```env
# Customer Gallery - Production
VITE_MANAGEMENT_API_URL=https://api.clickflash.com
```

**Build:**

```bash
npm run build

# Output: dist/ folder contains static files
```

#### Step 2: Deploy to Netlify (Recommended)

**Option A: Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd dist
netlify deploy --prod

# Follow prompts:
# - Site name: clickflash-gallery
# - Custom domain: gallery.clickflash.com
```

**Option B: Netlify Web UI**

1. Go to <https://app.netlify.com>
2. Drag and drop `dist/` folder
3. Configure custom domain: gallery.clickflash.com
4. Netlify auto-provisions SSL certificate

#### Step 3: Configure DNS

**DNS Records** (at your domain registrar):

```
Type    Name        Value                       TTL
A       api         YOUR_SERVER_IP              300
CNAME   gallery     clickflash-gallery.netlify.app  300
```

---

## Part 3: Database & Data Management

### Database Backups

**Automated Backup Script** (Master App)

**File**: `C:\ClickFlash\Scripts\backup.ps1`

```powershell
# Backup Script for ClickFlash Master App
$backupDir = "C:\ClickFlash\Backups"
$dataDir = "C:\Program Files\ClickFlash\Master\pb_data"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = "$backupDir\backup-$timestamp.zip"

# Create backup directory if it doesn't exist
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# Compress database and photos
Compress-Archive -Path "$dataDir\*" -DestinationPath $backupFile

# Upload to cloud (optional)
# aws s3 cp $backupFile s3://your-bucket/backups/

# Delete backups older than 30 days
Get-ChildItem -Path $backupDir -Filter "backup-*.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    Remove-Item -Force

Write-Host "Backup complete: $backupFile"
```

**Schedule with Task Scheduler:**

```powershell
# Run as Administrator
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\ClickFlash\Scripts\backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
Register-ScheduledTask -TaskName "ClickFlash Backup" -Action $action -Trigger $trigger
```

### Database Migrations

**When** updating to new versions, check for migration scripts:

```bash
# Master App (React)
cd master-app/react-new/backend/shared/migrations
# Run any new .sql files manually or via migration tool

# Python
cd master-app/python/backend
python migrate_db.py
```

---

## Part 4: Monitoring & Logging

### Application Monitoring

**Health Check Endpoints:**

- Master: `http://localhost:8090/api/health`
- Touch: `http://localhost:8091/api/health`
- Management: `https://api.clickflash.com/api/health`

**Monitoring Script** (Windows Task Scheduler):

**File**: `C:\ClickFlash\Scripts\healthcheck.ps1`

```powershell
$services = @(
    @{Name="Master"; Url="http://localhost:8090/api/health"},
    @{Name="Touch"; Url="http://localhost:8091/api/health"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "$($service.Name): OK"
        } else {
            Write-Warning "$($service.Name): Unhealthy (Status: $($response.StatusCode))"
            # Send alert (email, SMS, etc.)
        }
    } catch {
        Write-Error "$($service.Name): FAILED - $($_.Exception.Message)"
        # Send alert
    }
}
```

### Log Management

**Log Locations:**

- **React Master**: `C:\Program Files\ClickFlash\Master\logs\master.log`
- **React Touch**: `C:\Program Files\ClickFlash\Touch\logs\touch.log`
- **Python Master**: `C:\Program Files\MasterApp\logs\master.log`
- **Management App**: `/opt/clickflash/management/logs/management.log`

**Log Rotation** (Ubuntu - Management App):

```bash
# Install logrotate
sudo apt-get install logrotate

# Create config
sudo nano /etc/logrotate.d/clickflash
```

**File**: `/etc/logrotate.d/clickflash`

```
/opt/clickflash/management/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0640 root root
}
```

---

## Part 5: Security Checklist

### Pre-Deployment Security

- ✅ Change all default passwords and API keys
- ✅ Use strong JWT secrets (minimum 32 characters, random)
- ✅ Enable HTTPS for all cloud services (Let's Encrypt)
- ✅ Configure firewall rules (block unnecessary ports)
- ✅ Enable database encryption at rest (if supported)
- ✅ Set proper file permissions (read-only for executables)
- ✅ Disable debug mode in production builds
- ✅ Configure CORS to specific domains (no wildcards)
- ✅ Implement rate limiting on public APIs
- ✅ Enable security headers (CSP, HSTS, X-Frame-Options)

### Post-Deployment Security

- ✅ Regular security updates (OS, dependencies)
- ✅ Monitor logs for suspicious activity
- ✅ Regular database backups (daily minimum)
- ✅ Test disaster recovery procedures (monthly)
- ✅ Security audits (quarterly)
- ✅ Penetration testing (annually or after major changes)

---

## Part 6: Troubleshooting

### Common Issues

#### Issue: Master and Touch can't communicate

**Symptoms**: Touch app shows "Cannot connect to Master"

**Solutions**:

1. Check network connectivity:

   ```bash
   ping 192.168.1.10  # From Touch to Master
   ```

2. Verify firewall rules:

   ```bash
   netsh advfirewall firewall show rule name="ClickFlash Master"
   ```

3. Check app is running:

   ```bash
   curl http://192.168.1.10:8090/api/health
   ```

4. Verify .env configuration (Master and Touch URLs)

#### Issue: High disk usage

**Symptoms**: Disk cleanup not triggering

**Solutions**:

1. Manually trigger cleanup:
   - React: Settings → Maintenance → "Clean Disk Space"
   - Python: Run `maintenance.manual_cleanup()`

2. Check disk threshold settings:

   ```json
   "disk_management": {
     "auto_cleanup_threshold": 90  // Default is 90%
   }
   ```

3. Verify cleanup is enabled:

   ```env
   DISK_CLEANUP_ENABLED=true
   ```

#### Issue: Thermal throttling too aggressive

**Symptoms**: Photo processing very slow

**Solutions**:

1. Check current temperature:
   - Open diagnostics dashboard
   - View thermal status

2. Improve cooling:
   - Clean dust from PC
   - Improve ventilation
   - Add additional fans

3. Adjust thresholds (if acceptable):

   ```env
   THERMAL_WARNING_THRESHOLD=80   # Default: 75
   THERMAL_CRITICAL_THRESHOLD=85  # Default: 80
   ```

#### Issue: SSL certificate errors

**Symptoms**: HTTPS not working on Management App

**Solutions**:

1. Verify certificate files exist:

   ```bash
   ls -l /opt/clickflash/management/ssl/
   ```

2. Renew certificate:

   ```bash
   sudo certbot renew
   docker restart clickflash-nginx
   ```

3. Check nginx logs:

   ```bash
   docker logs clickflash-nginx
   ```

---

## Part 7: Maintenance Procedures

### Daily

- ✅ Monitor disk space (automatic, but verify)
- ✅ Check application logs for errors

### Weekly

- ✅ Review backup logs
- ✅ Test Master ↔ Touch communication
- ✅ Check database integrity

### Monthly

- ✅ Full backup verification (test restore)
- ✅ Review and rotate logs
- ✅ Check for software updates
- ✅ Performance monitoring (thermal, disk)

### Quarterly

- ✅ Security audit
- ✅ Update SSL certificates (if not auto-renewed)
- ✅ Review and optimize database
- ✅ Disk cleanup and defragmentation

---

## Appendix A: Quick Reference

### Port Reference

| Service | Port | Protocol | Access |
|---------|------|----------|--------|
| Master App | 8090 | HTTP | Local/LAN |
| Touch App | 8091 | HTTP | Local/LAN |
| Management App | 8092 | HTTP | Internal |
| Management (HTTPS) | 443 | HTTPS | Public |
| Customer Gallery | 443 | HTTPS | Public |

### URL Reference

| Service | Local | Production |
|---------|-------|------------|
| Master | <http://localhost:8090> | N/A (local only) |
| Touch | <http://localhost:8091> | N/A (local only) |
| Management | <http://localhost:8092> | <https://api.clickflash.com> |
| Gallery | <http://localhost:8093> | <https://gallery.clickflash.com> |

### Command Reference

**Docker:**

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Rebuild
docker compose up -d --build
```

**Backup:**

```bash
# Manual backup (Windows)
PowerShell -File C:\ClickFlash\Scripts\backup.ps1

# Manual backup (Linux)
tar -czf backup-$(date +%Y%m%d).tar.gz /opt/clickflash/management/pb_data
```

**Health Check:**

```bash
# All services
curl http://localhost:8090/api/health  # Master
curl http://localhost:8091/api/health  # Touch
curl https://api.clickflash.com/api/health  # Management
```

---

## Next Steps

After deployment:

1. ✅ **Test end-to-end workflow**: Import photos → Process → Send to Touch → Create order → Upload to cloud → Access from Gallery
2. ✅ **Train users**: Provide photographer training on Master App features
3. ✅ **Monitor for 48 hours**: Watch logs, disk usage, performance
4. ✅ **Document custom configurations**: Keep record of any deployment-specific settings
5. ✅ **Schedule first backup**: Verify backup system works correctly

**For support or issues, refer to:**

- Project repository: `e:\ClickFlash`
- Documentation: `.agent/` directory
- Issue tracking: (to be set up)

---

**Phase 27 Status**: ✅ **Deployment Guide Complete**

This guide provides comprehensive instructions for deploying all ClickFlash stacks to production environments.
