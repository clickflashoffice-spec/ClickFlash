# ClickFlash Electron Architecture Guide

> **Version:** 4.2.0  
> **Last Updated:** June 2026  
> **Applies to:** `apps/master` (Master Portal) and `apps/touch` (Touch Kiosk)

---

## 1. Architecture

### 1.1 Process Model

ClickFlash Electron apps follow a **multi-process** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process (Node.js)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Electron   │  │   Express   │  │   KioskGuardian     │  │
│  │   Main API  │  │  Backend    │  │   (Win32 helper)    │  │
│  │             │  │  (:8090/91) │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘  │
│         │                │ fork()                             │
│         │                │                                    │
│         ▼                ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Renderer Process (Chromium)               │  │
│  │         React 19 + Vite-built frontend                 │  │
│  │              Loads via http://localhost:*               │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

| Process | Responsibility | Isolation |
|---------|---------------|-----------|
| **Main** | Window management, IPC, auto-updater, system tray, backend forking | Node.js full access |
| **Renderer** | UI rendering, user input, API calls to Express backend | `sandbox: true`, `nodeIntegration: false` |
| **Backend (forked)** | Express server, SQLite, business logic, file I/O | Runs as `ELECTRON_RUN_AS_NODE=1` child process |
| **KioskGuardian** | Windows-only helper that blocks OS-level shortcuts (Task Manager, etc.) | External Win32 executable, hash-verified |

### 1.2 IPC Bridge

Communication between renderer and main is strictly whitelisted in `preload.ts`:

```typescript
// Master Portal
const INVOKE_CHANNELS = [
  "kiosk:unlock", "kiosk:lock",
  "dialog:openDirectory", "dialog:openFile", "dialog:saveFile",
  "updater:check", "updater:download", "updater:install", "updater:status",
];

// Touch Kiosk
const INVOKE_CHANNELS = [
  "exit-kiosk", "enter-kiosk", "kiosk:unlock", "kiosk:lock",
  "get-app-version", "restart-app",
  "getPrinters", "print",
  "updater:check", "updater:status",
];
```

All other channels throw a synchronous error in the renderer.

### 1.3 Unified Port Design

Both apps serve the **frontend and backend on a single port**:
- **Master:** `:8090` — Express serves static Vite build + API + WebSocket
- **Touch:** `:8091` — Same unified port pattern

The renderer loads via `loadURL("http://localhost:PORT")` rather than `loadFile()`, enabling seamless API calls without CORS issues.

---

## 2. Master Portal

### 2.1 Kiosk Mode

When `app.isPackaged` is true, Master Portal launches in full kiosk lockdown:

```typescript
mainWindow = new BrowserWindow({
  fullscreen: true,
  kiosk: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  webPreferences: { devTools: false },
});
```

- **Menu bar:** Hidden (`setMenuBarVisibility(false)`)
- **Context menu:** Disabled (`preventDefault` on `context-menu` event)
- **DevTools shortcuts:** Blocked (`F12`, `Ctrl+Shift+I`, `Ctrl+R`, `Ctrl+U`, zoom keys)
- **OS shortcuts:** Blocked via `globalShortcut` (`Alt+Tab`, `Alt+F4`, `Super+*`)
- **KioskGuardian:** Spawned to block Task Manager and other OS-level escapes

### 2.2 Admin Unlock

A hidden unlock dialog is triggered by `CommandOrControl+Alt+Shift+X`:

1. Renderer shows PIN input overlay
2. PIN validated via `crypto.timingSafeEqual` (constant-time comparison)
3. Brute-force protection: 5 attempts → 15-minute lockout
4. On success: kiosk disabled, Guardian killed, window restored

### 2.3 Auto-Updater

See `src/main/autoUpdater.ts`. Key behaviors:
- `autoDownload: false` — User must confirm before download
- `autoInstallOnAppQuit: true` — Silent install on next quit
- `allowPrerelease: false` — Production releases only
- `allowDowngrade: false` — No rollback

Update flow:
1. Check on startup (10-second delay)
2. Dialog: "Download Now / Later"
3. Progress reported to renderer via `updater:progress`
4. Dialog: "Install & Restart / Later"
5. `autoUpdater.quitAndInstall()`

