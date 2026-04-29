const { app, BrowserWindow, ipcMain, screen, globalShortcut, session } = require('electron');
const path = require('path');
const crypto = require('crypto');

// ─── Auto-Updater (kiosk mode: silent, auto-install on quit) ────────────────
let autoUpdater = null;
function initAutoUpdater() {
    if (isDev) {
        console.log('[AutoUpdater] Skipped in development');
        return;
    }
    try {
        ({ autoUpdater } = require('electron-updater'));
        autoUpdater.logger              = console;
        autoUpdater.autoDownload        = true;   // Kiosk: download without prompting
        autoUpdater.autoInstallOnAppQuit = true;  // Install when the kiosk restarts
        autoUpdater.allowPrerelease     = false;
        autoUpdater.allowDowngrade      = false;

        autoUpdater.on('update-available',   (info) => console.log('[AutoUpdater] Update available:', info.version));
        autoUpdater.on('update-downloaded',  (info) => console.log('[AutoUpdater] Update ready to install:', info.version));
        autoUpdater.on('update-not-available', ()   => console.log('[AutoUpdater] Up to date'));
        autoUpdater.on('error',              (err)  => console.error('[AutoUpdater] Error:', err.message));

        // Initial check 30 s after launch; re-check every 4 h
        setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 30_000);
        setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);

        // IPC: allow admin UI to trigger a manual check
        ipcMain.handle('updater:check',  () => autoUpdater.checkForUpdates().catch(() => {}));
        ipcMain.handle('updater:status', () => ({ version: app.getVersion() }));

        console.log('[AutoUpdater] Initialized — auto-download enabled for kiosk mode');
    } catch (err) {
        console.warn('[AutoUpdater] Failed to initialize (electron-updater not available):', err.message);
    }
}
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND_PORT = 8091;
const APP_URL = `http://localhost:${BACKEND_PORT}`;
const isDev = process.env.NODE_ENV === 'development';

const ADMIN_PIN = process.env.ADMIN_PIN || null;
const DEFAULT_PIN = "000000";
const ADMIN_SHORTCUT = "CommandOrControl+Alt+Shift+X";

const pinAttempts = { count: 0, lockedUntil: 0 };
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 60 * 60 * 1000; // 60-min lockout → max 120 guesses/day for a 4-digit PIN

let mainWindow;

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        fullscreen: true,
        frame: false,
        kiosk: true,
        alwaysOnTop: true,
        title: "ClickFlash Touch Kiosk",
        backgroundColor: '#1e293b',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            devTools: isDev,
        },
    });

    mainWindow.loadURL(APP_URL);
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    setupSecurity();
    setupWindowEvents();
    setupShortcuts();
}

function setupSecurity() {
    if (!mainWindow) return;
    const wc = mainWindow.webContents;

    wc.on('will-navigate', (event, url) => {
        if (!url.startsWith(APP_URL) && !url.startsWith('data:') && !url.startsWith('file://')) {
            console.warn('[Security] Blocked navigation:', url);
            event.preventDefault();
        }
    });

    wc.on('will-redirect', (event, url) => {
        if (!url.startsWith(APP_URL) && !url.startsWith('data:') && !url.startsWith('file://')) {
            console.warn('[Security] Blocked redirect:', url);
            event.preventDefault();
        }
    });

    wc.on('context-menu', (e) => e.preventDefault());

    wc.on('before-input-event', (event, input) => {
        const k = input.key.toLowerCase();
        if (/^f(1[0-2]|[1-9])$/.test(k)) { event.preventDefault(); return; }
        if (input.control && ['i', 'r', 'u', '=', '-', '0'].includes(k)) {
            event.preventDefault(); return;
        }
        if (input.alt && k === 'f4') event.preventDefault();
    });

    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
}

