---
category: security
priority: critical
---

# Kiosk Mode

> **Mandatory Requirement**: Both Master-App and Touch-App must operate as a shell environment for secure, dedicated usage.

---

## Overview

Kiosk mode ensures that the application runs in a **locked-down, dedicated environment** where users cannot:

- Access other applications
- Exit the photo workflow
- Use system shortcuts (Alt+Tab, Windows key, etc.)
- Access file explorer or system settings

---

## Web Version

### Full-Screen Enforcement

```javascript
// kiosk.js
class KioskMode {
  constructor() {
    this.init();
  }

  init() {
    // Enter full-screen on load
    this.enterFullScreen();

    // Monitor full-screen changes
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        this.enterFullScreen();
      }
    });

    // Prevent context menu
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    // Disable F11 (full-screen toggle)
    document.addEventListener("keydown", (e) => {
      if (e.key === "F11") {
        e.preventDefault();
      }
    });
  }

  enterFullScreen() {
    const elem = document.documentElement;

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }
}

// Initialize on load
window.addEventListener("load", () => {
  new KioskMode();
});
```

### CSS Lockdown

```css
/* kiosk.css */

/* Disable text selection */
* {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Hide scrollbars */
::-webkit-scrollbar {
  display: none;
}

body {
  overflow: hidden;
}

/* Full viewport */
html,
body {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* Prevent drag and drop */
* {
  -webkit-user-drag: none;
  user-drag: none;
}
```

---

## Electron Version

### Kiosk Configuration

```javascript
// main.js
const { app, BrowserWindow, globalShortcut } = require('electron');

let mainWindow;

function createKioskWindow() {
    mainWindow = new BrowserWindow({
        fullscreen: true,
        kiosk: true,  // Enable kiosk mode
        frame: false,  // Remove window frame
        alwaysOnTop: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: false  // Disable dev tools in production
        }
    });

    // Load app
    mainWindow.loadURL('http://localhost:8090');  // Master
    // mainWindow.loadURL('http://localhost:8091');  // Touch

    // Prevent window close
    mainWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            return false;
        }
    });

    // Remove menu bar
    mainWindow.setMenuBarVisibility(false);
}

### Admin Escape Hatch (IPC Tunnel)
To securely bypass Kiosk Mode for maintenance without rebooting:
1. Double-click or rapidly click (5 times) the top-left Logo inside the React app.
2. Enter the secure 6-digit Admin PIN.
3. The React app fires `window.electron.ipcRenderer.invoke('kiosk:unlock', pin)`.
4. Electron gracefully sets `kiosk: false` and `alwaysOnTop: false` and suspends the KioskGuardian process, allowing access to the underlying OS.

function registerShortcuts() {
    // Disable all system shortcuts
    const shortcuts = [
        'Alt+F4',           // Close window
        'Alt+Tab',          // Switch apps
        'CommandOrControl+W',  // Close tab
        'CommandOrControl+Q',  // Quit app
        'F11',              // Full-screen toggle
        'Escape',           // Exit full-screen
        'CommandOrControl+R',  // Reload
        'F5',               // Reload
        'CommandOrControl+Shift+I',  // Dev tools
        'F12'               // Dev tools
    ];

    shortcuts.forEach(shortcut => {
        globalShortcut.register(shortcut, () => {
            // Do nothing - shortcut disabled
        });
    });
}

app.whenReady().then(() => {
    createKioskWindow();
    registerShortcuts();
});

app.on('window-all-closed', () => {
    // Prevent app from closing
    if (process.platform !== 'darwin') {
        // Don't quit
    }
});

// Cleanup shortcuts on quit
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
```

### Assigned Access Support

```javascript
// windows-assigned-access.js
const { exec } = require("child_process");
const os = require("os");

function configureAssignedAccess() {
  if (os.platform() !== "win32") {
    console.log("Assigned Access is Windows-only");
    return;
  }

  // PowerShell script to configure Assigned Access
  const script = `
        $AppPath = "${process.execPath}"
        $UserName = "PhotoKiosk"
        
        # Create kiosk user if doesn't exist
        try {
            Get-LocalUser -Name $UserName
        } catch {
            New-LocalUser -Name $UserName -NoPassword
        }
        
        # Set assigned access
        Set-AssignedAccess -UserName $UserName -AppUserModelId $AppPath
    `;

  exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
    if (error) {
      console.error("Failed to configure Assigned Access:", error);
    } else {
      console.log("Assigned Access configured successfully");
    }
  });
}

module.exports = { configureAssignedAccess };
```