### 2.4 Crash Recovery

```typescript
const MAX_CRASHES = 3;
const CRASH_WINDOW = 60_000; // ms
```

- Renderer crash → auto-reload after 2s
- Kiosk mode restored after each reload
- If 3 crashes occur within 60s → fatal error screen (manual restart required)

### 2.5 System Tray

A tray icon provides:
- **Show ClickFlash** — Restore window
- **Lock Kiosk** — Re-enter kiosk mode
- **Quit ClickFlash** — Graceful shutdown

Double-click on tray icon restores the window.

### 2.6 Power Management

```typescript
powerSaveId = powerSaveBlocker.start("prevent-display-sleep");
```

Prevents screen blanking during long photography sessions. Stopped on graceful shutdown.

---

## 3. Touch Kiosk

### 3.1 LAN-Only Network Isolation

Touch Kiosk is designed to operate **without internet access**:

```typescript
const ALLOWED_HOSTS = [
  "localhost", "127.0.0.1",
  /^192\.168\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
];
```

- External HTTP/HTTPS requests are **cancelled**
- Referer headers are **stripped** before sending
- Only known service ports are allowed (`8090`, `8091`, `5173`, `80`, `443`)

### 3.2 OS Key Blocking

In addition to global shortcuts, Touch blocks renderer-level input:

```typescript
const blockedKeys = [
  "f1".."f12", "escape",
  // Ctrl+I/R/U/=/−/0 (DevTools, reload, view-source, zoom)
  // Alt+F4 (close window)
  // Meta/Super (OS menu)
];
```

### 3.3 Fullscreen Kiosk

Identical to Master Portal but with Touch-specific IPC:
- `enter-kiosk` / `exit-kiosk` — Toggle kiosk state
- `kiosk:unlock` — Admin PIN unlock (reads from DB `settings.password` or `KIOSK_PASSWORD` env)
- `kiosk:lock` — Re-enter kiosk mode

### 3.4 PIN Unlock

Touch supports two unlock paths:
1. **Admin PIN** (`ADMIN_PIN` env) — Unlocks kiosk without quitting
2. **Kiosk Password** (`KIOSK_PASSWORD` env or DB setting) — Quits the app entirely

Both use `crypto.timingSafeEqual` and enforce 5-attempt lockout (60 minutes for Touch).

---

## 4. Build Process

### 4.1 Pipeline Overview

```
Frontend (Vite)          Backend (esbuild)          Electron (tsc)
     │                        │                        │
     ▼                        ▼                        ▼
  dist/master/            dist/backend/            dist/electron/
  (React 19 bundle)       (server.js, workers)    (electron-main.js,
                                                   preload.js)
                            │                        │
                            └────────────────────────┘
                                         │
                                         ▼
                              electron-builder
                                         │
                                         ▼
                                   release/ (installer)
```

### 4.2 Frontend Build

```bash
vite build
```
- Target: modern browsers + Electron Chromium
- Output: `dist/master/` or `dist/touch/`

### 4.3 Backend Build

```bash
# Master
esbuild "server=backend/server.ts" \
  "workers/photoWorker=backend/workers/photoWorker.ts" \
  "main/autoUpdater=src/main/autoUpdater.ts" \
  --bundle --minify --platform=node --target=node20 \
  --outdir=dist/backend \
  --external:electron --external:electron-updater \
  --external:better-sqlite3-multiple-ciphers --external:sharp \
  --external:@napi-rs/canvas --external:bcryptjs ...

# Touch
esbuild backend/server.ts \
  --bundle --minify --platform=node --target=node20 \
  --outfile=dist/backend/server.js \
  --external:better-sqlite3-multiple-ciphers --external:sharp \
  --external:bcrypt --external:bonjour-service
```

### 4.4 Electron Build

```bash
tsc -p tsconfig.electron.json
```

- `tsconfig.electron.json` targets `ES2022` / `CommonJS`
- Includes: `electron-main.ts`, `preload.ts`
- Output: `dist/electron/`

### 4.5 Asset Copying

