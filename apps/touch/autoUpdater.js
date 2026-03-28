/**
 * Auto Updater Module for Touch Kiosk
 * Handles automatic updates using electron-updater
 */

const { app, dialog, ipcMain, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

// Configure auto-updater
autoUpdater.logger = console;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;
let updateStatus = {
  checking: false,
  available: false,
  downloaded: false,
  error: null,
  progress: 0,
  version: null,
  releaseNotes: null
};

function initAutoUpdater(window) {
  mainWindow = window;
  
  // Check for updates after 30 seconds (give app time to fully start)
  setTimeout(() => {
    checkForUpdates();
  }, 30000);

  setupIpcHandlers();
  setupEventHandlers();
}

function setupIpcHandlers() {
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

function setupEventHandlers() {
  autoUpdater.on('checking-for-update', () => {
    console.log('[TouchAutoUpdater] Checking for update...');
    updateStatus = { ...updateStatus, checking: true, error: null };
    notifyRenderer('checking');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[TouchAutoUpdater] Update available:', info.version);
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
    console.log('[TouchAutoUpdater] No update available');
    updateStatus = { ...updateStatus, checking: false, available: false };
    notifyRenderer('not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    updateStatus = { ...updateStatus, progress: progress.percent };
    notifyRenderer('progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[TouchAutoUpdater] Update downloaded');
    updateStatus = { ...updateStatus, downloaded: true, checking: false };
    notifyRenderer('downloaded', info);
    showUpdateDownloadedDialog(info);
  });

  autoUpdater.on('error', (error) => {
    console.error('[TouchAutoUpdater] Error:', error);
    updateStatus = { ...updateStatus, checking: false, error: error.message };
    notifyRenderer('error', { message: error.message });
  });
}

async function checkForUpdates() {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[TouchAutoUpdater] Skipping update check in development');
      return updateStatus;
    }
    await autoUpdater.checkForUpdates();
    return updateStatus;
  } catch (error) {
    console.error('[TouchAutoUpdater] Failed to check:', error);
    updateStatus = { ...updateStatus, error: error.message };
    return updateStatus;
  }
}

async function downloadUpdate() {
  try {
    await autoUpdater.downloadUpdate();
    return updateStatus;
  } catch (error) {
    console.error('[TouchAutoUpdater] Failed to download:', error);
    updateStatus = { ...updateStatus, error: error.message };
    return updateStatus;
  }
}

function installUpdate() {
  console.log('[TouchAutoUpdater] Installing update...');
  autoUpdater.quitAndInstall();
}

function showUpdateAvailableDialog(info) {
  // Only show dialog if window exists and is not destroyed
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

function showUpdateDownloadedDialog(info) {
  // Only show dialog if window exists and is not destroyed
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

function notifyRenderer(event, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:' + event, data);
  }
}

function forceCheckForUpdates() {
  checkForUpdates();
}

function getUpdateStatus() {
  return { ...updateStatus };
}

module.exports = {
  initAutoUpdater,
  forceCheckForUpdates,
  getUpdateStatus
};
