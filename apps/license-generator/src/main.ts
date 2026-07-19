import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainInvokeEvent,
} from 'electron';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '@clickflash/logger';
import {
  generateLicenseRequestSchema,
  validateLicenseRequestSchema,
} from './electron-contract';
import { isTrustedIpcSender } from './electron-security';
import {
  generateLicenseKeys,
  isValidSigningKey,
  validateLicenseKey,
} from './utils/license-key';

const DEVELOPMENT_ORIGIN = 'http://localhost:5176';
const RENDERER_ENTRY = path.join(__dirname, '../dist/renderer/index.html');
const MAX_SIGNING_KEY_FILE_BYTES = 4_096;
let mainWindow: BrowserWindow | null = null;
let signingKeyBytes: Buffer | null = null;
let signingPublicKeyB64: string | null = null;

function isTrustedRendererUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!app.isPackaged) return url.origin === DEVELOPMENT_ORIGIN;
    if (url.protocol !== 'file:') return false;
    return path.resolve(fileURLToPath(url)).toLowerCase() === path.resolve(RENDERER_ENTRY).toLowerCase();
  } catch {
    return false;
  }
}

function clearSigningKey(): void {
  signingKeyBytes?.fill(0);
  signingKeyBytes = null;
  signingPublicKeyB64 = null;
}

function registerIpcHandler<Args extends unknown[], Result>(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: Args) => Result,
): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedIpcSender(event, mainWindow)) {
      throw new Error('Unauthorized IPC sender');
    }
    return listener(event, ...(args as Args));
  });
}

function setupIpcHandlers(): void {
  registerIpcHandler('license:select-signing-key', async () => {
    if (!mainWindow) return { selected: false, error: 'Window is unavailable' };

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Ed25519 private signing key',
      properties: ['openFile'],
      filters: [
        { name: 'Signing key', extensions: ['key', 'txt'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths[0]) return { selected: false };

    const selectedPath = result.filePaths[0];
    const stat = fs.lstatSync(selectedPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_SIGNING_KEY_FILE_BYTES) {
      return { selected: false, error: 'Select a small, regular signing-key file' };
    }

    const fileBytes = fs.readFileSync(selectedPath);
    try {
      const encodedKey = fileBytes.toString('utf8').trim();
      if (!isValidSigningKey(encodedKey)) {
        return { selected: false, error: 'The file does not contain a valid Ed25519 private key' };
      }

      const nextKey = Buffer.from(encodedKey, 'base64');
      if (nextKey.length !== 64) {
        nextKey.fill(0);
        return { selected: false, error: 'The signing key has an invalid length' };
      }
      clearSigningKey();
      signingKeyBytes = nextKey;
      signingPublicKeyB64 = nextKey.subarray(32).toString('base64');
      return {
        selected: true,
        fileName: path.basename(selectedPath),
        keyId: crypto.createHash('sha256').update(nextKey.subarray(32)).digest('hex').slice(0, 16),
      };
    } finally {
      fileBytes.fill(0);
    }
  });

  registerIpcHandler('license:clear-signing-key', () => {
    clearSigningKey();
  });

  registerIpcHandler('license:generate', async (_event, rawRequest: unknown) => {
    const request = generateLicenseRequestSchema.parse(rawRequest);
    if (!signingKeyBytes) throw new Error('Select a private signing-key file first');
    return generateLicenseKeys(request, signingKeyBytes.toString('base64'));
  });

  registerIpcHandler('license:validate', async (_event, rawRequest: unknown) => {
    const request = validateLicenseRequestSchema.parse(rawRequest);
    if (!signingPublicKeyB64) throw new Error('Select the matching signing-key file first');
    return validateLicenseKey(request.key, signingPublicKeyB64, {
      expectedMachineId: request.expectedMachineId,
    });
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'ClickFlash License Generator',
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
  mainWindow.webContents.on('will-redirect', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  setupIpcHandlers();

  // Load the renderer
  if (app.isPackaged) {
    void mainWindow.loadFile(RENDERER_ENTRY);
  } else {
    void mainWindow.loadURL(DEVELOPMENT_ORIGIN);
  }

  mainWindow.on('closed', () => {
    clearSigningKey();
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', clearSigningKey);

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