A post-build script (`scripts/copy-assets.ts`) copies:
- Static models (face detection) to `dist/models/`
- Helper scripts to `dist/helper_scripts/`
- Icons and tray assets

---

## 5. Native Dependencies

Native Node.js addons **must** be unpacked from the ASAR archive because `fork()` with `ELECTRON_RUN_AS_NODE=1` cannot read ASAR contents.

### 5.1 Master Portal (`electron-builder.yml`)

```yaml
asarUnpack:
  - "dist/backend/**/*"
  - "node_modules/better-sqlite3-multiple-ciphers"
  - "node_modules/better-sqlite3-multiple-ciphers/build/Release/*.node"
  - "node_modules/sharp"
  - "node_modules/sharp/build/Release/*.node"
  - "node_modules/sharp/vendor/**/*"
  - "node_modules/@img"
  - "node_modules/@img/sharp-win32-x64/**/*"
  - "node_modules/@img/sharp-win32-ia32/**/*"
  - "node_modules/@napi-rs"
  - "node_modules/@napi-rs/canvas-win32-x64-msvc/**/*"
  - "node_modules/@napi-rs/canvas-win32-x64/**/*"
```

### 5.2 Touch Kiosk (`electron-builder.json`)

```json
"asarUnpack": [
  "dist/backend/**/*",
  "node_modules/better-sqlite3-multiple-ciphers",
  "node_modules/sharp",
  "node_modules/@img",
  "node_modules/bcrypt"
]
```

### 5.3 Rebuild Notes

- `npmRebuild: false` — Prebuilt binaries are used
- `@electron/rebuild` is available in devDependencies for custom builds
- Sharp vendor libraries are platform-specific and must match the target arch

---

## 6. Auto-Updater

### 6.1 Provider Configuration

| App | GitHub Repo | Provider |
|-----|-------------|----------|
| Master | `clickflash/clickflash-master` | `github` |
| Touch | `clickflash/clickflash-touch` | `github` |

```yaml
publish:
  provider: github
  owner: clickflash
  repo: clickflash-master
  releaseType: release
  vPrefixedTagName: true
```

### 6.2 Delta Updates

`electron-updater` supports differential (delta) updates on Windows (NSIS) and macOS (zip). Delta patches reduce download size by ~70% for minor releases.

Requirements:
- `electron-builder` generates `.blockmap` files
- Delta patches are served alongside full installers on GitHub Releases

### 6.3 Rollback Protection

```typescript
autoUpdater.allowDowngrade = false;
```

If a release is pulled, the app simply stops updating until a higher version is published. Manual reinstall is required for emergency downgrades.

---

## 7. Distribution

### 7.1 Windows (NSIS)

```yaml
win:
  target: nsis
  icon: build/icon.ico
  requestedExecutionLevel: requireAdministrator
  forceCodeSigning: false        # Set true for production signing
  signAndEditExecutable: false

nsis:
  oneClick: true
  perMachine: true               # Install for all users
  deleteAppDataOnUninstall: true
  allowToChangeInstallationDirectory: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  runAfterFinish: true
  afterInstall: scripts/nsis-after-install.nsh
  afterRemove: scripts/nsis-after-remove.nsh
```

### 7.2 macOS (DMG / PKG)

*(Planned — not yet configured in current builder files)*

Recommended settings:
- `target: [dmg, pkg]`
- `category: public.app-category.photography`
- `hardenedRuntime: true`
- `gatekeeperAssess: false` (for notarization)

### 7.3 Linux (AppImage / DEB / RPM)

*(Planned — not yet configured in current builder files)*

Recommended settings:
- `target: [AppImage, deb, rpm]`
- `category: Graphics`
- `maintainer: ClickFlash Photography`

---

## 8. Debugging

### 8.1 DevTools

Enabled only when `!app.isPackaged`:

```typescript
devTools: !app.isPackaged,
```

In development:
- `Ctrl+Shift+I` opens DevTools
- React DevTools extension can be loaded
- Vite HMR is active

### 8.2 Logs

| Source | Location | Format |
|--------|----------|--------|
| Main process | Console (dev) / `logs/main.log` (prod) | `[Main] message` |
| Backend | Console prefixed with `[Backend]` | Structured JSON |
| Renderer | DevTools console | Standard browser logs |

