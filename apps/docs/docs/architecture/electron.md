---
sidebar_position: 3
title: Electron Architecture
description: Detailed guide to the Electron architecture for Master Portal and Touch Kiosk desktop applications.
---

# ClickFlash Electron Architecture Guide

> **Version:** 4.2.0  
> **Applies to:** `apps/master` (Master Portal) and `apps/touch` (Touch Kiosk)

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
| **KioskGuardian** | Windows-only helper that blocks OS-level shortcuts | External Win32 executable, hash-verified |

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

- **Menu bar:** Hidden
- **Context menu:** Disabled
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

Key behaviors:
- `autoDownload: false` — User must confirm before download
- `autoInstallOnAppQuit: true` — Silent install on next quit
- `allowPrerelease: false` — Production releases only
- `allowDowngrade: false` — No rollback

### 2.4 Crash Recovery

- Renderer crash → auto-reload after 2s
- Kiosk mode restored after each reload
- If 3 crashes occur within 60s → fatal error screen (manual restart required)

## 3. Touch Kiosk

### 3.1 LAN-Only Network Isolation

Touch Kiosk operates **without internet access**:

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

### 3.2 PIN Unlock

Touch supports two unlock paths:
1. **Admin PIN** (`ADMIN_PIN` env) — Unlocks kiosk without quitting
2. **Kiosk Password** (`KIOSK_PASSWORD` env or DB setting) — Quits the app entirely

Both use `crypto.timingSafeEqual` and enforce 5-attempt lockout (60 minutes for Touch).

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

## 5. Native Dependencies

Native Node.js addons **must** be unpacked from the ASAR archive because `fork()` with `ELECTRON_RUN_AS_NODE=1` cannot read ASAR contents.

## 6. Auto-Updater

| App | GitHub Repo | Provider |
|-----|-------------|----------|
| Master | `clickflash/clickflash-master` | `github` |
| Touch | `clickflash/clickflash-touch` | `github` |

`electron-updater` supports differential (delta) updates on Windows (NSIS) and macOS (zip). Delta patches reduce download size by ~70% for minor releases.

## 7. Distribution

### Windows (NSIS)

```yaml
win:
  target: nsis
  icon: build/icon.ico
  requestedExecutionLevel: requireAdministrator

nsis:
  oneClick: true
  perMachine: true
  deleteAppDataOnUninstall: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  runAfterFinish: true
```

### macOS (DMG / PKG)

*(Planned — not yet configured)*

### Linux (AppImage / DEB / RPM)

*(Planned — not yet configured)*

## 8. Code Signing

### Windows — Azure Trusted Signing

Production signing requires:
- Azure Trusted Signing account
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` env vars

### macOS — Apple Developer ID + Notarization

Required for Gatekeeper compliance:
- Apple Developer ID Application certificate
- Notarization via `xcrun notarytool`

## 9. Best Practices

- **Single-Instance Lock**: Prevents multiple processes from running simultaneously
- **Graceful Shutdown**: Unregisters shortcuts, kills Guardian, stops power saver, destroys windows
- **Protocol Handlers**: Custom `clickflash://` protocol with path traversal prevention
- **Backend Health Polling**: Polls `/api/health` for up to 2 minutes on startup
- **KioskGuardian Integrity**: SHA-256 hash verification before spawning
