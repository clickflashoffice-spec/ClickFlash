import {
  BrowserWindow,
  IpcMainInvokeEvent,
  Notification,
  app,
  ipcMain,
  net,
  protocol,
  session,
  shell,
} from "electron";
import path from "path";
import { pathToFileURL } from "url";
import { notificationSchema } from "./electron-contract";
import { ApprovedFileRegistry } from "./electron-files";
import {
  isTrustedIpcSender,
  isTrustedRendererUrl,
  parseApprovedExternalUrl,
} from "./electron-security";
import {
  loadUploadConfig,
  loadUploadHistory,
  saveUploadConfig,
  saveUploadHistory,
} from "./electron-storage";
import { UploadManager } from "./electron-uploads";
import { TetherManager } from "./electron-tether";
import { exec } from "child_process";
import { promisify } from "util";
import { brisqueRequestSchema } from "./electron-contract";

const execPromise = promisify(exec);

protocol.registerSchemesAsPrivileged([{
  scheme: "moneytrash-file",
  privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: false },
}, {
  scheme: "moneytrash-app",
  privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: false },
}]);

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

let mainWindow: BrowserWindow | null = null;
const approvedFiles = new ApprovedFileRegistry();
const uploads = new UploadManager(approvedFiles, (progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("uploads:progress-event", progress);
  }
});

const tetherManager = new TetherManager((channel, payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
});

function registerHandler(channel: string, handler: (...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    if (!isTrustedIpcSender(event, mainWindow)) throw new Error("Untrusted IPC sender");
    return handler(...args);
  });
}

function registerIpcHandlers(): void {
  registerHandler("files:select", (multiple) => approvedFiles.selectFiles(multiple === true));
  registerHandler("files:select-folder", () => approvedFiles.selectFolder());
  registerHandler("files:approve-dropped", (filePath) => approvedFiles.approveDroppedFile(filePath));
  registerHandler("files:read-chunk", (filePath, offset, length) => (
    approvedFiles.readChunk(filePath, Number(offset), Number(length))
  ));
  registerHandler("files:checksums", (filePath) => approvedFiles.calculateChecksums(filePath));

  registerHandler("storage:save-config", (config) => saveUploadConfig(config));
  registerHandler("storage:load-config", () => loadUploadConfig());
  registerHandler("storage:save-history", (history) => saveUploadHistory(history));
  registerHandler("storage:load-history", () => loadUploadHistory());

  registerHandler("cloud:health", (apiUrl) => uploads.healthCheck(apiUrl));
  registerHandler("cloud:financials", (request) => uploads.getFinancials(request));

  registerHandler("uploads:start-native", (request) => uploads.startNativeUpload(request));
  registerHandler("uploads:chunk", (request) => uploads.uploadFileChunk(request));
  registerHandler("uploads:finalize", (request) => uploads.finalizeBufferedUpload(request));
  registerHandler("uploads:progress", (sessionId) => uploads.getUploadProgress(sessionId));
  registerHandler("uploads:active", () => uploads.getActiveUploads());
  registerHandler("uploads:cancel", (sessionId) => uploads.cancelUpload(sessionId));

  registerHandler("tether:start", () => tetherManager.startTethering());
  registerHandler("tether:stop", () => tetherManager.stopTethering());
  registerHandler("tether:status", () => tetherManager.getStatus());

  registerHandler("notifications:show", (rawNotification) => {
    const value = notificationSchema.parse(rawNotification);
    if (!Notification.isSupported()) return false;
    new Notification(value).show();
    return true;
  });
  registerHandler("notifications:open-external", (url) => shell.openExternal(parseApprovedExternalUrl(String(url))));

  registerHandler("process:brisque", async (rawRequest) => {
    const { filePath } = brisqueRequestSchema.parse(rawRequest);
    try {
      const scriptPath = app.isPackaged 
        ? path.join(process.resourcesPath, "scripts", "brisque_scorer.py")
        : path.join(__dirname, "..", "scripts", "brisque_scorer.py");
        
      const { stdout } = await execPromise(`python "${scriptPath}" "${filePath}"`);
      const score = parseFloat(stdout.trim());
      if (isNaN(score)) throw new Error("Invalid output from brisque script");
      return score;
    } catch (err) {
      console.error("[BRISQUE Error]", err);
      return null;
    }
  });
}

function applySessionSecurity(): void {
  const csp = app.isPackaged
    ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: moneytrash-file:; font-src 'self'; connect-src 'self' https://moneytrash-api.clickflash-office.workers.dev https://moneytrash-api.clickflash.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
    : "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: moneytrash-file:; font-src 'self'; connect-src 'self' http://127.0.0.1:* http://localhost:* https://moneytrash-api.clickflash-office.workers.dev https://moneytrash-api.clickflash.com ws://127.0.0.1:*; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
        "X-Content-Type-Options": ["nosniff"],
      },
    });
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
}

async function createWindow(): Promise<void> {
  const packagedEntryUrl = "moneytrash-app://app/index.html";
  const smokeTest = process.env.CLICKFLASH_ELECTRON_SMOKE_TEST === "1";
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedRendererUrl(url, packagedEntryUrl)) event.preventDefault();
  });
  mainWindow.webContents.on("did-navigate", (_event, url) => {
    if (!isTrustedRendererUrl(url, packagedEntryUrl)) mainWindow?.close();
  });
  mainWindow.once("ready-to-show", () => {
    if (!smokeTest) mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    approvedFiles.clear();
  });

  if (app.isPackaged) await mainWindow.loadURL(packagedEntryUrl);
  else await mainWindow.loadURL("http://127.0.0.1:1420");

  if (smokeTest) {
    const url = mainWindow.webContents.getURL();
    const title = mainWindow.webContents.getTitle();
    const passed = url === packagedEntryUrl && title === "MoneyTrash Uploader - Secure Cloud Upload";
    process.stdout.write(`${JSON.stringify({ smokeTest: passed, url, title })}\n`);
    app.exit(passed ? 0 : 1);
  }
}

function handlePackagedAssetRequest(requestUrl: string): Promise<Response> | Response {
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== "moneytrash-app:" || url.hostname !== "app") {
      return new Response("Not found", { status: 404 });
    }
    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.includes("\\")) return new Response("Not found", { status: 404 });
    const relativePath = path.posix.normalize(decodedPath.replace(/^\/+/, "") || "index.html");
    if (relativePath === ".." || relativePath.startsWith("../") || path.posix.isAbsolute(relativePath)) {
      return new Response("Not found", { status: 404 });
    }
    const rootDirectory = path.resolve(__dirname, "..");
    const targetPath = path.resolve(rootDirectory, ...relativePath.split("/"));
    const relativeTarget = path.relative(rootDirectory, targetPath);
    if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
      return new Response("Not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(targetPath).toString());
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

if (gotSingleInstanceLock) {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    applySessionSecurity();
    protocol.handle("moneytrash-app", (request) => handlePackagedAssetRequest(request.url));
    protocol.handle("moneytrash-file", (request) => approvedFiles.handlePreviewRequest(request.url));
    registerIpcHandlers();
    await createWindow();
  }).catch((error: unknown) => {
    process.stderr.write(`MoneyTrash startup failed: ${error instanceof Error ? error.message : String(error)}\n`);
    app.quit();
  });
}

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  void uploads.dispose();
  approvedFiles.clear();
});
