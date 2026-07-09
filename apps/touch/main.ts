import {
    app,
    BrowserWindow,
    ipcMain,
    session,
    powerSaveBlocker,
    globalShortcut,
    IpcMainInvokeEvent,
} from "electron";
import * as path from "path";
import * as http from "http";
import * as fs from "fs";
import * as os from "os";
import * as crypto from "crypto";
import { fork, ChildProcess } from "child_process";
import Database from "better-sqlite3-multiple-ciphers";
import { initAutoUpdater } from "./autoUpdater";

// Load environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config();

// ─── PIN unlock state (module-level so it survives IPC re-registration) ──────
const pinAttempts = { count: 0, lockedUntil: 0 };
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 60 * 60 * 1000; // 60-minute lockout
const ADMIN_SHORTCUT = "CommandOrControl+Alt+Shift+X";

interface AppConfig {
    appName: string;
    appMode: string;
    frontendPort: number;
    backendPort: number;
    width: number;
    height: number;
}

/**
 * Rule 05: Universal Environment Parity
 * Touch App Main Process - Secure Kiosk Mode
 */

class TouchApp {
    private config: AppConfig;
    private mainWindow: BrowserWindow | null;
    private backendProcess: ChildProcess | null;
    private server: http.Server | null;
    private serverPort: number | null;
    private useViteDevServer: boolean;
    private powerSaveId: number | null;

    constructor() {
        this.config = {
            appName: "ClickFlash - Touch Kiosk",
            appMode: "touch",
            frontendPort: parseInt(process.env["FRONTEND_PORT"] ?? "8001", 10) || 8001,
            backendPort: parseInt(process.env["TOUCH_BACKEND_PORT"] ?? "8091", 10) || 8091,
            width: 1440,
            height: 900,
        };

        this.mainWindow = null;
        this.backendProcess = null;
        this.server = null;
        this.serverPort = null;
        this.useViteDevServer = false;
        this.powerSaveId = null;

        this.init();
    }

