/* eslint-env node */
const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { fork } = require("child_process");

let mainWindow;
let serverProcess;
let guardianProcess;
let isQuitting = false;
let watchdogInterval;

// Load modular services if available (post-build)
let initAutoUpdater;
let BackupService;

try {
  const updaterMod = require("./dist/backend/src/main/autoUpdater");
  initAutoUpdater = updaterMod.initAutoUpdater;
  const backupMod = require("./dist/backend/src/main/backupService");
  BackupService = backupMod.BackupService;
} catch {
  console.log(
    "[Electron] Modular services not found, some features may be limited in dev",
  );
}

function createWindow() {
  // Preload path resolution for both dev and packaged
  let preloadPath = path.join(__dirname, "preload.js");
  if (!fs.existsSync(preloadPath)) {
    // Try alternative locations
    const alternatives = [
      path.join(__dirname, "..", "preload.js"),
      path.join(process.resourcesPath, "preload.js"),
    ];
    for (const alt of alternatives) {
      if (fs.existsSync(alt)) {
        preloadPath = alt;
        break;
      }
    }
  }
  
  // Icon path
  let iconPath = path.join(__dirname, "../icon.ico");
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(process.resourcesPath, "icon.ico");
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true, // Kiosk Requirement (Rule 04)
    kiosk: true, // Kiosk Requirement (Rule 04)
    title: "Star Master OS — Station Controller",
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
      devTools: process.env.NODE_ENV === "development",
    },
    icon: iconPath,
  });
  
  console.log("[Electron] Preload path:", preloadPath);
  console.log("[Electron] Preload exists:", fs.existsSync(preloadPath));

  // Disable Menu Bar
  mainWindow.setMenuBarVisibility(false);

  // Show a loading splash immediately (Rule 01 - Premium feel)
  const splashHTML = `
    <html>
    <body style="margin:0; background:#020617; display:flex; align-items:center; justify-content:center; height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="text-align:center;">
        <div style="width:64px; height:64px; margin:0 auto 24px; border:3px solid #1e293b; border-top-color:#06b6d4; border-radius:50%; animation:spin 1s linear infinite;"></div>
        <div style="color:#f8fafc; font-size:24px; font-weight:700; letter-spacing:-0.025em; margin-bottom:8px;">ClickFlash Master</div>
        <div style="color:#94a3b8; font-size:14px; letter-spacing:0.05em; text-transform:uppercase;">Initializing Core Engine...</div>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html,${encodeURIComponent(splashHTML)}`);

  // This prevents the "blank-screen" issue on slower machines (Phase 130)
  const waitForServer = (maxWait = 60000, interval = 250) => {
    const http = require("http");
    const start = Date.now();

    const tryLoad = () => {
      const elapsed = Date.now() - start;
      if (elapsed > maxWait) {
        console.error("[Electron] Server timeout, forcing UI load.");
        doLoad();
        return;
      }

      const req = http.get("http://localhost:8090/api/health", (res) => {
        res.resume();
        if (res.statusCode < 500) {
          console.log(`[Electron] Server ready in ${elapsed}ms`);
          doLoad();
        } else {
          setTimeout(tryLoad, interval);
        }
      });

      req.on("error", () => setTimeout(tryLoad, interval));
      req.setTimeout(200, () => {
        req.destroy();
        setTimeout(tryLoad, interval);
      });
    };

    tryLoad();
  };

  const doLoad = () => {
    if (!mainWindow) return;
    // Check if running in packaged app or development
    if (app.isPackaged) {
      // In production, load from built files
      const indexPath = path.join(__dirname, "dist/master/index.html");
      if (require("fs").existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      } else {
        console.error("[Electron] index.html not found at:", indexPath);
        // Fallback to localhost if files not found
        mainWindow.loadURL("http://localhost:8090");
      }
    } else {
      // In development, load from dev server
      mainWindow.loadURL("http://localhost:8090");
    }
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
      console.warn(`[Security] Blocked unauthorized navigation to: ${url}`);
      event.preventDefault();
    }
  });

  // Security: Prevent New Windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`[Security] Blocked attempt to open new window: ${url}`);
    return { action: "deny" };
  });

  mainWindow.on("closed", function () {
    mainWindow = null;
  });

  // Kiosk / Admin Controls
  ipcMain.handle("kiosk:unlock", async (event, pin) => {
    // Kiosk unlock requires ADMIN_PIN to be configured in environment
    const adminPin = process.env.ADMIN_PIN;

    if (!adminPin) {
      console.error("[Kiosk] ADMIN_PIN not configured in environment");
      return { success: false, error: "Kiosk unlock not configured" };
    }

    if (pin === adminPin) {
      if (mainWindow) {
        mainWindow.setKiosk(false);
        mainWindow.setFullScreen(false);
        mainWindow.setAlwaysOnTop(false);
        // Kill Guardian to let Alt+Tab work
        if (guardianProcess) {
          console.log("[Kiosk] PIN Accepted. Exiting kiosk mode...");
          guardianProcess.kill();
          guardianProcess = null;
        }
        return { success: true };
      }
    }
    return { success: false, error: "Invalid PIN" };
  });

  ipcMain.handle("kiosk:lock", async () => {
    if (mainWindow) {
      mainWindow.setKiosk(true);
      mainWindow.setFullScreen(true);
      mainWindow.setAlwaysOnTop(true);

      // Respawn Guardian
      const guardianPath = path.join(__dirname, "KioskGuardian.exe");
      if (require("fs").existsSync(guardianPath) && !guardianProcess) {
        console.log("[Kiosk] Relocking. Spawning Guardian...");
        const { spawn } = require("child_process");
        guardianProcess = spawn(guardianPath, [], { detached: false });
      }
      return { success: true };
    }
    return { success: false };
  });

  // Security: Block dangerous keyboard shortcuts at webContents level (Law 16)
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const blockedF = [
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
    ];
    const key = input.key.toLowerCase();
    if (blockedF.includes(key)) {
      event.preventDefault();
      return;
    }
    // Block Ctrl+I (DevTools), Ctrl+R (reload), Ctrl+U (source), Ctrl+= / Ctrl+- (zoom)
    if (input.control && ["i", "r", "u", "=", "-", "0"].includes(key)) {
      event.preventDefault();
      return;
    }
    // Block Alt+F4
    if (input.alt && key === "f4") {
      event.preventDefault();
    }
  });

  // Security: Disable right-click context menu
  mainWindow.webContents.on("context-menu", (e) => e.preventDefault());

  // Crash Recovery: Auto-restore kiosk and reload on renderer crash (Kiosk Resilience Law)
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[Kiosk] Renderer crashed: ${details.reason}. Recovering...`);
    setTimeout(() => {
      if (!mainWindow) return;
      if (!mainWindow.isKiosk()) {
        mainWindow.setKiosk(true);
        mainWindow.setFullScreen(true);
        mainWindow.setAlwaysOnTop(true);
      }
      mainWindow.loadURL(
        app.isPackaged
          ? `file://${require("path").join(__dirname, "dist/master/index.html")}`
          : "http://localhost:8090",
      );
    }, 1000);
  });

  // Initialize modular services
  if (initAutoUpdater) {
    initAutoUpdater(mainWindow);
  }

  if (BackupService) {
    BackupService.runDailyBackup();
  }

  // Register Breakout Shortcuts (Law 16 - Protected Admin)
  // Ctrl+Alt+Shift+X to exit kiosk mode (Internal only)
  globalShortcut.register("CommandOrControl+Alt+Shift+X", () => {
    if (mainWindow) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(false);

      // Kill Guardian to restore OS shortcuts
      if (guardianProcess) {
        console.log("[Kiosk] Exiting kiosk mode, restoring OS shortcuts...");
        guardianProcess.kill();
        guardianProcess = null;
      }
    }
  });

  // Spawn KioskGuardian to block OS-level shortcuts like WinKey, Alt+Tab, etc.
  const guardianPath = path.join(__dirname, "KioskGuardian.exe");
  if (require("fs").existsSync(guardianPath)) {
    console.log("[Kiosk] Spawning KioskGuardian for OS-level lockout...");
    const { spawn } = require("child_process");
    guardianProcess = spawn(guardianPath, [], { detached: false });

    guardianProcess.on("error", (err) => {
      console.error("[Kiosk] Failed to start KioskGuardian:", err.message);
    });
  } else {
    console.warn(
      "[Kiosk] KioskGuardian.exe not found! OS-level shortcuts might still work.",
    );
  }

  // Phase 150: Process Watchdog (Titan Protocol)
  if (!watchdogInterval) {
    watchdogInterval = setInterval(() => {
      if (isQuitting) return;

      // 1. Health check for Backend
      if (!serverProcess || serverProcess.killed) {
        console.warn("[Watchdog] Backend process lost! Respawning...");
        startServer();
      }

      // 2. Health check for Guardian (if in kiosk mode)
      if (mainWindow && mainWindow.isKiosk()) {
        const guardianPath = path.join(__dirname, "KioskGuardian.exe");
        if (
          require("fs").existsSync(guardianPath) &&
          (!guardianProcess || guardianProcess.killed)
        ) {
          console.warn("[Watchdog] KioskGuardian lost! Respawning...");
          const { spawn } = require("child_process");
          guardianProcess = spawn(guardianPath, [], { detached: false });
        }

        // 3. Registry Enforcement (Law 16) - Ensure Shell is set to ClickFlash in production
        if (app.isPackaged && process.platform === "win32") {
          try {
            const { execSync } = require("child_process");
            const appPath = app.getPath("exe");
            const regKey =
              "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon";
            const regCheck = execSync(
              `reg query "${regKey}" /v Shell`,
            ).toString();

            if (!regCheck.includes(appPath)) {
              console.warn(
                "[Watchdog] Registry shell mismatch. Re-enforcing...",
              );
              execSync(
                `reg add "${regKey}" /v Shell /t REG_SZ /d "${appPath}" /f`,
              );
            }
          } catch (e) {
            // Silently skip if registry access fails
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }
}

function startServer() {
  // Determine correct path for packaged vs development
  let serverPath;
  if (app.isPackaged) {
    // In packaged app, __dirname is inside the app.asar
    // dist/backend/server.js is bundled in the asar
    serverPath = path.join(__dirname, "dist/backend/server.js");
    console.log("[Electron] Packaged mode - checking asar path:", serverPath);
    console.log("[Electron] __dirname:", __dirname);
    console.log("[Electron] app.isPackaged:", app.isPackaged);
    console.log("[Electron] app.getAppPath():", app.getAppPath());
  } else {
    // Development mode
    serverPath = path.join(__dirname, "dist/backend/server.js");
    console.log("[Electron] Dev mode - server path:", serverPath);
  }

  // Check if server file exists
  if (!fs.existsSync(serverPath)) {
    console.error("[Electron] FATAL: Server file not found at:", serverPath);
    // List what IS in that directory
    const dir = path.dirname(serverPath);
    if (fs.existsSync(dir)) {
      console.log("[Electron] Directory contents:", fs.readdirSync(dir));
    } else {
      console.log("[Electron] Directory does not exist:", dir);
    }
    return;
  }

  // Only start from compiled bundle if app is packaged OR we explicitly want to test production build
  if (app.isPackaged && fs.existsSync(serverPath)) {
    // Production: fork the compiled bundle
    console.log("[Electron] Starting backend from compiled bundle...");
    serverProcess = fork(serverPath, [], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      execArgv: ["--max-old-space-size=8192", "--max-semi-space-size=512"],
    });
    serverProcess.on("message", (msg) => console.log("Server message:", msg));
    serverProcess.on("error", (err) =>
      console.error("[Electron] Backend error:", err.message),
    );
    serverProcess.on("exit", (code) => {
      console.error("[Electron] Backend process exited with code:", code);
    });
  } else {
    // Dev mode: no compiled bundle found or not packaged.
    // The backend must be started separately with: npm run dev:backend
    // The waitForServer() health-check in createWindow() will wait until it's ready.
    console.log(
      `[Electron] dev mode (isPackaged: ${app.isPackaged}): waiting for backend on port 8090...`,
    );
    console.log(
      "[Electron] Start backend separately: cd apps/master && npm run dev:backend",
    );
  }
}

app.on("ready", () => {
  // Disable Kiosk Shortcuts (App level — catches OS-level shortcuts)
  globalShortcut.register("Alt+Tab", () => {
    return false;
  });
  globalShortcut.register("Alt+F4", () => {
    return false;
  });
  // Block Super/Windows key combinations that expose the taskbar
  try {
    globalShortcut.register("Super", () => {
      return false;
    });
    globalShortcut.register("Super+D", () => {
      return false;
    });
    globalShortcut.register("Super+Tab", () => {
      return false;
    });
    globalShortcut.register("Super+L", () => {
      return false;
    });
    globalShortcut.register("Super+E", () => {
      return false;
    });
  } catch (e) {
    console.warn(
      "[Kiosk] Could not register Super shortcuts (may not be supported on this OS):",
      e.message,
    );
  }
  // Block Ctrl+Escape (Start menu)
  globalShortcut.register("Escape", () => {
    return false;
  });

  startServer();
  createWindow();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    if (serverProcess) serverProcess.kill();
    if (guardianProcess) guardianProcess.kill();
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) createWindow();
});

app.on("before-quit", () => {
  isQuitting = true;
  if (watchdogInterval) clearInterval(watchdogInterval);
  globalShortcut.unregisterAll();
  if (serverProcess) serverProcess.kill();
  if (guardianProcess) guardianProcess.kill();
});

// IPC Gateways for Admin
// (system:exit-kiosk removed for security. Kiosk exit is handled purely by main process global shortcuts)

// Phase P4: Native Directory Picker for Batch Export
ipcMain.handle("dialog:openDirectory", async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Batch Export Destination",
    buttonLabel: "Select Folder",
  });

  if (canceled) {
    return null;
  }
  return filePaths[0];
});
