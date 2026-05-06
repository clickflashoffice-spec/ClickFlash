# React Deployment Guide - Production Ready

**Target**: React Master-App + Touch-App deployment for i5 hardware (16GB Master, 8GB Touch).

---

## Prerequisites

### Hardware Requirements

**Master-App PC**:

- CPU: Intel i5 (4-core) or better
- RAM: 16GB minimum
- Storage: SSD with 200GB+ free space
- Network: Gigabit Ethernet port
- OS: Windows 10/11 64-bit

**Touch-App PC**:

- CPU: Intel i5 (4-core) or better
- RAM: 8GB minimum  
- Storage: SSD with 100GB+ free space
- Network: Gigabit Ethernet port
- Display: Touchscreen recommended
- OS: Windows 10/11 64-bit

### Software Requirements

- Node.js 20.x LTS
- npm 10.x
- PowerShell 5.1+ (execution policy: RemoteSigned)

---

## Master-App Deployment

### 1. Build Frontend

```powershell
cd e:\ClickFlash\master-app\react-new
npm run build
```

**Output**: `dist/` folder containing production-optimized React bundle.

### 2. Build Backend

```powershell
npm run build:backend
```

**Output**: `dist/backend/` folder with:

- `server.js` (bundled Express server)
- `photoWorker.js` (image processing worker)

### 3. Package Electron App

```powershell
npm run package
```

**Output**: `release/` folder with Windows installer (`.exe`).

**electron-builder configuration** (from `package.json`):

- Bundles Electron 39 + Node.js runtime
- Includes all native dependencies (better-sqlite3, sharp)
- Creates Windows installer with auto-update support

### 4. Install on Production Hardware

