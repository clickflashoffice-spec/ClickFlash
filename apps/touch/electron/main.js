const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// Both dev and prod load via Express on port 8091 — unified single port.
// Dev: run `vite build --watch` for incremental rebuilds served by Express.
const BACKEND_PORT = 8091;
const APP_URL = `http://localhost:${BACKEND_PORT}`;
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        fullscreen: true, // Start in fullscreen for kiosk mode
        frame: false, // Frameless for kiosk
        kiosk: true, // Enable kiosk mode
        alwaysOnTop: true, // Keep window on top
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
        },
        backgroundColor: '#1e293b', // Match app theme
        show: false, // Don't show until ready
    });

    // Load app via Express — dev + prod unified on port 8091
    mainWindow.loadURL(APP_URL);
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Prevent navigation away from app — allow only same Express origin
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith(APP_URL)) {
            event.preventDefault();
        }
    });

    // Block keyboard shortcuts for Kiosk Mode
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // Block DevTools (Ctrl+Shift+I, F12)
        if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
            event.preventDefault();
        }
        // Block Reload (Ctrl+R, F5)
        if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
            event.preventDefault();
        }
        // Block Fullscreen Toggle (F11)
        if (input.key === 'F11') {
            event.preventDefault();
        }
        // Block Closing (Alt+F4)
        if (input.alt && input.key.toLowerCase() === 'f4') {
            event.preventDefault();
        }
    });

    // Prevent new windows
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('exit-kiosk', () => {
    if (mainWindow) {
        mainWindow.setKiosk(false);
        mainWindow.setFullScreen(false);
    }
});

ipcMain.handle('enter-kiosk', () => {
    if (mainWindow) {
        mainWindow.setKiosk(true);
        mainWindow.setFullScreen(true);
    }
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('restart-app', () => {
    app.relaunch();
    app.exit(0);
});

// Disable hardware acceleration if needed for compatibility
// app.disableHardwareAcceleration();

// Security: Disable remote module
app.on('web-contents-created', (event, contents) => {
    contents.on('will-attach-webview', (event) => {
        event.preventDefault();
    });
});
