/**
 * Phase 71: Master Electron App - Main Process Entry
 * Stable Kiosk-Locked Desktop App with Process Isolation
 */

import { app, BrowserWindow, globalShortcut, ipcMain, dialog } from 'electron';
import { getLogger } from '../utils/logger';
import { KIOSK, RECOVERY } from '../utils/constants';
import { ProcessManager } from './process-manager';
import { WindowManager } from './window-manager';
import { KioskManager } from './kiosk-manager';

const logger = getLogger('main');

// Global references to prevent GC
let windowManager: WindowManager | null = null;
let processManager: ProcessManager | null = null;
let kioskManager: KioskManager | null = null;

// Track if we're shutting down to prevent restart loops
let isShuttingDown = false;
let restartAttempts = 0;
let lastRestartTime = 0;

/**
 * Initialize the Electron application
 * CRITICAL: Startup sequence must be:
 * 1. Start backend server (process manager)
 * 2. Wait for backend to be healthy
 * 3. Create window (so it can connect to backend)
 * 4. Load app in window
 */
async function initializeApp(): Promise<void> {
  logger.info('Initializing ClickFlash Master OS', {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    mode: app.isPackaged ? 'production' : 'development',
  });

  try {
    // 1. Initialize process manager (backend server)
    logger.info('Step 1: Initializing process manager');
    processManager = new ProcessManager();

    // 2. Start backend server process
    logger.info('Step 2: Starting backend server');
    await processManager.start();

    // 3. Wait for backend to be healthy (max 60 seconds)
    logger.info('Step 3: Waiting for backend to be healthy');
    const backendReady = await processManager.waitForHealthy(60000);
    if (!backendReady) {
      logger.error('Backend failed to start within timeout');
      // Don't throw - we'll retry in background and show error in window
    } else {
      logger.info('Backend is healthy');
    }

    // 4. Initialize window manager
    logger.info('Step 4: Creating main window');
    windowManager = new WindowManager();
    await windowManager.createWindow();
    logger.info('Main window created');

    // 5. Show backend status in loading screen
    if (!backendReady && windowManager) {
      windowManager.showStartupError('Backend server is starting. Please wait...');
    }

    // 6. Initialize kiosk manager
    if (windowManager?.mainWindow) {
      kioskManager = new KioskManager(windowManager.mainWindow);
      await kioskManager.enableKioskMode();
      logger.info('Kiosk mode enabled');
    }

    // 7. Setup IPC handlers
    setupIpcHandlers();
    logger.info('Step 7: IPC handlers registered');

    // 8. Setup global shortcuts
    setupGlobalShortcuts();
    logger.info('Step 8: Global shortcuts registered');

    // 9. Load the actual app now that backend is ready
    logger.info('Step 9: Loading application');
    await windowManager.loadApp();

    // 10. Setup process monitoring
    setupProcessMonitoring();
    logger.info('Step 10: Process monitoring active');

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', error);
    
    // Show error in window if possible
    if (windowManager) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      windowManager.showStartupError(`Startup failed: ${errorMessage}`);
    }
    
    throw error;
  }
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIpcHandlers(): void {
  // Kiosk mode IPC
  ipcMain.handle('kiosk:unlock', async (_event, pin: string) => {
    if (!kioskManager) return { success: false, error: 'Kiosk not initialized' };
    return kioskManager.unlock(pin);
  });

  ipcMain.handle('kiosk:lock', async () => {
    if (!kioskManager) return { success: false, error: 'Kiosk not initialized' };
    return kioskManager.lock();
  });

  ipcMain.handle('kiosk:status', async () => {
    if (!kioskManager) return { isLocked: false };
    return { isLocked: kioskManager.isLocked() };
  });

  // Window IPC
  ipcMain.handle('window:minimize', async () => {
    windowManager?.minimize();
  });

  ipcMain.handle('window:maximize', async () => {
    windowManager?.maximize();
  });

  ipcMain.handle('window:close', async () => {
    windowManager?.close();
  });

  ipcMain.handle('window:fullscreen', async (_event, enabled: boolean) => {
    windowManager?.setFullscreen(enabled);
  });

  ipcMain.handle('window:isFullscreen', async () => {
    return windowManager?.isFullscreen() || false;
  });

  // Dialog IPC
  ipcMain.handle('dialog:openDirectory', async (_event, options) => {
    const win = windowManager?.mainWindow;
    if (!win) return null;
    
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: options?.title || 'Select Folder',
      buttonLabel: options?.buttonLabel || 'Select',
    });
    
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:openFile', async (_event, options) => {
    const win = windowManager?.mainWindow;
    if (!win) return null;
    
    const result = await dialog.showOpenDialog(win, {
      properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      title: options?.title || 'Select File',
      filters: options?.filters,
    });
    
    if (result.canceled) return null;
    return options?.multiple ? result.filePaths : result.filePaths[0];
  });

  // Backend IPC
  ipcMain.handle('backend:restart', async () => {
    try {
      await processManager?.restart();
      return { success: true };
    } catch (error) {
      logger.error('Failed to restart backend', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('backend:status', async () => {
    return processManager?.getStatus() || { status: 'stopped' };
  });

  ipcMain.handle('backend:health', async () => {
    return processManager?.healthCheck() || { healthy: false, latencyMs: 0 };
  });

  // Logging IPC
  ipcMain.handle('log:write', (_event, level: string, message: string, meta?: Record<string, unknown>) => {
    switch (level) {
      case 'debug':
        logger.debug(`[Renderer] ${message}`, meta);
        break;
      case 'warn':
        logger.warn(`[Renderer] ${message}`, meta);
        break;
      case 'error':
        logger.error(`[Renderer] ${message}`, undefined, meta);
        break;
      default:
        logger.info(`[Renderer] ${message}`, meta);
    }
  });

  logger.info('IPC handlers registered');
}

/**
 * Setup global shortcuts (admin breakout, kiosk controls)
 */
function setupGlobalShortcuts(): void {
  // Admin breakout shortcut - exits kiosk mode
  globalShortcut.register(KIOSK.ADMIN_SHORTCUT, () => {
    logger.info('Admin breakout shortcut triggered');
    kioskManager?.emergencyUnlock();
  });

  // Block Alt+Tab
  globalShortcut.register('Alt+Tab', () => {
    return false;
  });

  // Block Alt+F4
  globalShortcut.register('Alt+F4', () => {
    return false;
  });

  // Block Windows/Super key combinations
  try {
    globalShortcut.register('Super', () => false);
    globalShortcut.register('Super+D', () => false);
    globalShortcut.register('Super+Tab', () => false);
    globalShortcut.register('Super+L', () => false);
    globalShortcut.register('Super+E', () => false);
  } catch (e) {
    logger.warn('Could not register Super shortcuts', { error: e instanceof Error ? e.message : String(e) });
  }

  logger.info('Global shortcuts registered');
}

/**
 * Setup process monitoring and auto-recovery
 */
function setupProcessMonitoring(): void {
  if (!processManager) return;

  processManager.on('unresponsive', async () => {
    logger.warn('Backend process unresponsive, attempting recovery');
    
    if (isShuttingDown) return;
    
    const now = Date.now();
    if (now - lastRestartTime < RECOVERY.RESTART_COOLDOWN_MS) {
      restartAttempts = 0;
    }
    
    if (restartAttempts >= RECOVERY.MAX_RESTART_ATTEMPTS) {
      logger.error('Max restart attempts reached, showing error dialog');
      dialog.showErrorBox(
        'System Error',
        'The application has encountered a critical error and cannot recover. Please restart the computer.'
      );
      return;
    }
    
    restartAttempts++;
    lastRestartTime = now;
    
    try {
      await processManager?.restart();
      logger.info('Backend process recovered successfully');
    } catch (error) {
      logger.error('Failed to restart backend process', error);
    }
  });

  processManager.on('crashed', async () => {
    logger.error('Backend process crashed, attempting restart');
    
    if (isShuttingDown) return;
    
    try {
      await processManager?.restart();
      logger.info('Backend process restarted after crash');
    } catch (error) {
      logger.error('Failed to restart backend after crash', error);
    }
  });

  // Monitor renderer crashes
  windowManager?.onRendererCrashed(() => {
    logger.error('Renderer process crashed, reloading');
    windowManager?.reload();
  });

  logger.info('Process monitoring active');
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`Shutting down due to ${signal}`);
  
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // Stop process manager
  if (processManager) {
    await processManager.stop();
  }
  
  // Close window
  windowManager?.destroy();
  
  logger.info('Shutdown complete');
  app.quit();
}

// ==================== App Event Handlers ====================

app.whenReady().then(initializeApp).catch((error) => {
  logger.error('Failed to start application', error);
  dialog.showErrorBox(
    'Startup Error',
    `Failed to start ClickFlash Master OS: ${error.message}`
  );
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    shutdown('window-all-closed');
  }
});

app.on('before-quit', () => {
  shutdown('before-quit');
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager?.createWindow();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  logger.error('Another instance is already running');
  app.quit();
} else {
  app.on('second-instance', () => {
    logger.warn('Second instance attempted to start');
    windowManager?.focus();
  });
}

// Security: Prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    logger.warn('Blocked new window creation attempt', { url });
    return { action: 'deny' };
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in main process', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection in main process', reason instanceof Error ? reason : undefined, { reason: String(reason) });
});