1. Copy `release/*.exe` to Master PC
2. Run installer (installs to `C:\Program Files\star-master-master\`)
3. Launch application from Start Menu

---

## Touch-App Deployment

### 1. Navigate to Touch-App

```powershell
cd e:\ClickFlash\touch-app\react
```

### 2. Build & Package

```powershell
npm run build
npm run package
```

**Output**: Similar to Master-App, creates Windows installer in `release/`.

### 3. Install on Kiosk Hardware

1. Copy installer to Touch PC
2. Install to default location
3. Configure **Kiosk Mode** (see below)

---

## Network Configuration

### Master-App Setup

**Static IP Assignment** (recommended):

1. Open Network Settings
2. Set static IP: `192.168.1.100`
3. Subnet: `255.255.255.0`
4. Gateway: Your router IP

**Firewall Rules**:

```powershell
# Allow backend server (port 8090)
New-NetFirewallRule -DisplayName "StarMaster Backend" -Direction Inbound -LocalPort 8090 -Protocol TCP -Action Allow

# Allow WebSocket (port 8090)
New-NetFirewallRule -DisplayName "StarMaster WebSocket" -Direction Inbound -LocalPort 8090 -Protocol TCP -Action Allow
```

### Touch-App Setup

**DHCP** (automatic IP):

- Touch apps use auto-discovery via Bonjour/mDNS
- No manual IP configuration needed

**Master Discovery**:

- Touch auto-discovers Master at startup
- Endpoint: `GET /api/discovery/master`
- Fallback: Manual IP entry in settings

---

## Kiosk Mode Configuration

> [!IMPORTANT]
> **Both Master and Touch apps MUST run in kiosk mode** to prevent unauthorized access to Windows folders, system settings, and other applications.

### Master-App Kiosk Setup

**Purpose**: Restrict photographer access to only the photography application - prevent browsing Windows folders, accessing system settings, or running other programs.

**Method 1: Windows Assigned Access**:

```powershell
# 1. Create dedicated kiosk user
$MasterUser = "MasterPhotographer"
New-LocalUser -Name $MasterUser -Password (ConvertTo-SecureString "SecurePassword123!" -AsPlainText -Force)
Add-LocalGroupMember -Group "Users" -Member $MasterUser

# 2. Configure assigned access (requires Windows 10/11 Pro or Enterprise)
Set-AssignedAccess -UserName $MasterUser -AppUserModelId "C:\Program Files\star-master-master\star-master-master.exe"

# 3. Configure auto-login (optional for unattended operation)
# Run: netplwiz
# Uncheck "Users must enter a username and password"
# Set credentials for MasterPhotographer
```

**Method 2: Shell Launcher** (advanced, more control):

```powershell
# 1. Enable Shell Launcher feature
Enable-WindowsOptionalFeature -Online -FeatureName "Client-EmbeddedShellLauncher"

# 2. Configure custom shell
$ShellLauncherClass = [wmiclass]"\\localhost\root\standardcimv2\embedded:WESL_UserSetting"
$ShellLauncherClass.SetCustomShell("MasterPhotographer", "C:\Program Files\star-master-master\star-master-master.exe")
```

**Group Policy Lockdowns** (additional security):

1. Open Group Policy Editor: `gpedit.msc`
2. Navigate to: User Configuration → Administrative Templates → System
3. Enable:
   - **Prevent access to the command prompt**
   - **Remove Task Manager**
   - **Disable registry editing tools**
4. Navigate to: User Configuration → Administrative Templates → Windows Components → File Explorer
5. Enable:
   - **Remove File Explorer's default context menu**
   - **No "Computers Near Me" in Network Locations**

**Disable System Shortcuts** (via registry):

```powershell
# Disable Alt+F4, Ctrl+Alt+Del, Windows key
# Requires manual registry editing or GPO deployment
```

### Touch-App Kiosk Setup

**Purpose**: Restrict guest customer access to only the photo selection application.

**Method 1: Settings UI**:

1. Settings → Accounts → Family & other users
2. Set up assigned access
3. Select Touch-App user
4. Choose `star-master-touch.exe` as kiosk app

**Method 2: PowerShell**:

```powershell
$KioskUser = "TouchKiosk"
$AppPath = "C:\Program Files\star-master-touch\star-master-touch.exe"

# Create kiosk user
New-LocalUser -Name $KioskUser -NoPassword
Set-AssignedAccess -UserName $KioskUser -AppUserModelId $AppPath
```

**Disable System Shortcuts**:

```powershell
# Disable Alt+Tab, Windows key, etc.
# Requires Group Policy Editor (gpedit.msc)
```

---

## Environment Configuration

### Master-App `.env`

Create `C:\Program Files\star-master-master\.env`:

```env
# Database
DATA_DIR=C:\ProgramData\StarMaster\data

# Network
PORT=8090
NODE_ENV=production

# Security
SESSION_SECRET=<generate-random-32-char-string>
JWT_SECRET=<generate-random-32-char-string>

# Features
ENABLE_AI_CULLING=true
ENABLE_FACE_RECOGNITION=true
ENABLE_THERMAL_MONITORING=true

# Hardware
PRINTER_NAME="HiTi P525L"
```

### Touch-App `.env`

Create `C:\Program Files\star-master-touch\.env`:

```env
# Master Discovery
MASTER_URL=http://192.168.1.100:8090

# Kiosk
KIOSK_MODE=true
AUTO_HIDE_CURSOR=true
INACTIVITY_TIMEOUT=300000

# Performance
MEMORY_LIMIT=6GB
ENABLE_THERMAL_AWARE=true
```

---

## Database Initialization

**First-time setup** (Master-App):

```powershell
# Master creates database automatically on first run
# Location: C:\ProgramData\StarMaster\data\master.db

# Verify database exists
Test-Path "C:\ProgramData\StarMaster\data\master.db"
```

**Seeding default data**:

- Admin user created on first launch
- Default session types pre-loaded
- Kiosk settings initialized

---

## Backup & Recovery

### Automated Backup (Master-App)

**Built-in backup endpoint**: `POST /api/system/maintenance/backup`

**Scheduled Task**:

```powershell
# Create daily backup at 2 AM
$Action = New-ScheduledTaskAction -Execute "curl" -Argument "-X POST http://localhost:8090/api/system/maintenance/backup"
$Trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "StarMaster Backup" -Action $Action -Trigger $Trigger
```

**Backup Location**: `C:\ProgramData\StarMaster\backups\`

### Manual Backup

```powershell
# Stop application
Stop-Process -Name "star-master-master" -Force

# Copy database
Copy-Item "C:\ProgramData\StarMaster\data\*" -Destination "D:\Backups\$(Get-Date -Format 'yyyy-MM-dd')" -Recurse

# Restart application
Start-Process "C:\Program Files\star-master-master\star-master-master.exe"
```

### Restore

```powershell
# Stop application
Stop-Process -Name "star-master-master" -Force

# Restore database
Copy-Item "D:\Backups\2026-01-18\*" -Destination "C:\ProgramData\StarMaster\data\" -Recurse -Force

# Restart
Start-Process "C:\Program Files\star-master-master\star-master-master.exe"
```

---

## Monitoring & Logging

### Application Logs

**Location**: `C:\ProgramData\StarMaster\data\logs\`

**Log Files**:

- `error-YYYY-MM-DD.log` - Error level
- `warn-YYYY-MM-DD.log` - Warning level
- `info-YYYY-MM-DD.log` - Info level

**Log Retention**: 14 days (automatic cleanup)

### System Monitoring

**Thermal Status**:

- UI widget (bottom-right)
- API: `GET /api/hardware/thermal`
- Alerts at 85°C (warning), 95°C (critical)

**Memory Usage**:

- Thumbnail cache stats: `GET /api/system/cache/stats`
- Expected: < 6GB on Touch App, < 10GB on Master

**Disk Space**:

- Prune endpoint: `POST /api/system/maintenance/prune-sessions`
- Target: Keep 200GB+ free

---

## Production Checklist

### Pre-Deployment

- [ ] Build Master-App (`npm run package`)
- [ ] Build Touch-App (`npm run package`)
- [ ] Configure static IP for Master (192.168.1.100)
- [ ] Create firewall rules (port 8090)
- [ ] Set PowerShell execution policy (RemoteSigned)

### Post-Deployment

- [ ] Verify Master-App launches
- [ ] Verify Touch-App discovers Master
- [ ] Test photo import workflow
- [ ] Test order creation (Touch → Master)
- [ ] Configure Kiosk Mode on Touch PC
- [ ] Set up automated backups
- [ ] Test thermal monitoring
- [ ] Verify offline operation (unplug internet)

### Security

- [ ] Change default SESSION_SECRET and JWT_SECRET
- [ ] Enable Windows Firewall
- [ ] **Configure Kiosk Mode on Master PC** (prevent photographer file access)
- [ ] **Configure Kiosk Mode on Touch PC** (prevent guest access)
- [ ] Restrict Master user permissions (no admin rights)
- [ ] Restrict Touch user permissions (no admin rights)
- [ ] Disable unnecessary Windows services (Remote Desktop, etc.)
- [ ] Set BIOS boot password (both PCs)
- [ ] Disable USB mass storage (Group Policy) to prevent data theft
- [ ] Enable BitLocker disk encryption (optional, for data protection)

---

## Troubleshooting

### Master-App Won't Start

**Check**:

1. Database file exists: `C:\ProgramData\StarMaster\data\master.db`
2. Port 8090 not in use: `netstat -ano | findstr 8090`
3. Logs: `C:\ProgramData\StarMaster\data\logs\error-*.log`

**Solution**:

- Delete corrupt database (will recreate)
- Kill conflicting process
- Check Windows Event Viewer

### Touch-App Can't Discover Master

**Check**:

1. Master is running
2. Master firewall allows port 8090
3. Touch and Master on same subnet
4. Bonjour service running (Windows Services)

**Solution**:

- Manually set Master URL in Touch settings
- Restart Bonjour service
- Check router DHCP settings

### Performance Issues

**Symptoms**: Slow navigation, frozen UI, high CPU

**Solutions**:

1. Check thermal status (may be throttling)
2. Clear thumbnail cache: `POST /api/system/cache/clear`
3. Reduce album size (split large albums)
4. Increase RAM (8GB → 16GB for Touch)

---

## Next Steps

1. **Test in staging** environment before production
2. **Train staff** on basic troubleshooting
3. **Document** site-specific configuration (printer model, network topology)
4. **Schedule** regular backups and updates

**Verify**: Ready for production deployment?