Log directories:
- Windows: `%APPDATA%/ClickFlash Master OS/logs/`
- macOS: `~/Library/Application Support/ClickFlash Master OS/logs/`
- Linux: `~/.config/ClickFlash Master OS/logs/`

### 8.3 Crash Dumps

Electron crash reporter is not currently enabled. Crash details are available via:

```typescript
win.webContents.on("render-process-gone", (_e, details) => {
  console.error("Renderer crashed:", details.reason);
});
```

For deeper diagnostics, enable `@sentry/electron` (Sentry SDK is already included in dependencies).

---

## 9. Code Signing

### 9.1 Windows — Azure Trusted Signing

Current configuration (`forceCodeSigning: false`) allows unsigned builds for internal testing.

Production signing requires:
- Azure Trusted Signing account
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` env vars
- Certificate profile name in `electron-builder.yml`

```yaml
win:
  forceCodeSigning: true
  sign: scripts/azure-sign.js
```

### 9.2 macOS — Apple Developer ID + Notarization

Required for Gatekeeper compliance:
- Apple Developer ID Application certificate
- Apple Developer ID Installer certificate (for PKG)
- Notarization via `xcrun notarytool`

```yaml
mac:
  identity: "Developer ID Application: ClickFlash Photography (TEAM_ID)"
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
```

Notarization config:
```yaml
dmg:
  sign: false

afterSign: scripts/notarize.js
```

---

## 10. Best Practices

### 10.1 Single-Instance Lock

```typescript
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}
```

Prevents multiple Master / Touch processes from running simultaneously, avoiding port conflicts and database locks.

### 10.2 Graceful Shutdown

```typescript
function shutdown(): void {
  if (isQuitting) return;
  isQuitting = true;
  globalShortcut.unregisterAll();
  killGuardian();
  if (backendProcess && !backendProcess.killed) backendProcess.kill();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
  if (powerSaveId !== null) powerSaveBlocker.stop(powerSaveId);
  if (tray && !tray.isDestroyed()) tray.destroy();
  app.quit();
}
```

Called on:
- `before-quit`
- `window-all-closed` (non-macOS)
- `uncaughtException` in main process

### 10.3 Protocol Handlers

A custom `clickflash://` protocol is registered for secure local asset access:

```typescript
protocol.registerSchemesAsPrivileged([{
  scheme: "clickflash",
  privileges: { secure: true, standard: true, supportFetchAPI: true, allowServiceWorkers: true, bypassCSP: true },
}]);

protocol.handle("clickflash", (request) => {
  const url = new URL(request.url);
  const fullPath = path.normalize(path.join(dataDir, relativePath));
  if (!fullPath.startsWith(dataDir)) {
    return new Response("Access Denied", { status: 403 });
  }
  return net.fetch("file://" + fullPath);
});
```

**Security features:**
- Path traversal prevention (`fullPath.startsWith(dataDir)`)
- Directory traversal attempts logged as `[Security] clickflash:// Directory traversal attempt`
- Only files within `DATA_DIR` are accessible

### 10.4 Backend Health Polling

On startup, the main process polls `/api/health` until the backend is ready:

```typescript
const HEALTH_TIMEOUT = 120_000; // 2 minutes (migrations can take 90s+)
const POLL_INTERVAL = 300;      // ms
```

If the backend fails to start, a user-friendly error screen is shown with retry instructions.

### 10.5 KioskGuardian Integrity

Before spawning `KioskGuardian.exe`, the main process verifies its SHA-256 hash:

```typescript
const expectedHash = fs.readFileSync(hashPath, "utf8").trim();
const actualHash = sha256OfFile(gPath);
if (actualHash !== expectedHash) {
  dialog.showErrorBox("Security Alert",
    "KioskGuardian.exe has been tampered with. The application will not enter kiosk mode.");
  return;
}
```

Hash file is generated during packaging by `scripts/generate-guardian-hash.js` (`afterPack` hook).

---

*For build troubleshooting, see `AGENTS.md` and `docs/DEPLOYMENT_RUNBOOK.md`.*
