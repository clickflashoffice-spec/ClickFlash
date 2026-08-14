# Touch Kiosk App - Installation Guide

## Overview

The Touch Kiosk App is a standalone offline desktop application for customer-facing photo viewing and ordering. It syncs with Master app via Ethernet cable connection.

## System Requirements

- **OS**: Windows 10/11, macOS 10.15+, or Linux
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: Minimum 20GB free space (for photo storage)
- **Network**: Ethernet port for Master connection
- **Display**: Touch screen recommended

## Installation Steps

### 1. Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

### 2. Install Dependencies

```bash
cd star-master-touch
npm install
```

This will install all required dependencies including:
- React 19
- Electron (for desktop app)
- Backend server dependencies
- Database drivers

### 3. Configure Environment

Create a `.env` file in the root directory:

```env
# Backend Server Configuration
PORT=8091
DATA_DIR=./pb_data_touch
JWT_SECRET=your-secret-key-here

# Frontend Configuration
VITE_API_URL=http://localhost:8091
VITE_WS_URL=ws://localhost:8091

# Master Connection (configure after Master is set up)
MASTER_IP=192.168.1.100
MASTER_PORT=8090

# App Configuration
VITE_APP_NAME=Star Master Touch Kiosk
VITE_APP_MODE=production
```

**Important**: Generate a secure JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Initialize Database

The database will be created automatically on first run. To initialize with default user:

```bash
npm run init:db
```

### 5. Start Application

#### Development Mode
```bash
npm run dev
```
This starts both backend (port 8091) and frontend (port 5174)

#### Production Mode
```bash
npm run build
npm start
```

#### Using Batch Script (Windows)
```bash
start-touch.bat
```

## Network Configuration

### Connecting to Master App

1. **Configure Static IP** (Recommended)
   - Touch Kiosk IP: `192.168.1.101`
   - Subnet Mask: `255.255.255.0`
   - Master IP: `192.168.1.100` (configure in app settings)

2. **Firewall Settings**
   - Allow port 8091 through Windows Firewall
   - Allow outbound connections to Master (port 8090)

3. **Connection Setup in App**
   - Open Touch app
   - Go to Settings → Connection Settings
   - Enter Master IP: `192.168.1.100:8090`
   - Click "Test Connection"
   - Save settings

## Application Structure

```
star-master-touch/
├── backend/           # Backend server (Node.js)
│   ├── server.js     # Main server file
│   └── shared/       # Shared utilities
├── src/              # Frontend (React + TypeScript)
│   ├── components/   # React components
│   ├── services/     # API services (including sync)
│   └── utils/        # Utilities
├── pb_data_touch/    # Database and uploads (created at runtime)
├── package.json      # Dependencies
└── .env              # Configuration (create this)
```

## Features

- ✅ Customer photo gallery
- ✅ Face recognition search
- ✅ Product selection and ordering
- ✅ Checkout and payment
- ✅ Automatic sync with Master
- ✅ Offline operation
- ✅ Touch-optimized interface
- ✅ High-resolution photo display

## Sync Configuration

### Automatic Sync

- Sync runs automatically every 15 seconds
- Pulls finalized albums from Master
- Downloads high-resolution photos
- Pushes orders to Master

### Manual Sync

1. Open Settings → Sync Status
2. Click "Sync Now"
3. Monitor progress in real-time

## Troubleshooting

### Cannot Connect to Master

1. **Verify Master is Running**
   ```bash
   # From Touch kiosk, test connection
   curl http://192.168.1.100:8090/api/health
   ```

2. **Check Network Configuration**
   - Ensure both devices on same subnet
   - Ping Master: `ping 192.168.1.100`

3. **Check Firewall**
   - Allow outbound connections to Master
   - Check Windows Firewall settings

### Photos Not Syncing

1. **Check Sync Status**
   - Open Settings → Sync Status
   - Review error messages

2. **Verify Master Has Photos**
   - Ensure albums are finalized in Master
   - Check Master's uploads folder

3. **Check Disk Space**
   - Ensure sufficient space for photo downloads
   - Minimum 20GB recommended

### Port Already in Use
```bash
# Windows: Find process using port 8091
netstat -ano | findstr :8091

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## Support

For detailed connection guide with Master app, see:
- `MASTER_TOUCH_CONNECTION_GUIDE.md` (in root directory)

For application documentation, see:
- `README.md`

