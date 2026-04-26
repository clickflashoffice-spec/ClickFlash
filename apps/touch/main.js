const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const os = require("os");
const { fork } = require("child_process");
const Database = require("better-sqlite3");
const { initAutoUpdater } = require("./autoUpdater");

// Load environment variables
require("dotenv").config();

/**
 * Rule 05: Universal Environment Parity
 * Touch App Main Process - Secure Kiosk Mode
 */

class TouchApp {
  constructor() {
    this.config = {
      appName: "ClickFlash - Touch Kiosk",
      appMode: "touch",
      frontendPort: parseInt(process.env.FRONTEND_PORT, 10) || 8001,
      backendPort: parseInt(process.env.TOUCH_BACKEND_PORT, 10) || 8091,
      width: 1440,
      height: 900,
    };

    this.mainWindow = null;
    this.backendProcess = null;
    this.server = null;
    this.serverPort = null;
    this.useViteDevServer = false;

    this.init();
  }

  init() {
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
    });

    app.on("will-quit", () => this.stopBackend());

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        if (this.server) this.server.close();
        this.stopBackend();
        app.quit();
      }
    });
  }

  setupNetworkIsolation() {
    // Law 06: Touch Local Fetch (Strict Isolation)
    // Phase 34: Hardened LAN-Only Mode
    // Block all traffic to external internet AND restrict to known ports
    const ALLOWED_HOSTS = [
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
      80, // HTTP fallback
      443, // HTTPS fallback (shouldn't be used but don't break)
      0, // Default port (no port specified)
    ];

    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      try {
        const url = new URL(details.url);

        // Always allow devtools and chrome-extension URLs
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
          console.warn(
            `[Security] Blocked external request in Touch App: ${details.url}`,
          );
          callback({ cancel: true });
          return;
        }

        // Phase 34: Port restriction (only in production)
        const port = parseInt(url.port) || 0;
        if (port > 0 && !ALLOWED_PORTS.includes(port)) {
          console.warn(
            `[Security] Blocked request to unauthorized port ${port}: ${details.url}`,
          );
          callback({ cancel: true });
          return;
        }

        callback({});
      } catch (e) {
        // Malformed URL - block it
        console.warn(`[Security] Blocked malformed URL: ${details.url}`);
        callback({ cancel: true });
      }
    });

    // Phase 34: Strip Referer headers to prevent internal structure leaks
    session.defaultSession.webRequest.onBeforeSendHeaders(
      (details, callback) => {
        const headers = { ...details.requestHeaders };
        delete headers["Referer"];
        callback({ requestHeaders: headers });
      },
    );
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
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
    return map[ext] || "text/plain";
  }

  checkViteServer(callback) {
    const testReq = http.get(
      "http://127.0.0.1:5173",
      { timeout: 2000 },
      (res) => {
        if (res.statusCode === 200) {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk.toString();
          });
          res.on("end", () => {
            const isVite =
              res.headers["x-vite"] ||
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

  startServer() {
    if (!app.isPackaged && process.env.NODE_ENV !== "production") {
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

  startInternalServer() {
    this.server = http.createServer((req, res) => {
      if (req.url === "/api/ip") {
        const results = [];
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
            if (net.family === "IPv4" && !net.internal) {
              results.push({ name: name, ip: net.address });
            }
          }
        }
        if (results.length === 0)
          results.push({ name: "Loopback", ip: "127.0.0.1" });
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
        res.end(
          JSON.stringify({
            mode: this.config.appMode,
            backendPort: this.config.backendPort,
          }),
        );
        return;
      }

      let baseDir;
      if (app.isPackaged) {
        baseDir = path.join(__dirname, "dist", this.config.appMode);
      } else {
        baseDir = path.join(__dirname, "../../dist", this.config.appMode);
        if (!fs.existsSync(baseDir)) {
          baseDir = path.join(__dirname, "../../");
        }
      }

      let safePath = path
        .normalize(req.url.split("?")[0])
        .replace(/^(\.\.[\/\\])+/, "");
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
        const headers = {
          "Content-Type": this.getMimeType(filePath),
          "Access-Control-Allow-Origin": "*",
        };
        if (path.extname(filePath).toLowerCase() === ".html") {
          const isProduction = process.env.NODE_ENV === "production" || app.isPackaged;
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
      this.serverPort = this.server.address().port;
      this.startBackend();
      this.createWindow();
    });
  }

  startBackend() {
    const isPackaged = app.isPackaged;
    let dataDir = isPackaged
      ? path.join(app.getPath("userData"), "pb_data")
      : path.join(__dirname, "pb_data");

    let serverScript = isPackaged
      ? path.join(
          process.resourcesPath,
          "backend",
          this.config.appMode,
          "server.js",
        )
      : path.join(__dirname, "../../backend/touch/server.js");

    if (!fs.existsSync(serverScript) && !isPackaged) {
      serverScript = path.join(__dirname, "dist", "backend", "server.js");
    }

    if (fs.existsSync(serverScript)) {
      const isDev = !isPackaged && process.env.NODE_ENV !== "production";
      const env = {
        ...process.env,
        PORT: this.config.backendPort,
        DATA_DIR: dataDir,
        NODE_ENV: isDev ? "development" : "production",
      };

      if (isDev) {
        // In dev mode, backend is started externally via `npm run dev:backend`
        // or via the `dev:electron` concurrently script — don't fork here.
        console.log("[Touch] Dev mode — backend started externally on port", this.config.backendPort);
        return;
      }

      this.backendProcess = fork(serverScript, [], {
        stdio: "inherit",
        env,
        execArgv: ["--max-old-space-size=4096"],
      });
    }
  }

  stopBackend() {
    if (this.backendProcess) {
      this.backendProcess.kill();
      this.backendProcess = null;
    }
  }

  createWindow() {
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
    this.mainWindow.loadURL(
      `data:text/html,<html><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><div style="color:#06b6d4;font-size:32px;font-weight:bold;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">ClickFlash Touch</div><div style="color:#475569;font-size:16px;letter-spacing:2px;">Initializing Kiosk...</div></div></body></html>`,
    );

    this.setupIpcHandlers();

    // Phase 36: Server Polling (Prevents blank screen on slow startup)
    const waitForServer = (maxWait = 60000, interval = 500) => {
      const http = require("http");
      const start = Date.now();
      const url = `http://127.0.0.1:${this.serverPort}?mode=${this.config.appMode}`;

      const tryLoad = () => {
        const elapsed = Date.now() - start;
        if (elapsed > maxWait) {
          console.error("[Electron] Server did not respond, loading anyway.");
          this.mainWindow.loadURL(url).catch(() => {});
          return;
        }

        // Check backend health
        const req = http.get(
          `http://localhost:${this.config.backendPort}/api/health`,
          (res) => {
            res.resume();
            if (res.statusCode < 500) {
              console.log(
                `[Electron] Backend ready after ${elapsed}ms. Loading UI...`,
              );
              this.mainWindow.loadURL(url).catch(() => {});
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

    this.setupSecurityFilters();

    // Crash Recovery: Auto-restore kiosk and reload on renderer crash
    this.mainWindow.webContents.on("render-process-gone", (_event, details) => {
      console.error(
        `[Kiosk] Renderer crashed: ${details.reason}. Recovering...`,
      );
      setTimeout(() => {
        if (!this.mainWindow) return;
        this.mainWindow.loadURL(
          `http://127.0.0.1:${this.serverPort}?mode=${this.config.appMode}`,
        );
      }, 1000);
    });

    this.mainWindow.on("closed", () => (this.mainWindow = null));
  }

  setupIpcHandlers() {
    ipcMain.removeHandler("exit-kiosk");
    ipcMain.handle("exit-kiosk", async (event, password) => {
      let KIOSK_PASSWORD = null;

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
            .get();
          if (row && row.value) {
            KIOSK_PASSWORD = row.value;
          }
          db.close();
        }
      } catch (e) {
        console.error("[Electron] Failed to read password from DB:", e);
      }

      // Fall back to env var only if DB lookup failed
      if (KIOSK_PASSWORD === null) {
        KIOSK_PASSWORD = process.env.KIOSK_PASSWORD || null;
      }

      // SECURITY: Require password to be configured
      if (KIOSK_PASSWORD === null) {
        console.error("[Electron] Kiosk exit password not configured. Set KIOSK_PASSWORD env var or 'password' setting in DB.");
        return false;
      }

      // Constant-time check
      if (typeof password !== 'string') return false;
      let isValid = true;
      if (password.length !== KIOSK_PASSWORD.length) {
        isValid = false;
        const dummy = Buffer.alloc(KIOSK_PASSWORD.length);
        require('crypto').timingSafeEqual(dummy, dummy);
      } else {
        const p1 = Buffer.from(password, 'utf8');
        const p2 = Buffer.from(KIOSK_PASSWORD, 'utf8');
        isValid = require('crypto').timingSafeEqual(p1, p2);
      }

      if (isValid) {
        app.quit();
        return true;
      }
      return false;
    });

    ipcMain.removeHandler("getPrinters");
    ipcMain.handle("getPrinters", async () => {
      try {
        return await this.mainWindow.webContents.getPrintersAsync();
      } catch (e) {
        return [];
      }
    });

    ipcMain.removeHandler("print");
    ipcMain.handle("print", async (event, options) => {
      return new Promise((resolve, reject) => {
        if (!options || typeof options !== "object") {
          reject(new Error("Invalid print options"));
          return;
        }
        const safeOptions = {
          silent: typeof options.silent === "boolean" ? options.silent : true,
          printBackground: true,
          deviceName:
            typeof options.printer === "string" ? options.printer : "",
        };
        this.mainWindow.webContents.print(safeOptions, (success, errorType) => {
          if (!success) reject(new Error(errorType));
          else resolve(true);
        });
      });
    });
  }

  setupSecurityFilters() {
    this.mainWindow.webContents.on("before-input-event", (event, input) => {
      const blockedKeys = [
        "f1",
        "f2",
        "f3",
        "f4",
        "f5",
        "f6",
        "f7",
        "f8",
        "f9",
        "f10",
        "f11",
        "f12",
        "escape",
      ];
      const key = input.key.toLowerCase();
      if (blockedKeys.includes(key)) event.preventDefault();

      // Block common escapes
      if (input.control && ["i", "r", "u", "=", "-", "0"].includes(key))
        event.preventDefault();
      if (input.alt && key === "f4") event.preventDefault();
      if (input.meta || input.key.toLowerCase() === "meta")
        event.preventDefault();
    });

    this.mainWindow.webContents.on("context-menu", (e) => e.preventDefault());

    this.mainWindow.webContents.setWindowOpenHandler(() => ({
      action: "deny",
    }));
  }
}

new TouchApp();
