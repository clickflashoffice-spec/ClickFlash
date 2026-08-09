/**
 * Auto Updater Module for Master Portal
 * Handles automatic updates using electron-updater
 */

import { app, dialog, ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import { logger } from '@clickflash/logger';

// Configure auto-updater
const updaterLogger = {
  info: (msg: string) => logger.info(msg, { context: 'updater' }),
  warn: (msg: string) => logger.warn(msg, { context: 'updater' }),
  error: (msg: string) => logger.error(msg, { context: 'updater' }),
  debug: (msg: string) => logger.debug(msg, { context: 'updater' }),
};
autoUpdater.logger = updaterLogger;
autoUpdater.autoDownload = false;        // Never download without user confirmation
autoUpdater.autoInstallOnAppQuit = true;
// Require code-signing certificate to match publisherName (set in electron-builder.yml)
// When forceDevUpdateConfig is false in production, this is enforced automatically.
autoUpdater.allowPrerelease = false;     // Never install pre-release builds on kiosks
autoUpdater.allowDowngrade  = false;     // Never downgrade

interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version?: string;
  releaseNotes?: string;
}

let mainWindow: BrowserWindow | null = null;
let eventHandlersRegistered = false;
let updateCheckScheduled = false;
let updateStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloaded: false,
  error: null,
  progress: 0
};

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  if (!updateCheckScheduled) {
    updateCheckScheduled = true;
    setTimeout(() => {
      void checkForUpdates();
    }, 10000);
  }

  setupIpcHandlers();
  if (!eventHandlersRegistered) {
    eventHandlersRegistered = true;
    setupEventHandlers();
  }
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  if (
    !mainWindow
    || mainWindow.isDestroyed()
    || event.sender !== mainWindow.webContents
    || event.senderFrame !== mainWindow.webContents.mainFrame
  ) {
    throw new Error('Unauthorized updater IPC sender');
  }
}

function setupIpcHandlers(): void {
  for (const channel of ['updater:check', 'updater:download', 'updater:install', 'updater:status']) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle('updater:check', async (event) => {
    assertTrustedSender(event);
    return await checkForUpdates();
  });

  ipcMain.handle('updater:download', async (event) => {
    assertTrustedSender(event);
    return await downloadUpdate();
  });

  ipcMain.handle('updater:install', (event) => {
    assertTrustedSender(event);
    installUpdate();
  });

  ipcMain.handle('updater:status', (event) => {
    assertTrustedSender(event);
    return updateStatus;
  });
}

function setupEventHandlers(): void {
  autoUpdater.on('checking-for-update', () => {
    logger.info('[AutoUpdater] Checking for update...');
    updateStatus = { ...updateStatus, checking: true, error: null };
    notifyRenderer('checking');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    logger.info('[AutoUpdater] Update available:', { args: [info.version] });
    updateStatus = {
      ...updateStatus,
      checking: false,
      available: true,
      version: info.version,
      releaseNotes: info.releaseNotes?.toString()
    };
    notifyRenderer('available', info);
    showUpdateAvailableDialog(info);
  });

  autoUpdater.on('update-not-available', () => {
    logger.info('[AutoUpdater] No update available');
    updateStatus = { ...updateStatus, checking: false, available: false };
    notifyRenderer('not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    updateStatus = { ...updateStatus, progress: progress.percent };
    notifyRenderer('progress', progress);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    logger.info('[AutoUpdater] Update downloaded');
    updateStatus = { ...updateStatus, downloaded: true, checking: false };
    notifyRenderer('downloaded', info);
    showUpdateDownloadedDialog(info);
  });

  autoUpdater.on('error', (error) => {
    logger.error('[AutoUpdater] Error:', { args: [error] });
    updateStatus = { ...updateStatus, checking: false, error: error.message };
    notifyRenderer('error', { message: error.message });
  });
}

async function checkForUpdates(): Promise<UpdateStatus> {
  try {
    if (process.env.NODE_ENV === 'development') {
      logger.info('[AutoUpdater] Skipping update check in development');
      return updateStatus;
    }
    await autoUpdater.checkForUpdates();
    return updateStatus;
  } catch (error) {
    logger.error('[AutoUpdater] Failed to check:', { args: [error] });
    updateStatus = { ...updateStatus, error: (error as Error).message };
    return updateStatus;
  }
}

async function downloadUpdate(): Promise<UpdateStatus> {
  try {
    await autoUpdater.downloadUpdate();
    return updateStatus;
  } catch (error) {
    logger.error('[AutoUpdater] Failed to download:', { args: [error] });
    updateStatus = { ...updateStatus, error: (error as Error).message };
    return updateStatus;
  }
}

function installUpdate(): void {
  logger.info('[AutoUpdater] Installing update...');
  autoUpdater.quitAndInstall();
}

function showUpdateAvailableDialog(info: UpdateInfo): void {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Update Available',
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

function showUpdateDownloadedDialog(info: UpdateInfo): void {
  dialog.showMessageBox(mainWindow!, {
    type: 'question',
    title: 'Update Ready',
    message: `Version ${info.version} downloaded.`,
    detail: 'Install now?',
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

export function getUpdateStatus(): UpdateStatus {
  return { ...updateStatus };
}
