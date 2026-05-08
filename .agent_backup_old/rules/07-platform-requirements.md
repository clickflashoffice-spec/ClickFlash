---
category: platforms
priority: high
---

# Platform Requirements

> **Platform Distribution Requirement**: Master-App and Touch-App must maintain actively running, production-ready versions across all platforms.

---

## Version Parity Mandate

All platforms must have **feature parity** and be **production-ready**:

| Platform | Status | Deployment Method |
|----------|--------|-------------------|
| **Web Version** | ✅ Required | Browser-based |
| **Electron Version** | ✅ Required | Desktop application |
| **NSIS Version** | ✅ Required | Windows installer |
| **Python Version** | ✅ Required | Standalone Python app |

> [!IMPORTANT]
> All versions must be maintained simultaneously. A feature added to one platform must be added to all others.

---

## Web Version

### Requirements

**Full-Screen Enforcement**:

```javascript
// Force full-screen mode
function enforceFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    }
}

// Prevent exiting full-screen
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        enforceFullScreen();
    }
});

// Auto-enter on load
window.addEventListener('load', enforceFullScreen);
```

**Focused View**:

```css
/* Disable text selection */
body {
    user-select: none;
    -webkit-user-select: none;
}

/* Hide scrollbars */
::-webkit-scrollbar {
    display: none;
}

/* Full viewport */
html, body {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}
```

### Technology Stack

- **Frontend**: React/Vue/Vanilla JS
- **Backend**: FastAPI (Python)
- **Database**: SQLite
- **Ports**: Master (8090), Touch (8091)

---

## Electron Version

### Requirements

**OS-Level Kiosk Mode**:

```javascript
// main.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        fullscreen: true,
        kiosk: true,  // Enable kiosk mode
        frame: false,  // Remove window frame
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    // Disable keyboard shortcuts
    win.setMenuBarVisibility(false);
    
    // Prevent closing
    win.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
        }
    });
    
    win.loadURL('http://localhost:8090');  // Master
    // win.loadURL('http://localhost:8091');  // Touch
}

app.whenReady().then(createWindow);
```

**Assigned Access Support** (Windows):

```javascript
// Disable Alt+F4, Alt+Tab, Windows key
const { globalShortcut } = require('electron');

app.whenReady().then(() => {
    globalShortcut.register('Alt+F4', () => {});
    globalShortcut.register('Alt+Tab', () => {});
    globalShortcut.register('CommandOrControl+W', () => {});
    globalShortcut.register('CommandOrControl+Q', () => {});
});
```

### Build Configuration

```json
// package.json
{
  "name": "master-app-electron",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "build": {
    "appId": "com.photoapp.master",
    "productName": "Master App",
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    }
  }
}
```

---

## NSIS Version

### Requirements

**Installer Configuration**:

```nsis
; installer.nsi
!define APP_NAME "Master App"
!define APP_VERSION "1.0.0"
!define PUBLISHER "Photo Studio"

; Include Modern UI
!include "MUI2.nsh"

; Installer settings
Name "${APP_NAME}"
OutFile "MasterAppSetup.exe"
InstallDir "$PROGRAMFILES\${APP_NAME}"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Installation
Section "Install"
    SetOutPath "$INSTDIR"
    
    ; Copy files
    File /r "dist\*.*"
    
    ; Create shortcuts
    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\MasterApp.exe"
    CreateShortcut "$SMPROGRAMS\${APP_NAME}.lnk" "$INSTDIR\MasterApp.exe"
    
    ; Configure Assigned Access
    ExecWait 'powershell -Command "Set-AssignedAccess -UserName PhotoUser -AppName MasterApp"'
    
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd
```

**Assigned Access Configuration**:

```powershell
# Configure Windows Assigned Access
$AppPath = "C:\Program Files\Master App\MasterApp.exe"

# Create kiosk user
New-LocalUser -Name "PhotoKiosk" -NoPassword

# Set assigned access
Set-AssignedAccess -UserName "PhotoKiosk" -AppUserModelId $AppPath

# Auto-login configuration
$RegPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
Set-ItemProperty -Path $RegPath -Name "AutoAdminLogon" -Value "1"
Set-ItemProperty -Path $RegPath -Name "DefaultUserName" -Value "PhotoKiosk"
```