function setupWindowEvents() {
    if (!mainWindow) return;

    const crashTracker = { count: 0, windowStart: Date.now() };
    const MAX_CRASHES = 3;
    const CRASH_WINDOW = 60_000;

    mainWindow.webContents.on('render-process-gone', (_e, details) => {
        console.error('[Touch] Renderer crashed:', details.reason);

        const now = Date.now();
        if (now - crashTracker.windowStart > CRASH_WINDOW) {
            crashTracker.count = 0;
            crashTracker.windowStart = now;
        }
        crashTracker.count += 1;

        if (crashTracker.count > MAX_CRASHES) {
            console.error(`[Touch] Renderer crashed ${crashTracker.count} times — stopping auto-reload`);
            if (!mainWindow.isDestroyed()) {
                mainWindow.loadURL("data:text/html,<h2 style='font-family:sans-serif;padding:2rem;color:#fff;background:#1e293b;height:100vh;display:flex;align-items:center;justify-content:center;text-align:center'>ClickFlash Touch Kiosk encountered a fatal error.<br>Please restart the application.</h2>");
            }
            return;
        }

        setTimeout(() => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            mainWindow.reload();
        }, 2000);
    });

    mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
        console.error('[Touch] did-fail-load:', code, desc);
    });
}

function setupShortcuts() {
    globalShortcut.register(ADMIN_SHORTCUT, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('kiosk:show-unlock-dialog');
        }
    });

    const toBlock = ['Alt+Tab', 'Alt+F4', 'Escape', 'Super', 'Super+D', 'Super+Tab', 'Super+L', 'Super+E'];
    for (const sc of toBlock) {
        try { globalShortcut.register(sc, () => false); } catch (_) { }
    }
}

function setupIpc() {
    ipcMain.handle('exit-kiosk', () => {
        if (mainWindow) {
            mainWindow.setKiosk(false);
            mainWindow.setFullScreen(false);
            mainWindow.setAlwaysOnTop(false);
        }
        return { success: true };
    });

    ipcMain.handle('enter-kiosk', () => {
        if (mainWindow) {
            mainWindow.setKiosk(true);
            mainWindow.setFullScreen(true);
            mainWindow.setAlwaysOnTop(true);
        }
        return { success: true };
    });

    ipcMain.handle('get-app-version', () => app.getVersion());

    ipcMain.handle('restart-app', () => {
        app.relaunch();
        app.exit(0);
    });

    ipcMain.handle('kiosk:unlock', (_e, pin) => {
        const expected = ADMIN_PIN || (!app.isPackaged ? DEFAULT_PIN : null);

        if (!expected) {
            return { success: false, error: "Kiosk unlock not configured" };
        }

        const now = Date.now();
        if (pinAttempts.lockedUntil > now) {
            const secsLeft = Math.ceil((pinAttempts.lockedUntil - now) / 1000);
            return { success: false, error: `Too many attempts. Try again in ${secsLeft}s` };
        }

        if (typeof pin !== 'string') pin = "";

        let isValid = true;
        if (pin.length !== expected.length) {
            isValid = false;
            crypto.timingSafeEqual(Buffer.alloc(expected.length), Buffer.alloc(expected.length));
        } else {
            isValid = crypto.timingSafeEqual(Buffer.from(pin, 'utf8'), Buffer.from(expected, 'utf8'));
        }

        if (!isValid) {
            pinAttempts.count += 1;
            if (pinAttempts.count >= PIN_MAX_ATTEMPTS) {
                pinAttempts.lockedUntil = now + PIN_LOCKOUT_MS;
                pinAttempts.count = 0;
                return { success: false, error: "Too many attempts. Locked for 60 minutes" };
            }
            return { success: false, error: "Invalid PIN" };
        }

        pinAttempts.count = 0;
        pinAttempts.lockedUntil = 0;

        if (mainWindow) {
            mainWindow.setKiosk(false);
            mainWindow.setFullScreen(false);
            mainWindow.setAlwaysOnTop(false);
        }
        return { success: true };
    });

    ipcMain.handle('kiosk:lock', () => {
        if (mainWindow) {
            mainWindow.setKiosk(true);
            mainWindow.setFullScreen(true);
            mainWindow.setAlwaysOnTop(true);
        }
        return { success: true };
    });
}

app.whenReady().then(() => {
    session.defaultSession.setContentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "clickflash://"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "http://localhost:*"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    });

    setupIpc();
    createWindow();
    initAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('web-contents-created', (_e, wc) => {
    wc.setWindowOpenHandler(() => ({ action: 'deny' }));
    wc.on('will-attach-webview', (event) => {
        event.preventDefault();
    });
});

process.on('uncaughtException', (err) => {
    console.error('[Touch] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('[Touch] Unhandled promise rejection:', reason);
});