    private init(): void {
        const gotTheLock = app.requestSingleInstanceLock();
        if (!gotTheLock) {
            app.quit();
            return;
        }

        app.on("second-instance", () => {
            if (this.mainWindow) {
                if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                this.mainWindow.focus();
            }
        });

        app.whenReady().then(() => {
            this.setupNetworkIsolation();
            this.startServer();

            app.on("activate", () => {
                if (!this.mainWindow) this.createWindow();
            });
        }).catch((err: unknown) => {
            const e = err instanceof Error ? err : new Error(String(err));
            console.error("[Touch] app.whenReady failed:", e.message);
        });

        app.on("will-quit", () => {
            this.stopBackend();
            if (this.powerSaveId !== null && powerSaveBlocker.isStarted(this.powerSaveId)) {
                powerSaveBlocker.stop(this.powerSaveId);
            }
            globalShortcut.unregisterAll();
        });

        app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                if (this.server) this.server.close();
                this.stopBackend();
                app.quit();
            }
        });
    }

    private setupNetworkIsolation(): void {
        // Law 06: Touch Local Fetch (Strict Isolation)
        // Phase 34: Hardened LAN-Only Mode
        const ALLOWED_HOSTS: Array<string | RegExp> = [
            "localhost",
            "127.0.0.1",
            /^192\.168\.\d+\.\d+$/,
            /^10\.\d+\.\d+\.\d+$/,
            /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // Private Class B
        ];

        // Phase 34: Only allow known service ports
        const ALLOWED_PORTS = [
            8090, // Master backend
            8091, // Touch backend
            5173, // Vite dev server (dev only)
            80,   // HTTP fallback
            443,  // HTTPS fallback
            0,    // Default port (no port specified)
        ];

        session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
            try {
                const url = new URL(details.url);

                if (
                    url.protocol === "devtools:" ||
                    url.protocol === "chrome-extension:"
                ) {
                    callback({});
                    return;
                }

                const isLocal = ALLOWED_HOSTS.some((pattern) => {
                    if (typeof pattern === "string") return url.hostname === pattern;
                    return pattern.test(url.hostname);
                });

                if (!isLocal) {
                    console.warn(`[Security] Blocked external request in Touch App: ${details.url}`);
                    callback({ cancel: true });
                    return;
                }

                const port = parseInt(url.port) || 0;
                if (port > 0 && !ALLOWED_PORTS.includes(port)) {
                    console.warn(`[Security] Blocked request to unauthorized port ${port}: ${details.url}`);
                    callback({ cancel: true });
                    return;
                }

                callback({});
            } catch {
                console.warn(`[Security] Blocked malformed URL: ${details.url}`);
                callback({ cancel: true });
            }
        });

        // Phase 34: Strip Referer headers to prevent internal structure leaks
        session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
            const headers = { ...details.requestHeaders };
            delete headers["Referer"];
            callback({ requestHeaders: headers });
        });

        // CSP via response headers (correct Electron API)
        const CSP_POLICY = [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: clickflash://",
            "font-src 'self' data:",
            "connect-src 'self' http://localhost:*",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join("; ");

        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    "Content-Security-Policy": [CSP_POLICY],
                },
            });
        });
    }

    private getMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const map: Record<string, string> = {
            ".html": "text/html",
            ".js": "application/javascript",
            ".mjs": "application/javascript",
            ".css": "text/css",
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
        };
        return map[ext] ?? "text/plain";
    }

    private checkViteServer(callback: (isVite: boolean) => void): void {
        const testReq = http.get(
            "http://127.0.0.1:5173",
            { timeout: 2000 },
            (res) => {
                if (res.statusCode === 200) {
                    let data = "";
                    res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
                    res.on("end", () => {
                        const isVite =
                            !!res.headers["x-vite"] ||
                            data.includes("vite") ||
                            data.includes("@vite");
                        callback(isVite);
                    });
                } else {
                    callback(false);
                }
            },
        );

        testReq.on("error", () => callback(false));
        testReq.on("timeout", () => {
            testReq.destroy();
            callback(false);
        });
    }

    private startServer(): void {
        if (!app.isPackaged && process.env["NODE_ENV"] !== "production") {
            this.checkViteServer((viteAvailable) => {
                if (viteAvailable) {
                    this.useViteDevServer = true;
                    this.serverPort = 5173;
                    this.startBackend();
                    setTimeout(() => this.createWindow(), 1000);
                } else {
                    this.startInternalServer();
                }
            });
        } else {
            this.startInternalServer();
        }
    }

    private startInternalServer(): void {
        this.server = http.createServer((req, res) => {
            if (req.url === "/api/ip") {
                const results: Array<{ name: string; ip: string }> = [];
                const nets = os.networkInterfaces();
                for (const name of Object.keys(nets)) {
                    for (const net of nets[name] ?? []) {
                        if (net.family === "IPv4" && !net.internal) {
                            results.push({ name, ip: net.address });
                        }
                    }
                }
                if (results.length === 0) results.push({ name: "Loopback", ip: "127.0.0.1" });
                res.writeHead(200, {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                });
                res.end(JSON.stringify({ interfaces: results }));
                return;
            }

            if (req.url === "/api/mode") {
                res.writeHead(200, {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                });
                res.end(JSON.stringify({
                    mode: this.config.appMode,
                    backendPort: this.config.backendPort,
                }));
                return;
            }

            const appMode = this.config.appMode;
            const candidates = [
                path.join(__dirname, "dist", appMode),
                path.join(process.cwd(), "resources/app.asar.unpacked/dist", appMode),
                path.join(path.dirname(process.execPath), "resources/app.asar.unpacked/dist", appMode),
                path.join(__dirname, "../../dist", appMode)
            ];
            const baseDir = candidates.find(c => fs.existsSync(path.join(c, "index.html"))) || candidates[0];

            let safePath = path
                .normalize((req.url ?? "/").split("?")[0])
                .replace(/^(\.\.[/\\])+/, "");
            if (safePath === "." || safePath === "/" || safePath === "\\") {
                safePath = "index.html";
            }

            let filePath = path.join(baseDir, safePath);
            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                if (!path.extname(safePath)) {
                    filePath = path.join(baseDir, "index.html");
                } else {
                    res.writeHead(404);
                    res.end("Not found");
                    return;
                }
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end("Error loading file");
                    return;
                }
                const headers: Record<string, string> = {
                    "Content-Type": this.getMimeType(filePath),
                    "Access-Control-Allow-Origin": "*",
                };
                if (path.extname(filePath).toLowerCase() === ".html") {
                    const isProduction =
                        process.env["NODE_ENV"] === "production" || app.isPackaged;
                    const CSP = isProduction
                        ? "default-src 'self'; script-src 'self'; object-src 'none'; frame-src 'none';"
                        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'none';";
                    headers["Content-Security-Policy"] = CSP;
                }
                res.writeHead(200, headers);
                res.end(data);
            });
        });

        this.server.listen(this.config.frontendPort, "0.0.0.0", () => {
            const addr = this.server!.address();
            this.serverPort = typeof addr === "object" && addr ? addr.port : this.config.frontendPort;
            this.startBackend();
            this.createWindow();
        });
    }

    private startBackend(): void {
        const isPackaged = app.isPackaged;
        const dataDir = isPackaged
            ? path.join(app.getPath("userData"), "pb_data")
            : path.join(__dirname, "pb_data");

        let serverScript = isPackaged
            ? path.join(process.resourcesPath, "backend", this.config.appMode, "server.js")
            : path.join(__dirname, "../../backend/touch/server.js");

        if (!fs.existsSync(serverScript) && !isPackaged) {
            serverScript = path.join(__dirname, "dist", "backend", "server.js");
        }

        // Fallback: check if backend is in app.asar.unpacked (for native modules)
        if (!fs.existsSync(serverScript) && isPackaged) {
            const unpackedPath = path.join(process.resourcesPath, "app.asar.unpacked", "dist", "backend", "server.js");
            if (fs.existsSync(unpackedPath)) {
                serverScript = unpackedPath;
            }
        }

        if (fs.existsSync(serverScript)) {
            const isDev = !isPackaged && process.env["NODE_ENV"] !== "production";
            const env = {
                ...process.env,
                PORT: String(this.config.backendPort),
                DATA_DIR: dataDir,
                NODE_ENV: isDev ? "development" : "production",
            };

            if (isDev) {
                console.log("[Touch] Dev mode — backend started externally on port", this.config.backendPort);
                return;
            }

            console.log(`[Touch] Starting backend from: ${serverScript}`);
            console.log(`[Touch] Data directory: ${dataDir}`);

            this.backendProcess = fork(serverScript, [], {
                stdio: "inherit",
                env,
                execArgv: ["--max-old-space-size=4096"],
            });

            this.backendProcess.on("error", (err) => {
                console.error("[Touch] Backend process error:", err);
            });

            this.backendProcess.on("exit", (code, signal) => {
                console.log(`[Touch] Backend exited with code ${code} (signal: ${signal})`);
            });
        } else {
            console.error(`[Touch] Backend script not found at: ${serverScript}`);
            console.error("[Touch] Backend will not start — kiosk may not function properly");
        }
    }

    private stopBackend(): void {
        if (this.backendProcess) {
            this.backendProcess.kill();
            this.backendProcess = null;
        }
    }

    private createWindow(): void {
        if (!this.serverPort) return;

        this.mainWindow = new BrowserWindow({
            width: this.config.width,
            height: this.config.height,
            title: this.config.appName,
            fullscreen: app.isPackaged,
            kiosk: app.isPackaged,
            alwaysOnTop: app.isPackaged,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                webSecurity: true,
                preload: path.join(__dirname, "preload.js"),
            },
            autoHideMenuBar: true,
            backgroundColor: "#0f172a",
            icon: path.join(__dirname, "../../icon.ico"),
        });

        this.mainWindow.setMenu(null);

        // Law 16: Lockdown & Splash Screen Resilience
        void this.mainWindow.loadURL(
            `data:text/html,<html><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><div style="color:#06b6d4;font-size:32px;font-weight:bold;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">ClickFlash Touch</div><div style="color:#475569;font-size:16px;letter-spacing:2px;">Initializing Kiosk...</div></div></body></html>`,
        );

        this.setupIpcHandlers();

        // Phase 36: Server Polling (Prevents blank screen on slow startup)
        const waitForServer = (maxWait = 60000, interval = 500): void => {
            const start = Date.now();
            const url = `http://127.0.0.1:${this.serverPort}?mode=${this.config.appMode}`;

            const tryLoad = (): void => {
                const elapsed = Date.now() - start;
                if (elapsed > maxWait) {
                    console.error("[Electron] Server did not respond, loading anyway.");
                    void this.mainWindow?.loadURL(url);
                    return;
                }

                const req = http.get(
                    `http://localhost:${this.config.backendPort}/api/health`,
                    (res) => {
                        res.resume();
                        if ((res.statusCode ?? 500) < 500) {
                            console.log(`[Electron] Backend ready after ${elapsed}ms. Loading UI...`);
                            void this.mainWindow?.loadURL(url);
                        } else {
                            setTimeout(tryLoad, interval);
                        }
                    },
                );

                req.on("error", () => setTimeout(tryLoad, interval));
                req.setTimeout(400, () => {
                    req.destroy();
                    setTimeout(tryLoad, interval);
                });
            };

            tryLoad();
        };

        waitForServer();

        // Initialize auto-updater
        initAutoUpdater(this.mainWindow);

        // Prevent display sleep — kiosk must never blank the screen
        this.powerSaveId = powerSaveBlocker.start("prevent-display-sleep");

        // Global shortcuts: admin unlock dialog + OS-level key blocking
        try {
            globalShortcut.register(ADMIN_SHORTCUT, () => {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send("kiosk:show-unlock-dialog");
                }
            });
            for (const sc of ["Alt+Tab", "Super", "Super+D", "Super+Tab", "Super+L", "Super+E"]) {
                try {
                    globalShortcut.register(sc, () => false);
                } catch { /* non-critical */ }
            }
        } catch (err: unknown) {
            const e = err instanceof Error ? err : new Error(String(err));
            console.warn("[Touch] Global shortcut registration failed:", e.message);
        }

        this.setupSecurityFilters();

        // Crash Recovery: Auto-restore kiosk and reload on renderer crash
        this.mainWindow.webContents.on("render-process-gone", (_event, details) => {
            console.error(`[Kiosk] Renderer crashed: ${details.reason}. Recovering...`);
            setTimeout(() => {
                if (!this.mainWindow) return;
                void this.mainWindow.loadURL(
                    `http://127.0.0.1:${this.serverPort}?mode=${this.config.appMode}`,
                );
            }, 1000);
        });

        this.mainWindow.on("closed", () => { this.mainWindow = null; });
    }

    private setupIpcHandlers(): void {
        ipcMain.removeHandler("exit-kiosk");
        ipcMain.handle("exit-kiosk", async (_event: IpcMainInvokeEvent, password: unknown) => {
            let KIOSK_PASSWORD: string | null = null;

            try {
                const isPackaged = app.isPackaged;
                const dataDir = isPackaged
                    ? path.join(app.getPath("userData"), "pb_data")
                    : path.join(__dirname, "pb_data");
                const dbPath = path.join(dataDir, "touch.db");

                if (fs.existsSync(dbPath)) {
                    const db = new Database(dbPath, { readonly: true });
                    const row = db
                        .prepare("SELECT value FROM settings WHERE key = 'password'")
                        .get() as { value: string } | undefined;
                    if (row?.value) {
                        KIOSK_PASSWORD = row.value;
                    }
                    db.close();
                }
            } catch (err: unknown) {
                const e = err instanceof Error ? err : new Error(String(err));
                console.error("[Electron] Failed to read password from DB:", e.message);
            }

            if (KIOSK_PASSWORD === null) {
                KIOSK_PASSWORD = process.env["KIOSK_PASSWORD"] ?? null;
            }

            if (KIOSK_PASSWORD === null) {
                console.error("[Electron] Kiosk exit password not configured. Set KIOSK_PASSWORD env var or 'password' setting in DB.");
                return false;
            }

            if (typeof password !== "string") return false;
            let isValid: boolean;
            if (password.length !== KIOSK_PASSWORD.length) {
                const dummy = Buffer.alloc(KIOSK_PASSWORD.length);
                crypto.timingSafeEqual(dummy, dummy);
                isValid = false;
            } else {
                const p1 = Buffer.from(password, "utf8");
                const p2 = Buffer.from(KIOSK_PASSWORD, "utf8");
                isValid = crypto.timingSafeEqual(p1, p2);
            }

            if (isValid) {
                app.quit();
                return true;
            }
            return false;
        });

        // ── Kiosk mode toggle ──────────────────────────────────────────────────────
        ipcMain.removeHandler("enter-kiosk");
        ipcMain.handle("enter-kiosk", () => {
            if (this.mainWindow) {
                this.mainWindow.setKiosk(true);
                this.mainWindow.setFullScreen(true);
                this.mainWindow.setAlwaysOnTop(true);
            }
            return { success: true };
        });

        ipcMain.removeHandler("kiosk:lock");
        ipcMain.handle("kiosk:lock", () => {
            if (this.mainWindow) {
                this.mainWindow.setKiosk(true);
                this.mainWindow.setFullScreen(true);
                this.mainWindow.setAlwaysOnTop(true);
            }
            return { success: true };
        });

        // ── App lifecycle ──────────────────────────────────────────────────────────
        ipcMain.removeHandler("get-app-version");
        ipcMain.handle("get-app-version", () => app.getVersion());

        ipcMain.removeHandler("restart-app");
        ipcMain.handle("restart-app", () => {
            app.relaunch();
            app.exit(0);
        });

        // ── PIN unlock with attempt lockout ────────────────────────────────────────
        ipcMain.removeHandler("kiosk:unlock");
        ipcMain.handle("kiosk:unlock", (_event: IpcMainInvokeEvent, rawPin: unknown) => {
            const expected = process.env["ADMIN_PIN"] ?? (!app.isPackaged ? "000000" : null);
            if (!expected) {
                return { success: false, error: "Kiosk unlock not configured. Set ADMIN_PIN env var." };
            }

            const now = Date.now();
            if (pinAttempts.lockedUntil > now) {
                const secsLeft = Math.ceil((pinAttempts.lockedUntil - now) / 1000);
                return { success: false, error: `Too many attempts. Try again in ${secsLeft}s` };
            }

            const pin = typeof rawPin === "string" ? rawPin : "";
            let isValid: boolean;
            if (pin.length !== expected.length) {
                crypto.timingSafeEqual(Buffer.alloc(expected.length), Buffer.alloc(expected.length));
                isValid = false;
            } else {
                isValid = crypto.timingSafeEqual(Buffer.from(pin, "utf8"), Buffer.from(expected, "utf8"));
            }

            if (!isValid) {
                pinAttempts.count += 1;
                if (pinAttempts.count >= PIN_MAX_ATTEMPTS) {
                    pinAttempts.lockedUntil = now + PIN_LOCKOUT_MS;
                    pinAttempts.count = 0;
                    return { success: false, error: "Too many attempts. Locked for 60 minutes." };
                }
                return { success: false, error: "Invalid PIN" };
            }

            pinAttempts.count = 0;
            pinAttempts.lockedUntil = 0;
            if (this.mainWindow) {
                this.mainWindow.setKiosk(false);
                this.mainWindow.setFullScreen(false);
                this.mainWindow.setAlwaysOnTop(false);
            }
            return { success: true };
        });

        ipcMain.removeHandler("getPrinters");
        ipcMain.handle("getPrinters", async () => {
            try {
                return await this.mainWindow?.webContents.getPrintersAsync() ?? [];
            } catch {
                return [];
            }
        });

        ipcMain.removeHandler("print");
        ipcMain.handle("print", (_event: IpcMainInvokeEvent, options: unknown) => {
            return new Promise<boolean>((resolve, reject) => {
                if (!options || typeof options !== "object") {
                    reject(new Error("Invalid print options"));
                    return;
                }
                const opts = options as Record<string, unknown>;
                const safeOptions = {
                    silent: typeof opts["silent"] === "boolean" ? opts["silent"] : true,
                    printBackground: true,
                    deviceName: typeof opts["printer"] === "string" ? opts["printer"] : "",
                };
                this.mainWindow?.webContents.print(safeOptions, (success, errorType) => {
                    if (!success) reject(new Error(errorType));
                    else resolve(true);
                });
            });
        });
    }

    private setupSecurityFilters(): void {
        this.mainWindow?.webContents.on("before-input-event", (event, input) => {
            const blockedKeys = [
                "f1", "f2", "f3", "f4", "f5", "f6",
                "f7", "f8", "f9", "f10", "f11", "f12",
                "escape",
            ];
            const key = input.key.toLowerCase();
            if (blockedKeys.includes(key)) event.preventDefault();

            if (input.control && ["i", "r", "u", "=", "-", "0"].includes(key))
                event.preventDefault();
            if (input.alt && key === "f4") event.preventDefault();
            if (input.meta || input.key.toLowerCase() === "meta")
                event.preventDefault();
        });

        this.mainWindow?.webContents.on("context-menu", (e) => e.preventDefault());

        this.mainWindow?.webContents.setWindowOpenHandler(() => ({
            action: "deny",
        }));
    }
}

new TouchApp();
