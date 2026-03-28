# Phase 71 Migration Guide

## Overview
This guide explains how to migrate from the old Electron architecture to the new Phase 71 rebuild.

## Key Changes

### 1. Process Architecture
- **Old**: Single main process with forked backend
- **New**: Strictly separated main, backend, and renderer processes with health monitoring

### 2. Kiosk Mode
- **Old**: Basic kiosk with some escape routes
- **New**: Strict kiosk with guardian process, no escape routes except admin PIN

### 3. IPC Communication
- **Old**: Direct IPC with many channels
- **New**: Whitelist-based IPC with strict typing and timeout protection

### 4. Error Recovery
- **Old**: Manual restart required on crashes
- **New**: Automatic restart with backoff strategy

## File Structure Changes

```
apps/master/
├── electron-main.js           # OLD (keep for reference)
├── electron-main-new.js       # NEW (entry point)
├── electron-new/              # NEW directory
│   ├── src/
│   │   ├── main/
│   │   │   ├── index.ts       # Main entry
│   │   │   ├── window-manager.ts
│   │   │   ├── process-manager.ts
│   │   │   └── kiosk-manager.ts
│   │   ├── preload/
│   │   │   └── index.ts       # Secure preload
│   │   ├── types/
│   │   │   └── electron.d.ts  # Type definitions
│   │   └── utils/
│   │       ├── constants.ts
│   │       └── logger.ts
│   ├── dist/                  # Compiled output
│   └── package.json
```

## Migration Steps

### Step 1: Build New Electron
```bash
cd apps/master/electron-new
npm run build
```

### Step 2: Update Package.json
Change main entry from:
```json
"main": "electron-main.js"
```
To:
```json
"main": "electron-main-new.js"
```

### Step 3: Test in Development
```bash
cd apps/master
npm run dev:electron:new
```

### Step 4: Build for Production
```bash
cd apps/master
npm run build:electron:new
npm run package:new
```

## Configuration

### Environment Variables
```bash
# Admin PIN for kiosk unlock (default: 000000)
ADMIN_PIN=your_secure_pin

# Development mode
NODE_ENV=development

# Backend port (default: 8090)
BACKEND_PORT=8090
```

### Kiosk Settings
Edit `src/utils/constants.ts`:
```typescript
KIOSK: {
  ADMIN_SHORTCUT: 'CommandOrControl+Alt+Shift+X',
  DEFAULT_PIN: '000000',
  GUARDIAN_PROCESS_NAME: 'KioskGuardian.exe',
}
```

## Troubleshooting

### Issue: Backend won't start
**Solution**: Check if port 8090 is available
```bash
netstat -ano | findstr :8090
```

### Issue: Kiosk mode not locking
**Solution**: Ensure KioskGuardian.exe is in the app directory

### Issue: High memory usage
**Solution**: Adjust limits in `src/utils/constants.ts`:
```typescript
MEMORY_LIMITS: {
  BACKEND_PROCESS: 4096,  // Reduce from 8192
}
```

## Rollback Plan

If issues occur:
1. Change `package.json` main back to `electron-main.js`
2. Rebuild: `npm run package`
3. Report issues to development team

## Support

Contact: development@clickflash.com