---

## NSIS Version

### Installer Configuration

```nsis
; kiosk-installer.nsi

!define APP_NAME "Master App"
!define KIOSK_USER "PhotoKiosk"

Section "Install"
    ; ... (standard installation)

    ; Configure kiosk mode
    ExecWait 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\configure-kiosk.ps1"'
SectionEnd
```

### PowerShell Configuration Script

```powershell
# configure-kiosk.ps1

$AppName = "Master App"
$AppPath = "$env:ProgramFiles\$AppName\MasterApp.exe"
$KioskUser = "PhotoKiosk"

# Create kiosk user
Write-Host "Creating kiosk user..."
try {
    Get-LocalUser -Name $KioskUser -ErrorAction Stop
    Write-Host "User already exists"
} catch {
    New-LocalUser -Name $KioskUser -NoPassword -Description "Kiosk mode user for $AppName"
    Write-Host "User created successfully"
}

# Disable password expiration
Set-LocalUser -Name $KioskUser -PasswordNeverExpires $true

# Configure auto-login
Write-Host "Configuring auto-login..."
$RegPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
Set-ItemProperty -Path $RegPath -Name "AutoAdminLogon" -Value "1"
Set-ItemProperty -Path $RegPath -Name "DefaultUserName" -Value $KioskUser
Set-ItemProperty -Path $RegPath -Name "DefaultPassword" -Value ""

# Configure Assigned Access
Write-Host "Configuring Assigned Access..."
Set-AssignedAccess -UserName $KioskUser -AppUserModelId $AppPath

# Configure Shell Launcher (alternative to Assigned Access)
# This makes the app the Windows shell
$RegPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
Set-ItemProperty -Path $RegPath -Name "Shell" -Value $AppPath

Write-Host "Kiosk mode configured successfully"
Write-Host "Restart the computer and log in as $KioskUser to activate kiosk mode"
```

---

## Python Version

### PyQt6 Kiosk Implementation

```python
# kiosk_window.py
import sys
from PyQt6.QtWidgets import QApplication, QMainWindow, QWidget
from PyQt6.QtCore import Qt, QEvent
from PyQt6.QtGui import QCursor, QKeySequence

class KioskWindow(QMainWindow):
    """Full-screen kiosk mode window"""

    def __init__(self, app_name="Master App"):
        super().__init__()

        self.app_name = app_name
        self.setup_kiosk_mode()

    def setup_kiosk_mode(self):
        """Configure window for kiosk mode"""

        # Full-screen without frame
        self.showFullScreen()
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.CustomizeWindowHint
        )

        # Set window title
        self.setWindowTitle(self.app_name)

        # Disable window close button
        self.setWindowFlag(Qt.WindowType.WindowCloseButtonHint, False)

        # Optional: Hide cursor
        # self.setCursor(QCursor(Qt.CursorShape.BlankCursor))

        # Disable context menu
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)

    def keyPressEvent(self, event):
        """Disable keyboard shortcuts"""

        # List of disabled keys
        disabled_keys = [
            Qt.Key.Key_Escape,      # Exit full-screen
            Qt.Key.Key_F4,          # Close window
            Qt.Key.Key_F11,         # Toggle full-screen
            Qt.Key.Key_Alt,         # Alt key
            Qt.Key.Key_Meta,        # Windows key
            Qt.Key.Key_Control,     # Ctrl key (when alone)
        ]

        # Disable Alt+F4
        if event.key() == Qt.Key.Key_F4 and event.modifiers() == Qt.KeyboardModifier.AltModifier:
            event.ignore()
            return

        # Disable Ctrl+Q (quit)
        if event.key() == Qt.Key.Key_Q and event.modifiers() == Qt.KeyboardModifier.ControlModifier:
            event.ignore()
            return

        # Disable Ctrl+W (close)
        if event.key() == Qt.Key.Key_W and event.modifiers() == Qt.KeyboardModifier.ControlModifier:
            event.ignore()
            return

        # Disable single key presses
        if event.key() in disabled_keys:
            event.ignore()
            return

        # Allow other keys
        super().keyPressEvent(event)

    def closeEvent(self, event):
        """Prevent window close"""
        event.ignore()

    def eventFilter(self, obj, event):
        """Filter system events"""

        # Disable Alt+Tab
        if event.type() == QEvent.Type.KeyPress:
            if event.key() == Qt.Key.Key_Tab and event.modifiers() == Qt.KeyboardModifier.AltModifier:
                return True

        return super().eventFilter(obj, event)
```