---

## Python Version

### Requirements

**Python App Parity**:
> [!IMPORTANT]
> Python application versions must be **exact functional copies** of the web versions (Master and Touch) but implemented in Python.

**Technology Stack**:

- **Backend**: FastAPI + Uvicorn
- **Frontend**: PyQt6 (GUI)
- **Database**: SQLite + SQLAlchemy
- **Async**: asyncio + qasync

**Kiosk Mode Implementation**:

```python
# main.py
import sys
from PyQt6.QtWidgets import QApplication, QMainWindow
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QCursor

class KioskWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        
        # Full-screen kiosk mode
        self.showFullScreen()
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint
        )
        
        # Hide cursor (optional)
        # self.setCursor(QCursor(Qt.CursorShape.BlankCursor))
        
        # Disable close
        self.setWindowFlag(Qt.WindowType.WindowCloseButtonHint, False)
    
    def keyPressEvent(self, event):
        # Disable Alt+F4, Escape, etc.
        if event.key() in [Qt.Key.Key_Escape, Qt.Key.Key_F4]:
            event.ignore()
        else:
            super().keyPressEvent(event)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = KioskWindow()
    window.show()
    sys.exit(app.exec())
```

**Virtual Environment**:

```bash
# Master-App
.venv_master_311/

# Touch-App
.venv_touch_311/
```

**Dependencies** (requirements.txt):

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.0
aiosqlite>=0.20.0
pydantic>=2.6.0
pillow>=10.2.0
PyQt6>=6.6.0
qasync>=0.24.0
face_recognition>=1.3.0
opencv-python>=4.9.0
```

---

## Feature Parity Checklist

### Core Features (All Platforms)

- [ ] Photo import and display
- [ ] Album management
- [ ] Customer selection interface
- [ ] Order creation and processing
- [ ] Face recognition
- [ ] Asset tiering (tiny/preview/fulfillment)
- [ ] Offline operation
- [ ] Kiosk mode
- [ ] Port configuration (8090/8091)

### Platform-Specific Features

**Web**:

- [ ] Full-screen enforcement
- [ ] Browser compatibility (Chrome, Edge, Firefox)
- [ ] Responsive design

**Electron**:

- [ ] Native desktop integration
- [ ] System tray support
- [ ] Auto-updater

**NSIS**:

- [ ] Windows Assigned Access
- [ ] Auto-login configuration
- [ ] Silent installation option

**Python**:

- [ ] PyQt6 GUI
- [ ] Standalone executable
- [ ] Cross-platform support (Windows primary)

---

## Build Scripts

### Master-App

```bash
# Web
npm run build:master:web

# Electron
npm run build:master:electron

# NSIS
npm run build:master:nsis

# Python
cd "Master App Python"
python -m PyInstaller main.spec
```

### Touch-App

```bash
# Web
npm run build:touch:web

# Electron
npm run build:touch:electron

# NSIS
npm run build:touch:nsis

# Python
cd "Touch App Python"
python -m PyInstaller main.spec
```

---

## Deployment

### Web Version

```bash
# Start backend
cd "Master App Python/backend"
uvicorn main:app --host 0.0.0.0 --port 8090

# Serve frontend
cd "Master App Web/frontend"
npm run serve
```

### Electron Version

```bash
# Package for Windows
electron-builder --win

# Output: dist/Master App Setup.exe
```

### NSIS Version

```bash
# Build installer
makensis installer.nsi

# Output: MasterAppSetup.exe
```

### Python Version

```bash
# Run directly
cd "Master App Python"
python main.py

# Or build executable
pyinstaller main.spec
```

---

## Summary

| Platform | Kiosk Mode | Distribution | Primary Use |
|----------|-----------|--------------|-------------|
| **Web** | Full-screen | Browser | Development, testing |
| **Electron** | OS-level | Desktop app | Production (cross-platform) |
| **NSIS** | Assigned Access | Windows installer | Production (Windows) |
| **Python** | PyQt6 full-screen | Standalone | Production (all platforms) |

**Key Principle**: All platforms must have **identical functionality** with platform-appropriate implementations.
