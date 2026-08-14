# Star Master Photography OS - Touch Kiosk App Complete Setup Guide

**Version:** 4.1.0  
**Last Updated:** December 7, 2025  
**Platform:** Windows, macOS, Linux

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Prerequisites & Software Installation](#prerequisites--software-installation)
3. [Project Setup](#project-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Configuration](#environment-configuration)
6. [Building the Application](#building-the-application)
7. [Running the Application](#running-the-application)
8. [Master-Touch Connection Setup](#master-touch-connection-setup)
9. [Verification & Testing](#verification--testing)
10. [Kiosk Mode Configuration](#kiosk-mode-configuration)
11. [Troubleshooting](#troubleshooting)
12. [Advanced Configuration](#advanced-configuration)

---

## System Requirements

### Minimum Requirements

- **OS:** Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **CPU:** Intel Core i3 or equivalent (2 cores)
- **RAM:** 4 GB
- **Storage:** 5 GB free space
- **Display:** 1920x1080 touchscreen (recommended)
- **Network:** Ethernet or Wi-Fi for Master sync

### Recommended Requirements (Kiosk Hardware)

- **OS:** Windows 11 Pro
- **CPU:** Intel Core i5 or equivalent (4 cores)
- **RAM:** 8 GB
- **Storage:** 20 GB SSD
- **Display:** 21.5"+ touchscreen (1920x1080 or higher)
- **Network:** Gigabit Ethernet for optimal sync
- **Peripherals:** RFID reader (optional), Receipt printer (optional)

---

## Prerequisites & Software Installation

### 1. Node.js and npm

The Touch Kiosk App requires **Node.js 18.x or higher** and **npm 9.x or higher**.

#### Windows Installation (Recommended for Kiosks)

**Option A: Using Official Installer**

1. Download Node.js LTS from [https://nodejs.org/](https://nodejs.org/)
   - Choose "LTS" (Long Term Support) version
   - Download the Windows Installer (.msi) - **64-bit recommended**

2. Run the installer
   - Double-click the downloaded `.msi` file
   - Click "Next" through the installation wizard
   - Accept the license agreement
   - Choose installation directory (default: `C:\Program Files\nodejs\`)
   - **Important:** Ensure "Add to PATH" is checked
   - **Important:** Check "Automatically install the necessary tools" for native modules
   - Click "Install"

3. After installation, a PowerShell window may open to install additional tools
   - Press any key to continue
   - Wait for installation to complete (5-10 minutes)

4. Verify installation

   ```powershell
   # Open new PowerShell window
   node --version
   # Should output: v18.x.x or higher
   
   npm --version
   # Should output: 9.x.x or higher
   ```

**Option B: Using Chocolatey (Advanced)**

```powershell
# Run PowerShell as Administrator

# Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs-lts -y

# Verify
node --version
npm --version
```

#### macOS Installation

**Using Homebrew (Recommended):**

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@18

# Verify
node --version
npm --version
```

#### Linux Installation (Ubuntu/Debian)

```bash
# Update package index
sudo apt update

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### 2. Build Tools & Compilers

The Touch Kiosk App uses native modules that require compilation.

#### Windows (Kiosk Setup)

**Method 1: Automatic Installation (Recommended)**

When installing Node.js using the official installer, check the box:

- ✅ "Automatically install the necessary tools. This will also install Chocolatey."

This will install:

- Python 3
- Visual Studio Build Tools
- Windows SDK

**Method 2: Manual Installation**

```powershell
# Run PowerShell as Administrator

# Install Windows Build Tools
npm install --global windows-build-tools

# Or install Visual Studio Build Tools manually
# Download from: https://visualstudio.microsoft.com/downloads/
# Select "Build Tools for Visual Studio 2022"
# During installation, select "Desktop development with C++"

# Install Python
choco install python -y
```

**Verify Installation:**

```powershell
# Check Visual Studio Build Tools
where cl
# Should output: C:\Program Files (x86)\Microsoft Visual Studio\...\cl.exe

# Check Python
python --version
# Should output: Python 3.x.x
```

#### macOS

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Verify
xcode-select -p
# Should output: /Library/Developer/CommandLineTools
```

#### Linux

```bash
# Install build essentials
sudo apt-get install -y build-essential python3

# Verify
gcc --version
python3 --version
```

### 3. Git (Version Control)

#### Windows

```powershell
# Using Chocolatey
choco install git -y

# Or download installer from: https://git-scm.com/download/win
```

#### macOS

```bash
# Using Homebrew
brew install git
```

#### Linux

```bash
sudo apt-get install -y git
```

**Verify:**

```bash
git --version
```

### 4. Optional Software for Kiosk

#### Electron (for Desktop Kiosk Mode)

Already included in devDependencies, but can be installed globally:

```bash
npm install -g electron
```

#### PM2 (Process Manager)

```bash
npm install -g pm2
```

#### Windows Kiosk Mode Tools

For full kiosk lockdown on Windows:

- **Assigned Access** (Windows 10/11 Pro/Enterprise)
- **Shell Launcher** (Windows 10/11 Enterprise)
- **Kiosk Browser** (third-party)

---

## Project Setup

### 1. Download/Clone the Project

**If using Git:**

```bash
# Clone the repository
git clone https://github.com/yourusername/star-master-photography-os.git

# Navigate to Touch Kiosk directory
cd star-master-photography-os/apps/touch
```

**If using a ZIP file:**

1. Extract the ZIP file to your desired location
   - Recommended: `C:\StarMaster\apps\touch` (Windows)
   - Recommended: `/opt/starmaster/apps/touch` (Linux)
2. Open terminal/command prompt
3. Navigate to the Touch Kiosk directory

### 2. Install Dependencies

```bash
# Navigate to touch directory
cd apps/touch

# Clean install (recommended for first-time setup)
npm ci

# Or regular install
npm install
```

**What gets installed:**

**Production Dependencies:**

- `react` (19.2.0) - UI framework
- `react-dom` (19.2.0) - React DOM renderer
- `@tanstack/react-query` (5.90.10) - Data fetching
- `better-sqlite3` (12.4.6) - Local database
- `bcrypt` (5.1.0) - Password hashing
- `jsonwebtoken` (9.0.2) - Authentication
- `formidable` (2.1.5) - File uploads
- `dexie` (4.2.1) - IndexedDB wrapper (offline storage)
- `qrcode` (1.5.4) - QR code generation
- `@vladmandic/face-api` (1.7.15) - Face recognition (optional)
- And more...

**Development Dependencies:**

- `vite` (7.2.4) - Build tool
- `typescript` (5.9.3) - Type checking
- `tailwindcss` (3.4.18) - CSS framework
- `electron` (29.1.0) - Desktop app framework
- `electron-builder` (24.13.3) - Desktop app packager
- And more...

**Installation Time:** 3-7 minutes depending on internet speed

**Troubleshooting Installation:**

If native module compilation fails:

```bash
# Windows: Ensure Visual Studio Build Tools are installed
npm config set msvs_version 2022

# Rebuild native modules
npm rebuild better-sqlite3
npm rebuild bcrypt

# Or clean reinstall
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

---

## Database Configuration

The Touch Kiosk uses **SQLite** for local data storage and offline functionality.

### 1. Database Location

The database is stored in:

```
apps/touch/pb_data_touch/touch.db
```

### 2. Automatic Database Initialization

The database is automatically created when you first start the backend server.

**What happens automatically:**

1. Database file creation (`touch.db`)
2. Schema creation (all tables)
3. Default user creation (for kiosk admin)
4. Migrations application

### 3. Database Structure

The Touch Kiosk database mirrors the Master database structure:

- `users` - Kiosk administrators
- `albums` - Synced photo albums
- `photos` - Synced photos (metadata + files)
- `orders` - Customer orders (pending sync to Master)
- `products` - Product catalog (synced from Master)
- `kiosks` - Kiosk registration info
- `settings` - Kiosk settings

### 4. Offline Storage (IndexedDB)

In addition to SQLite, the Touch Kiosk uses IndexedDB for:

- Photo blob storage (for offline viewing)
- Sync queue management
- Temporary cart data

**Location:** Browser's IndexedDB storage

---

## Environment Configuration

### 1. Backend Environment Configuration

Create `backend/.env`:

```env
# Server Configuration
PORT=8091
NODE_ENV=development

# Security
JWT_SECRET=touch_kiosk_secret_change_this_in_production_min_32_chars

# Database
DATA_DIR=../pb_data_touch

# CORS Configuration
# Allow connections from frontend and Master backend
CORS_ORIGINS=http://localhost:5174,http://localhost:8090,http://MASTER_IP:8090

# File Upload Configuration
MAX_FILE_SIZE=52428800
UPLOAD_DIR=../pb_data_touch/uploads

# Master Connection (for sync)
MASTER_URL=http://MASTER_IP:8090
```

**Important Notes:**

1. **PORT**: Touch Kiosk uses port 8091 (different from Master's 8090)

2. **JWT_SECRET**: Generate a unique secret

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **MASTER_URL**: Replace `MASTER_IP` with your Master PC's IP address
   - Example: `http://192.168.1.50:8090`
   - Use `ipconfig` (Windows) or `ifconfig` (Linux/macOS) to find Master IP

4. **CORS_ORIGINS**: Include Master backend URL for sync

### 2. Frontend Environment Configuration

Create `.env.development`:

```env
# API Configuration
# Touch Kiosk connects to its own backend (port 8091)
VITE_API_URL=http://localhost:8091
VITE_API_TIMEOUT=30000

# WebSocket Configuration
VITE_WS_URL=ws://localhost:8091

# App Configuration
VITE_APP_NAME=Star Master Touch
VITE_APP_VERSION=4.1.0
VITE_APP_MODE=development

# Kiosk Configuration
VITE_KIOSK_IDLE_TIMEOUT=60000
VITE_KIOSK_SCREENSAVER_ENABLED=true
VITE_KIOSK_AUTO_PAIR=false

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_SYNC=true
VITE_ENABLE_RFID=false
VITE_ENABLE_FACE_RECOGNITION=false

# Debug Configuration
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

Create `.env.production`:

```env
# API Configuration
VITE_API_URL=http://localhost:8091
VITE_API_TIMEOUT=30000

# WebSocket Configuration
VITE_WS_URL=ws://localhost:8091

# App Configuration
VITE_APP_NAME=Star Master Touch
VITE_APP_VERSION=4.1.0
VITE_APP_MODE=production

# Kiosk Configuration
VITE_KIOSK_IDLE_TIMEOUT=60000
VITE_KIOSK_SCREENSAVER_ENABLED=true
VITE_KIOSK_AUTO_PAIR=true

# Feature Flags
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_SYNC=true
VITE_ENABLE_RFID=true
VITE_ENABLE_FACE_RECOGNITION=true

# Debug Configuration
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
```

---

## Building the Application

### 1. Development Build

```bash
# Frontend only (Vite dev server)
npm run dev

# Backend only
npm run dev:backend

# Both frontend and backend concurrently
npm run dev:full
```

**Access the application:**

- Frontend: <http://localhost:5174>
- Backend API: <http://localhost:8091>

### 2. Production Build

**Build Frontend:**

```bash
npm run build
```

**Output:**

- Location: `dist/touch/`
- Size: ~8-10 MB
- Build Time: 6-8 seconds

**Verify Build:**

```bash
npm run preview
```

### 3. Desktop Kiosk App Build (Electron)

**Build for Windows (Kiosk):**

```bash
npm run build:electron -- --win
```

**Output:**

- Location: `release/`
- Format: `.exe` installer
- Size: ~150-200 MB
- Build Time: 3-5 minutes

**Build for all platforms:**

```bash
npm run build:electron -- --win --mac --linux
```

---

## Running the Application

### 1. Development Mode

**Full Stack:**

```bash
npm run dev:full
```

This starts:

- Backend server on port 8091
- Frontend dev server on port 5174

### 2. Production Mode

**Option A: Using Batch Script (Windows)**

```powershell
# Start both backend and frontend
.\start_touch_unified.bat
```

**Option B: Using PM2 (Recommended)**

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
pm2 start backend/server.js --name touch-backend

# Serve frontend
pm2 serve dist/touch 5174 --name touch-frontend --spa

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

**Option C: Electron Desktop App**

```bash
# Run the built .exe installer
# Or run in development
npm run electron:dev
```

### 3. Kiosk Mode (Windows)

**Using Electron Kiosk Mode:**

The Electron app automatically runs in kiosk mode when built for production.

**Features:**

- Full-screen mode
- No window controls
- Disabled keyboard shortcuts (F11, Alt+F4, etc.)
- Auto-start on boot (optional)

---

## Master-Touch Connection Setup

### 1. Network Configuration

**Find Master PC IP Address:**

On Master PC:

```powershell
# Windows
ipconfig
# Look for "IPv4 Address" under active network adapter

# Linux/macOS
ifconfig
# or
ip addr show
```

**Example:** `192.168.1.50`

### 2. Update Touch Kiosk Configuration

**Update `backend/.env`:**

```env
# Replace MASTER_IP with actual IP
MASTER_URL=http://192.168.1.50:8090
CORS_ORIGINS=http://localhost:5174,http://192.168.1.50:8090
```

**Update `.env.production`:**

```env
# Master connection is configured in backend
# Frontend connects to local backend (8091)
VITE_API_URL=http://localhost:8091
```

### 3. Update Master Configuration

On Master PC, update `backend/.env`:

```env
# Add Touch Kiosk IP to CORS
# Replace TOUCH_IP with Touch PC's IP address
CORS_ORIGINS=http://localhost:5173,http://192.168.1.100:8091
```

### 4. Firewall Configuration

**On Master PC:**

Windows:

```powershell
# Allow port 8090
New-NetFirewallRule -DisplayName "Star Master Backend" -Direction Inbound -LocalPort 8090 -Protocol TCP -Action Allow
```

Linux:

```bash
sudo ufw allow 8090/tcp
```

**On Touch PC:**

Windows:

```powershell
# Allow port 8091
New-NetFirewallRule -DisplayName "Touch Kiosk Backend" -Direction Inbound -LocalPort 8091 -Protocol TCP -Action Allow
```

### 5. Test Connection

**From Touch PC:**

```bash
# Test connection to Master
curl http://192.168.1.50:8090/api/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

**From Master PC:**

```bash
# Test connection to Touch
curl http://192.168.1.100:8091/api/health
```

### 6. Pairing Process

1. Start Master App
2. Start Touch Kiosk App
3. On Touch Kiosk:
   - Click "Settings" (admin password required)
   - Go to "Connection Settings"
   - Enter Master IP: `192.168.1.50`
   - Click "Pair with Master"
4. On Master App:
   - Go to "Kiosks" section
   - Approve the pairing request
5. Verify connection status shows "Connected"

---

## Verification & Testing

### 1. Backend Server Verification

```bash
# Test health endpoint
curl http://localhost:8091/api/health

# Test authentication
curl -X POST http://localhost:8091/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@touch.local","password":"admin123"}'
```

### 2. Frontend Verification

1. Open browser to <http://localhost:5174>
2. You should see the Touch Kiosk welcome screen
3. Test touch interactions (if touchscreen available)
4. Verify idle timeout works (default: 60 seconds)

### 3. Sync Verification

1. Ensure Master is running
2. On Touch Kiosk, go to Settings → Sync
3. Click "Sync Now"
4. Verify:
   - Albums are synced from Master
   - Photos are downloaded
   - Products are synced
5. Check sync logs in `pb_data_touch/logs/`

### 4. Offline Mode Testing

1. Disconnect from network
2. Verify Touch Kiosk still works
3. Create a test order
4. Reconnect to network
5. Verify order syncs to Master

---

## Kiosk Mode Configuration

### 1. Windows Kiosk Mode (Assigned Access)

**Requirements:**

- Windows 10/11 Pro or Enterprise
- Local user account for kiosk

**Setup Steps:**

1. Create kiosk user account:

   ```powershell
   # Run as Administrator
   net user KioskUser Password123! /add
   ```

2. Configure Assigned Access:
   - Open Settings → Accounts → Family & other users
   - Under "Set up a kiosk", click "Assigned access"
   - Choose "Kiosk mode"
   - Select "KioskUser"
   - Choose the Touch Kiosk app

3. Auto-login configuration:

   ```powershell
   # Run as Administrator
   reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoAdminLogon /t REG_SZ /d 1 /f
   reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultUserName /t REG_SZ /d KioskUser /f
   reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultPassword /t REG_SZ /d Password123! /f
   ```

### 2. Auto-Start on Boot

**Using PM2:**

```bash
# Install PM2 globally
npm install -g pm2

# Start Touch Kiosk
pm2 start backend/server.js --name touch-backend
pm2 serve dist/touch 5174 --name touch-frontend --spa

# Save configuration
pm2 save

# Setup auto-start
pm2 startup
# Follow the instructions provided
```

**Using Windows Task Scheduler:**

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Touch Kiosk Startup"
4. Trigger: "When the computer starts"
5. Action: "Start a program"
6. Program: `C:\StarMaster\apps\touch\start_touch_unified.bat`

### 3. Disable Windows Features

For full kiosk lockdown:

```powershell
# Disable Windows key
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v NoWinKeys /t REG_DWORD /d 1 /f

# Disable Task Manager
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f

# Disable Alt+Tab
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v DisableTaskSwitching /t REG_DWORD /d 1 /f
```

**To re-enable (for maintenance):**

```powershell
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v NoWinKeys /f
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /f
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v DisableTaskSwitching /f
```

---

## Troubleshooting

### Common Issues

#### 1. Cannot Connect to Master

**Symptoms:** Sync fails, "Master unreachable" error

**Solutions:**

1. Verify Master is running:

   ```bash
   curl http://MASTER_IP:8090/api/health
   ```

2. Check network connectivity:

   ```bash
   ping MASTER_IP
   ```

3. Verify firewall rules on both PCs

4. Check CORS configuration in Master's `backend/.env`

#### 2. Sync Stuck or Failing

**Symptoms:** Photos not downloading, sync progress stuck

**Solutions:**

1. Check sync logs:

   ```
   pb_data_touch/logs/sync.log
   ```

2. Clear sync checkpoint:

   ```bash
   # Delete checkpoint file
   Remove-Item pb_data_touch/sync_checkpoint.json
   ```

3. Restart sync service:

   ```bash
   # Restart backend
   pm2 restart touch-backend
   ```

#### 3. Touchscreen Not Working

**Symptoms:** Touch input not recognized

**Solutions:**

1. Verify touchscreen drivers are installed

2. Calibrate touchscreen:
   - Windows: Settings → Devices → Pen & Windows Ink → Calibrate

3. Test in browser:
   - Open browser console
   - Check for touch events: `document.addEventListener('touchstart', e => console.log(e))`

#### 4. Idle Timeout Not Working

**Symptoms:** Kiosk doesn't return to welcome screen

**Solutions:**

1. Check environment variable:

   ```env
   VITE_KIOSK_IDLE_TIMEOUT=60000
   ```

2. Verify in browser console:

   ```javascript
   console.log(import.meta.env.VITE_KIOSK_IDLE_TIMEOUT)
   ```

3. Rebuild application:

   ```bash
   npm run build
   ```

#### 5. Database Locked

**Symptoms:** "SQLITE_BUSY: database is locked"

**Solutions:**

```bash
# Stop all instances
pm2 stop all

# Or kill Node processes
taskkill /F /IM node.exe  # Windows
killall node  # Linux/macOS

# Restart
npm run dev:backend
```

#### 6. Room Number Search Issues

**Symptoms:** "Find My Photos" returns no results for a known Room Number.

**Solutions:**

1. **Verify Master Data:** Ensure the album in the Master App actually has the Room Number assigned.
2. **Sync Status:** Ensure the Touch Kiosk has synced recently. Check `Settings > Sync`.
3. **Exact Match:** The search is an exact match (case-insensitive). "Room 101" is different from "101" if the data was entered as just "101". Ensure consistent entry practices.
4. **Database Inspection:** The Room Number is stored in the `roomNumber` column of the `albums` table in `touch.db`.

---

## Advanced Configuration

### 1. RFID Reader Integration

**Supported Readers:**

- USB HID RFID readers
- Serial port RFID readers

**Configuration:**

In `.env.production`:

```env
VITE_ENABLE_RFID=true
```

**Setup:**

1. Install RFID reader drivers
2. Connect reader to USB port
3. Test reader in Settings → Hardware → RFID
4. Configure card format and read settings

### 2. Receipt Printer Integration

**Supported Printers:**

- ESC/POS compatible thermal printers
- USB or Network printers

**Configuration:**

1. Install printer drivers
2. Set as default printer in Windows
3. Configure in Touch Kiosk Settings → Hardware → Printer

### 3. Face Recognition

**Requirements:**

- Webcam or USB camera
- Good lighting conditions

**Configuration:**

In `.env.production`:

```env
VITE_ENABLE_FACE_RECOGNITION=true
```

**Setup:**

1. Connect camera
2. Grant camera permissions
3. Test in Settings → Features → Face Recognition
4. Train face models (done automatically during use)

### 4. Custom Branding

**Logo:**

- Replace `public/logo.png` with your logo
- Recommended size: 200x200px

**Colors:**

- Edit `tailwind.config.js`:

  ```javascript
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
        secondary: '#your-color',
      }
    }
  }
  ```

**Rebuild after changes:**

```bash
npm run build
```

---

## Performance Optimization

### 1. Database Optimization

The SQLite database is already optimized with:

- WAL mode for better concurrency
- Proper indexing
- Optimized cache size

### 2. Photo Storage

**Recommendations:**

- Use SSD for `pb_data_touch/uploads/`
- Regularly clean old photos
- Configure max storage in Settings

### 3. Memory Management

**For long-running kiosks:**

1. Schedule daily restart:
   - Use Windows Task Scheduler
   - Restart at 3 AM daily

2. Monitor memory usage:

   ```bash
   pm2 monit
   ```

---

## Maintenance

### 1. Regular Tasks

**Daily:**

- Check sync status
- Verify disk space
- Review error logs

**Weekly:**

- Clean temporary files
- Backup database
- Update products/prices from Master

**Monthly:**

- Windows updates
- Application updates
- Hardware inspection

### 2. Backup Strategy

**Automated Backup:**

Create `backup-touch.bat`:

```batch
@echo off
set BACKUP_DIR=pb_data_touch\backups
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

xcopy /Y pb_data_touch\touch.db %BACKUP_DIR%\touch_%TIMESTAMP%.db
echo Backup completed: touch_%TIMESTAMP%.db
```

Schedule with Task Scheduler to run daily.

---

## Next Steps

1. ✅ Complete Touch Kiosk setup
2. ✅ Configure Master-Touch connection
3. ⏭️ Test full workflow (browse → select → order → sync)
4. ⏭️ Configure kiosk mode for production
5. ⏭️ Train staff on kiosk operation

---

## Support & Resources

- **Documentation:** See `QUICKSTART.md`, `DEPLOYMENT.md`
- **Logs:** `pb_data_touch/logs/`
- **Database:** `pb_data_touch/touch.db`
- **Sync Guide:** `SYNC_RESUME_GUIDE.md`

---

**Setup Complete!** 🎉

Your Touch Kiosk App is now fully configured and ready to use. Test the Master-Touch synchronization to ensure everything works correctly.
