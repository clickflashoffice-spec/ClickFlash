/**
 * E2E Test Main Process
 * 
 * Modified Electron main entry for E2E testing.
 * Disables kiosk mode, enables dev tools, and adds test helpers.
 */

/* eslint-env node */
const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
} = require("electron");
const path = require("path");
const { fork } = require("child_process");

let mainWindow;
let serverProcess;
let isQuitting = false;

// E2E Test Mode Flag
const IS_E2E_TEST = process.env.E2E_TEST === 'true' || process.env.NODE_ENV === 'e2e';

// Load modular services if available
let initAutoUpdater;
try {
  const updaterMod = require("./dist/backend/src/main/autoUpdater");
  initAutoUpdater = updaterMod.initAutoUpdater;
} catch {
  console.log("[E2E] Modular services not found");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: false, // Disabled for E2E testing
    kiosk: false,      // Disabled for E2E testing
    title: "ClickFlash Master — E2E Test Mode",
    alwaysOnTop: false, // Disabled for E2E testing
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
      devTools: true, // Always enable for E2E debugging
    },
    icon: path.join(__dirname, "../icon.ico"),
    show: true,
  });

  // Show loading screen
  const splashHTML = `
    <html>
    <body style="margin:0; background:#020617; display:flex; align-items:center; justify-content:center; height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="text-align:center;">
        <div style="width:64px; height:64px; margin:0 auto 24px; border:3px solid #1e293b; border-top-color:#06b6d4; border-radius:50%; animation:spin 1s linear infinite;"></div>
        <div style="color:#f8fafc; font-size:24px; font-weight:700; letter-spacing:-0.025em; margin-bottom:8px;">ClickFlash Master</div>
        <div style="color:#22d3ee; font-size:14px; letter-spacing:0.05em; text-transform:uppercase;">E2E Test Mode</div>
        <div style="color:#94a3b8; font-size:12px; margin-top:16px;">Waiting for backend...</div>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html,${encodeURIComponent(splashHTML)}`);

  // Wait for server to be ready
  const waitForServer = (maxWait = 60000, interval = 250) => {
    const http = require("http");
    const start = Date.now();

    const tryLoad = () => {
      const elapsed = Date.now() - start;
      if (elapsed > maxWait) {
        console.error("[E2E] Server timeout, forcing UI load.");
        doLoad();
        return;
      }

      const req = http.get("http://localhost:8090/api/health", (res) => {
        res.resume();
        if (res.statusCode < 500) {
          console.log(`[E2E] Server ready in ${elapsed}ms`);
          doLoad();
        } else {
          setTimeout(tryLoad, interval);
        }
      });

      req.on("error", () => setTimeout(tryLoad, interval));
      req.setTimeout(200, () => { req.destroy(); setTimeout(tryLoad, interval); });
    };

    tryLoad();
  };

  const doLoad = () => {
    if (!mainWindow) return;
    // In E2E mode, always load from localhost
    mainWindow.loadURL("http://localhost:8090");
  };

  waitForServer();

  // Security: Restrict Navigation
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const parsedUrl = new URL(url);
    const allowedHosts = ["localhost"];
    if (
      !allowedHosts.includes(parsedUrl.hostname) &&
      !url.startsWith("file://")
    ) {
      console.warn(`[E2E Security] Blocked unauthorized navigation to: ${url}`);
      event.preventDefault();
    }
  });

  // Security: Prevent New Windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`[E2E Security] Blocked attempt to open new window: ${url}`);
    return { action: "deny" };
  });

  mainWindow.on("closed", function () {
    mainWindow = null;
  });

  // E2E: Kiosk mode simulation (doesn't actually lock the window)
  ipcMain.handle("kiosk:unlock", async (event, pin) => {
    // Accept any PIN in E2E mode for testing
    console.log(`[E2E] Kiosk unlock attempted with PIN: ${pin}`);
    return { success: true, e2e: true };
  });

  ipcMain.handle("kiosk:lock", async () => {
    console.log("[E2E] Kiosk lock simulated");
    return { success: true, e2e: true };
  });

  // E2E: Test helpers
  ipcMain.handle("e2e:reset-state", async () => {
    console.log("[E2E] Resetting app state");
    // Clear any test data, reset to defaults
    return { success: true };
  });

  ipcMain.handle("e2e:get-window-info", async () => {
    if (!mainWindow) return { error: "No window" };
    return {
      isKiosk: mainWindow.isKiosk(),
      isFullScreen: mainWindow.isFullScreen(),
      isAlwaysOnTop: mainWindow.isAlwaysOnTop(),
      bounds: mainWindow.getBounds(),
    };
  });

  // Allow F12 for debugging in E2E mode
  globalShortcut.register("F12", () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // E2E: Allow Ctrl+Shift+I for DevTools
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (mainWindow) {
      mainWindow.webContents.openDevTools();
    }
  });

  console.log("[E2E] Test window created with dev tools enabled");
}

function startServer() {
  console.log("[E2E] Starting backend server...");
  
  const serverPath = path.join(__dirname, "backend", "server.ts");
  const distServerPath = path.join(__dirname, "dist", "backend", "server.js");
  
  const fs = require("fs");
  
  // Use ts-node for TypeScript server in E2E mode
  if (fs.existsSync(serverPath)) {
    serverProcess = fork(serverPath, [], {
      cwd: __dirname,
      execArgv: ["-r", "ts-node/register"],
      env: { ...process.env, E2E_TEST: "true", NODE_ENV: "e2e" },
    });
  } else if (fs.existsSync(distServerPath)) {
    serverProcess = fork(distServerPath, [], {
      cwd: __dirname,
      env: { ...process.env, E2E_TEST: "true", NODE_ENV: "e2e" },
    });
  } else {
    console.error("[E2E] Server file not found!");
    return;
  }

  serverProcess.on("error", (err) => {
    console.error("[E2E] Server process error:", err);
  });

  serverProcess.on("exit", (code) => {
    if (!isQuitting && code !== 0) {
      console.error(`[E2E] Server exited with code ${code}`);
    }
  });
}

// App Event Handlers
app.whenReady().then(() => {
  console.log("[E2E] App ready - starting in test mode");
  startServer();
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    isQuitting = true;
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Security: Prevent new window creation via JS
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
  });
});

console.log("[E2E] Main process initialized");
