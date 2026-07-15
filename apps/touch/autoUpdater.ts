/**
 * Auto Updater Module for Touch Kiosk
 * Handles automatic updates using electron-updater
 */

import { app, dialog, ipcMain, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { logger } from "@clickflash/logger";

// Configure auto-updater
autoUpdater.logger = console;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow: BrowserWindow | null = null;
let updateStatus: {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version: string | null;
  releaseNotes: string | null;
} = {
  checking: false,
  available: false,
  downloaded: false,
  error: null,
  progress: 0,
  version: null,
  releaseNotes: null
};

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;
  
  // Check for updates after 30 seconds (give app time to fully start)
  setTimeout(() => {
    checkForUpdates();
  }, 30000);

  setupIpcHandlers();
  setupEventHandlers();
}

function setupIpcHandlers(): void {
  ipcMain.handle('updater:check', async () => {
    return await checkForUpdates();
  });

  ipcMain.handle('updater:download', async () => {
    return await downloadUpdate();
  });

  ipcMain.handle('updater:install', () => {
    installUpdate();
  });

  ipcMain.handle('updater:status', () => {
    return updateStatus;
  });
}

function setupEventHandlers(): void {
  autoUpdater.on('checking-for-update', () => {
    logger.info(String('[TouchAutoUpdater] Checking for update...'));
    updateStatus = { ...updateStatus, checking: true, error: null };
    notifyRenderer('checking');
  });

  autoUpdater.on('update-available', (info: any) => {
    logger.info('[TouchAutoUpdater] Update available:', { args: [info.version] });
    updateStatus = {
      ...updateStatus,
      checking: false,
      available: true,
      version: info.version,
      releaseNotes: info.releaseNotes ? info.releaseNotes.toString() : null
    };
    notifyRenderer('available', info);
    showUpdateAvailableDialog(info);
  });

  autoUpdater.on('update-not-available', () => {
    logger.info(String('[TouchAutoUpdater] No update available'));
    updateStatus = { ...updateStatus, checking: false, available: false };
    notifyRenderer('not-available');
  });

  autoUpdater.on('download-progress', (progress: any) => {
    updateStatus = { ...updateStatus, progress: progress.percent };
    notifyRenderer('progress', progress);
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    logger.info(String('[TouchAutoUpdater] Update downloaded'));
    updateStatus = { ...updateStatus, downloaded: true, checking: false };
    notifyRenderer('downloaded', info);
    showUpdateDownloadedDialog(info);
  });

  autoUpdater.on('error', (error: any) => {
    logger.error('[TouchAutoUpdater] Error:', { args: [error] });
    updateStatus = { ...updateStatus, checking: false, error: error?.message || String(error) };
    notifyRenderer('error', { message: error?.message || String(error) });
  });
}

async function checkForUpdates() {
  try {
    if (process.env.NODE_ENV === 'development') {
      logger.info(String('[TouchAutoUpdater] Skipping update check in development'));
      return updateStatus;
    }
    await autoUpdater.checkForUpdates();
    return updateStatus;
  } catch (error: any) {
    logger.error('[TouchAutoUpdater] Failed to check:', { args: [error] });
    updateStatus = { ...updateStatus, error: error?.message || String(error) };
    return updateStatus;
  }
}

async function downloadUpdate() {
  try {
    await autoUpdater.downloadUpdate();
    return updateStatus;
  } catch (error: any) {
    logger.error('[TouchAutoUpdater] Failed to download:', { args: [error] });
    updateStatus = { ...updateStatus, error: error?.message || String(error) };
    return updateStatus;
  }
}

function installUpdate(): void {
  logger.info(String('[TouchAutoUpdater] Installing update...'));
  autoUpdater.quitAndInstall();
}

function showUpdateAvailableDialog(info: any): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Touch Kiosk Update Available',
    message: `Version ${info.version} is available.`,
    detail: `Current: ${app.getVersion()}\n\n${info.releaseNotes || 'No release notes.'}`,
    buttons: ['Download Now', 'Later'],
    defaultId: 0
  }).then((result) => {
    if (result.response === 0) {
      downloadUpdate();
    }
  });
}

function showUpdateDownloadedDialog(info: any): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Touch Kiosk Update Ready',
    message: `Version ${info.version} downloaded.`,
    detail: 'Install now? The app will restart.',
    buttons: ['Install & Restart', 'Later'],
    defaultId: 0
  }).then((result) => {
    if (result.response === 0) {
      installUpdate();
    }
  });
}

function notifyRenderer(event: string, data?: any): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:' + event, data);
  }
}

export function forceCheckForUpdates(): void {
  checkForUpdates();
}

export function getUpdateStatus() {
  return { ...updateStatus };
}