### Application Startup

```python
# main.py
import sys
from PyQt6.QtWidgets import QApplication
from kiosk_window import KioskWindow
import qasync
import asyncio

async def main():
    """Main application entry point"""

    # Create Qt application
    app = QApplication(sys.argv)

    # Install event filter for kiosk mode
    app.installEventFilter(app)

    # Create kiosk window
    window = KioskWindow(app_name="Master App")

    # Load your UI here
    # window.setCentralWidget(your_main_widget)

    # Show window
    window.show()

    # Run event loop
    await qasync.QEventLoop(app).run_forever()

if __name__ == '__main__':
    try:
        qasync.run(main())
    except KeyboardInterrupt:
        pass
```

---

## Security Best Practices

### Disable System Access

```python
# Disable file dialogs (if not needed)
from PyQt6.QtWidgets import QFileDialog

class RestrictedFileDialog(QFileDialog):
    """File dialog with restricted access"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Restrict to specific directories only
        self.setDirectory("d:/master os/New folder/Master App Python/local/uploads")

        # Disable navigation to other folders
        self.setOption(QFileDialog.Option.ReadOnly, True)
```

### Logging and Monitoring

```python
# Log all user actions
import logging

logging.basicConfig(
    filename='kiosk_activity.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def log_user_action(action: str):
    """Log user actions for security monitoring"""
    logging.info(f"User action: {action}")
```

---

## Platform Comparison

| Feature               | Web        | Electron  | NSIS      | Python    |
| --------------------- | ---------- | --------- | --------- | --------- |
| **Full-Screen**       | ✅ Browser | ✅ Native | ✅ Native | ✅ PyQt6  |
| **Disable Shortcuts** | ⚠️ Limited | ✅ Yes    | ✅ Yes    | ✅ Yes    |
| **Assigned Access**   | ❌ No      | ⚠️ Manual | ✅ Auto   | ⚠️ Manual |
| **Auto-Login**        | ❌ No      | ⚠️ Manual | ✅ Auto   | ⚠️ Manual |
| **Shell Replacement** | ❌ No      | ⚠️ Manual | ✅ Auto   | ⚠️ Manual |

---

## Testing Kiosk Mode

### Test Checklist

- [ ] Application starts in full-screen
- [ ] Cannot exit full-screen with Escape or F11
- [ ] Alt+Tab does not switch applications
- [ ] Alt+F4 does not close application
- [ ] Windows key does not open Start menu
- [ ] Context menu is disabled
- [ ] Cannot access file explorer
- [ ] Cannot access task manager
- [ ] Auto-login works (if configured)
- [ ] Application restarts on crash

### Test Script

```python
def test_kiosk_mode():
    """Test kiosk mode functionality"""

    tests = {
        "Full-screen": lambda: window.isFullScreen(),
        "Frameless": lambda: window.windowFlags() & Qt.WindowType.FramelessWindowHint,
        "Always on top": lambda: window.windowFlags() & Qt.WindowType.WindowStaysOnTopHint,
        "No close button": lambda: not (window.windowFlags() & Qt.WindowType.WindowCloseButtonHint),
    }

    for test_name, test_func in tests.items():
        result = "✓" if test_func() else "✗"
        print(f"{result} {test_name}")
```

---

## Summary

**Kiosk Mode Requirements**:

1. **Full-Screen**: Application runs in full-screen mode
2. **No Exit**: Users cannot exit the application
3. **Disabled Shortcuts**: System shortcuts are disabled
4. **Locked Down**: No access to other applications or system features
5. **Auto-Start**: Application starts automatically on boot (optional)

**Implementation Priority**:

- **Web**: Basic full-screen (limited security)
- **Electron**: Full kiosk mode with shortcut disabling
- **NSIS**: Complete lockdown with Assigned Access
- **Python**: Full kiosk mode with PyQt6

All platforms must implement kiosk mode appropriate to their capabilities.
