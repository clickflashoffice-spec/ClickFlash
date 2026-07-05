# ClickFlash Auto-Updater Configuration

> **Version:** 4.2.0
> **Platform:** Windows (NSIS + Electron Updater)
> **Status:** Ready for implementation

---

## 🔄 AUTO-UPDATE ARCHITECTURE

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ClickFlash    │────▶│  Update Server  │────▶│   GitHub/AWS    │
│   App (EXE)     │     │  (Cloudflare)   │     │   Release CDN   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 1. Check for updates  │                       │
        │ 2. Download delta   │                       │
        │ 3. Verify signature │                       │
        │ 4. Install & restart  │                       │
```

---

## 📦 UPDATE SERVER SETUP

### Cloudflare Worker (Update API)

```typescript
// workers/update-server/src/index.ts
export interface UpdateManifest {
  version: string;
  releaseDate: string;
  url: string;
  signature: string;
  size: number;
  releaseNotes: string;
  minimumVersion?: string;
  forceUpdate?: boolean;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const app = url.searchParams.get('app'); // master, touch, installer
    const currentVersion = url.searchParams.get('version');
    const platform = url.searchParams.get('platform') || 'win32';
    
    // Fetch latest release from GitHub
    const release = await getLatestRelease(app);
    
    if (!release) {
      return new Response('No updates available', { status: 404 });
    }
    
    // Check if update is required
    const hasUpdate = compareVersions(currentVersion, release.version) < 0;
    
    if (!hasUpdate) {
      return new Response(JSON.stringify({ upToDate: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      upToDate: false,
      manifest: release
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### GitHub Releases Structure

```
clickflash-releases/
├── master/
│   ├── latest.yml                    # Electron updater metadata
│   ├── ClickFlash-Master-4.2.0.exe   # Full installer
│   ├── ClickFlash-Master-4.2.0.exe.blockmap
│   └── RELEASES                      # Windows delta updates
├── touch/
│   ├── latest.yml
│   ├── ClickFlash-Touch-4.2.0.exe
│   └── ...
└── installer/
    ├── latest.yml
    ├── ClickFlash-Studio-5.0.0.exe
    └── ...
```

---

## ⚙️ ELECTRON MAIN PROCESS CONFIG

```typescript
// electron-main.ts - Auto-updater integration
import { autoUpdater } from 'electron-updater';
import { dialog, ipcMain } from 'electron';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const UPDATE_SERVER_URL = 'https://updates.clickflash.app';

function initAutoUpdater(mainWindow: BrowserWindow) {
  // Skip in development
  if (!app.isPackaged) return;
  
  autoUpdater.logger = console;
  autoUpdater.autoDownload = false; // Manual approval for now
  autoUpdater.autoInstallOnAppQuit = true;
  
  // Set update server
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: `${UPDATE_SERVER_URL}/${app.name}`,
    channel: 'stable'
  });
  
  // Check on startup
  checkForUpdates();
  
  // Periodic checks
  setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
  
  // IPC handlers for renderer
  ipcMain.handle('update:check', checkForUpdates);
  ipcMain.handle('update:download', () => autoUpdater.downloadUpdate());
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall());
  
  // Events
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', info);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `ClickFlash ${info.version} is available`,
      detail: 'Would you like to download and install it?',
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update:downloaded', info);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded successfully',
      detail: 'The application will restart to install the update.',
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
  
  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);
    mainWindow.webContents.send('update:error', err.message);
  });
}

async function checkForUpdates() {
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.error('[AutoUpdater] Check failed:', err);
  }
}
```

---

## 🖥️ RENDERER PROCESS UI

```typescript
// src/components/UpdateNotification.tsx
import { useEffect, useState } from 'react';
import { ipcRenderer } from 'electron';

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  useEffect(() => {
    ipcRenderer.on('update:available', (_, info) => {
      setUpdateInfo(info);
    });
    
    ipcRenderer.on('update:progress', (_, progress) => {
      setDownloadProgress(progress.percent);
    });
    
    ipcRenderer.on('update:downloaded', () => {
      setUpdateInfo(prev => ({ ...prev, ready: true }));
    });
    
    return () => {
      ipcRenderer.removeAllListeners('update:available');
      ipcRenderer.removeAllListeners('update:progress');
      ipcRenderer.removeAllListeners('update:downloaded');
    };
  }, []);
  
  if (!updateInfo) return null;
  
  return (
    <div className="update-notification">
      <div className="update-content">
        <h3>🔄 Update Available</h3>
        <p>Version {updateInfo.version} is ready to install</p>
        
        {updateInfo.downloading ? (
          <div className="progress-bar">
            <div className="progress" style={{ width: `${downloadProgress}%` }} />
            <span>{Math.round(downloadProgress)}%</span>
          </div>
        ) : (
          <button onClick={() => ipcRenderer.invoke('update:download')}>
            Download Update
          </button>
        )}
        
        {updateInfo.ready && (
          <button onClick={() => ipcRenderer.invoke('update:install')}>
            Restart & Install
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## 🔐 SECURITY REQUIREMENTS

### Code Signing (Required for Auto-Update)

```yaml
# electron-builder.yml
win:
  certificateFile: "C:\\certs\\clickflash.p12"
  certificatePassword: "${env.CERT_PASSWORD}"
  signAndEditExecutable: true
  
  # Verify signature before installing
  verifyUpdateCodeSignature: true
```

### Update Verification

```typescript
// Verify update signature before installation
async function verifyUpdate(filePath: string, signature: string): Promise<boolean> {
  const crypto = require('crypto');
  const fs = require('fs');
  
  const publicKey = fs.readFileSync('public-key.pem');
  const fileBuffer = fs.readFileSync(filePath);
  
  const verifier = crypto.createVerify('SHA256');
  verifier.update(fileBuffer);
  
  return verifier.verify(publicKey, signature, 'base64');
}
```

---

## 📊 UPDATE ROLLOUT STRATEGY

### Phased Rollout

| Phase | Percentage | Duration | Criteria |
|-------|-----------|----------|----------|
| Canary | 5% | 24 hours | No critical errors |
| Beta | 25% | 48 hours | Error rate < 0.1% |
| Production | 100% | Ongoing | Sentry clean |

### Rollback Procedure

```bash
# Emergency rollback
1. Disable update server
2. Push previous version to "latest"
3. Notify affected users
4. Investigate issue
```

---

## 🚀 IMPLEMENTATION CHECKLIST

- [ ] Purchase code signing certificate
- [ ] Set up GitHub releases repository
- [ ] Deploy Cloudflare update worker
- [ ] Configure electron-builder for auto-update
- [ ] Add update UI to renderer
- [ ] Test update flow on clean VM
- [ ] Set up Sentry monitoring for updates
- [ ] Document rollback procedures
- [ ] Create update notification design
- [ ] Implement forced updates for critical fixes

---

## 💰 COST ESTIMATE

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Code signing cert | $200/year | DigiCert or Sectigo |
| GitHub LFS | $5 | For large EXE files |
| Cloudflare Worker | $0 | Free tier sufficient |
| CDN bandwidth | $0-20 | Depends on user count |
| **Total** | **~$25/month** | |

---

## 📁 FILES TO CREATE

| File | Purpose |
|------|---------|
| `workers/update-server/` | Cloudflare update API |
| `src/components/UpdateNotification.tsx` | UI component |
| `scripts/release-publish.ts` | Automated release script |
| `.github/workflows/release.yml` | CI/CD pipeline |

---

**Next: Implement auto-updater after code signing certificate is purchased.**
