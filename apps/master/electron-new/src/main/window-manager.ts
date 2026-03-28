/**
 * Window Manager for Phase 71
 * Handles BrowserWindow creation, kiosk mode, and renderer lifecycle
 */

import { BrowserWindow, screen, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getLogger } from '../utils/logger';
import { WINDOW, PATHS, SECURITY } from '../utils/constants';

const logger = getLogger('window');

export class WindowManager {
  public mainWindow: BrowserWindow | null = null;
  private onRendererCrashedCallback: (() => void) | null = null;
  private isLoading = false;

  /**
   * Create the main application window
   */
  async createWindow(): Promise<BrowserWindow> {
    logger.info('Creating main window', {
      mode: app.isPackaged ? 'production' : 'development',
    });

    // Get primary display (for reference if needed later)
    screen.getPrimaryDisplay();

    const preloadPath = this.getPreloadPath();
    logger.info('Using preload script', { path: preloadPath });

    this.mainWindow = new BrowserWindow({
      width: WINDOW.DEFAULT_WIDTH,
      height: WINDOW.DEFAULT_HEIGHT,
      minWidth: WINDOW.MIN_WIDTH,
      minHeight: WINDOW.MIN_HEIGHT,
      
      // Kiosk mode settings
      fullscreen: true,
      kiosk: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      
      // Window styling
      title: 'ClickFlash Master OS',
      icon: path.join(process.cwd(), 'build/icon.ico'),
      
      // Security settings
      show: false, // Don't show until loaded
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: preloadPath,
        devTools: process.env.NODE_ENV === 'development',
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
      },
    });

    // Hide menu bar
    this.mainWindow.setMenuBarVisibility(false);
    this.mainWindow.setAutoHideMenuBar(true);

    // Setup event handlers
    this.setupWindowEvents();
    this.setupSecurityHandlers();

    // Show loading screen immediately
    await this.showLoadingScreen();

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      if (!this.isLoading) {
        this.mainWindow?.show();
        this.mainWindow?.focus();
        logger.info('Window ready and shown');
      }
    });

    return this.mainWindow;
  }

  /**
   * Get the preload script path
   */
  private getPreloadPath(): string {
    const fs = require('fs');
    
    // Check multiple possible locations for preload script
    const possiblePaths = [
      // Development: from electron-new dist
      path.join(__dirname, '../preload/index.js'),
      path.join(__dirname, '../../preload/index.js'),
      // Production: from dist/electron
      path.join(process.cwd(), 'dist/electron/preload.js'),
      path.join(process.cwd(), 'electron-new/dist/preload/index.js'),
      // Packaged app
      path.join(app.getAppPath(), 'dist/electron/preload.js'),
      path.join(app.getAppPath(), 'electron-new/dist/preload/index.js'),
      // Resources path
      path.join(process.resourcesPath || '', 'app.asar/dist/electron/preload.js'),
      path.join(process.resourcesPath || '', 'app/dist/electron/preload.js'),
    ];

    for (const preloadPath of possiblePaths) {
      try {
        if (fs.existsSync(preloadPath)) {
          logger.debug('Found preload script', { path: preloadPath });
          return preloadPath;
        }
      } catch (e) {
        logger.debug('Preload path check failed', { path: preloadPath, error: String(e) });
      }
    }

    // Last resort: check for empty preload
    const emptyPreload = path.join(__dirname, '../preload/empty.js');
    if (fs.existsSync(emptyPreload)) {
      logger.warn('Using empty preload script');
      return emptyPreload;
    }

    // If no preload found at all, log error but continue
    logger.error('Preload script not found - IPC will not work', {
      attemptedPaths: possiblePaths,
      cwd: process.cwd(),
      __dirname: __dirname,
      appPath: app.getAppPath(),
    });
    
    // Return a non-existent path - Electron will handle the error
    return path.join(__dirname, 'no-preload-found.js');
  }

  /**
   * Load the application (dev or prod)
   */
  async loadApp(): Promise<void> {
    if (!this.mainWindow) {
      logger.error('Cannot load app - no main window');
      return;
    }

    this.isLoading = true;
    logger.info('Loading application', {
      mode: app.isPackaged ? 'production' : 'development',
      url: app.isPackaged ? 'file' : PATHS.RENDERER_DEV,
    });

    try {
      if (!app.isPackaged) {
        // Development mode - load from Vite dev server
        logger.info('Loading from Vite dev server', { url: PATHS.RENDERER_DEV });
        await this.mainWindow.loadURL(PATHS.RENDERER_DEV);
      } else {
        // Production mode - load from built files
        const indexPath = path.join(process.cwd(), PATHS.RENDERER_PROD);
        
        if (fs.existsSync(indexPath)) {
          logger.info('Loading from built files', { path: indexPath });
          await this.mainWindow.loadFile(indexPath);
        } else {
          // Try alternative path
          const altPath = path.join(__dirname, '../../../dist/master/index.html');
          if (fs.existsSync(altPath)) {
            logger.info('Loading from alternative path', { path: altPath });
            await this.mainWindow.loadFile(altPath);
          } else {
            logger.error('Built files not found', {
              attempted: [indexPath, altPath],
              cwd: process.cwd(),
            });
            throw new Error('Application files not found');
          }
        }
      }
      
      this.isLoading = false;
      logger.info('Application loaded successfully');
      
      // Now show the window since loading is complete
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    } catch (error) {
      this.isLoading = false;
      logger.error('Failed to load application', { error: String(error) });
      throw error;
    }
  }

  /**
   * Show initial loading screen with proper status updates
   */
  private async showLoadingScreen(): Promise<void> {
    if (!this.mainWindow) return;

    const version = app.getVersion();
    const loadingHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .container {
              text-align: center;
              max-width: 500px;
              padding: 20px;
            }
            .logo {
              color: #06b6d4;
              font-size: 28px;
              font-weight: bold;
              letter-spacing: 4px;
              text-transform: uppercase;
              margin-bottom: 24px;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid #334155;
              border-top-color: #06b6d4;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .status {
              color: #64748b;
              font-size: 14px;
              letter-spacing: 2px;
              margin-bottom: 10px;
            }
            .progress-bar {
              width: 200px;
              height: 4px;
              background: #334155;
              border-radius: 2px;
              margin: 20px auto;
              overflow: hidden;
            }
            .progress-bar-fill {
              height: 100%;
              background: #06b6d4;
              width: 0%;
              transition: width 0.3s ease;
            }
            .error {
              color: #ef4444;
              font-size: 13px;
              margin-top: 20px;
              padding: 15px;
              background: rgba(239, 68, 68, 0.1);
              border-radius: 8px;
              border: 1px solid rgba(239, 68, 68, 0.3);
              display: none;
              text-align: left;
            }
            .error.visible {
              display: block;
            }
            .retry-btn {
              margin-top: 15px;
              padding: 8px 20px;
              background: #06b6d4;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
              display: none;
            }
            .retry-btn.visible {
              display: inline-block;
            }
            .version {
              color: #475569;
              font-size: 12px;
              margin-top: 40px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">ClickFlash</div>
            <div class="spinner" id="spinner"></div>
            <div class="status" id="status">Initializing...</div>
            <div class="progress-bar">
              <div class="progress-bar-fill" id="progress"></div>
            </div>
            <div class="error" id="error"></div>
            <button class="retry-btn" id="retryBtn" onclick="retry()">Retry</button>
            <div class="version">v${version}</div>
          </div>
          <script>
            let progress = 0;
            let progressInterval;
            
            function showError(message) {
              document.getElementById('spinner').style.display = 'none';
              document.getElementById('status').textContent = 'Startup Error';
              document.getElementById('progress').style.width = '0%';
              document.getElementById('error').textContent = message;
              document.getElementById('error').classList.add('visible');
              document.getElementById('retryBtn').classList.add('visible');
              clearInterval(progressInterval);
            }
            
            function updateStatus(message, percent) {
              document.getElementById('status').textContent = message;
              document.getElementById('progress').style.width = percent + '%';
            }
            
            function retry() {
              window.location.reload();
            }
            
            // Simulate progress when no updates from main process
            progressInterval = setInterval(function() {
              if (progress < 90) {
                progress += Math.random() * 5;
                if (progress > 90) progress = 90;
                document.getElementById('progress').style.width = progress + '%';
              }
            }, 1000);
            
            // Listen for status updates from main process
            window.addEventListener('message', function(e) {
              if (e.data && e.data.type === 'startup-status') {
                updateStatus(e.data.message, e.data.percent || 50);
              }
            });
            
            // Listen for errors from main process
            window.addEventListener('error-message', function(e) {
              showError(e.detail.message);
            });
          </script>
        </body>
      </html>
    `;

    await this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml)}`);
    logger.info('Loading screen shown');
  }

  /**
   * Update loading screen status
   */
  updateLoadingStatus(message: string, percent: number = 50): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    
    try {
      this.mainWindow.webContents.executeJavaScript(`
        if (window.updateStatus) window.updateStatus(${JSON.stringify(message)}, ${percent});
      `).catch(() => {});
    } catch (e) {
      // Ignore errors when updating loading screen
    }
  }

  /**
   * Show error in loading screen
   */
  showStartupError(message: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    
    try {
      this.mainWindow.webContents.executeJavaScript(`
        if (window.showError) window.showError(${JSON.stringify(message)});
      `).catch(() => {});
    } catch (e) {
      logger.error('Failed to show startup error', { error: String(e) });
    }
  }

  /**
   * Setup window event handlers
   */
  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    // Window closed
    this.mainWindow.on('closed', () => {
      logger.info('Window closed');
      this.mainWindow = null;
    });

    // Renderer process crashed
    this.mainWindow.webContents.on('render-process-gone', (_event, details) => {
      logger.error('Renderer process crashed', { reason: details.reason, exitCode: details.exitCode });
      this.onRendererCrashedCallback?.();
    });

    // Renderer unresponsive
    this.mainWindow.on('unresponsive', () => {
      logger.warn('Renderer process unresponsive');
      setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.reload();
        }
      }, 10000);
    });

    // Responsive again
    this.mainWindow.on('responsive', () => {
      logger.info('Renderer process responsive again');
    });

    // Did-finish-load
    this.mainWindow.webContents.on('did-finish-load', () => {
      logger.info('Window finished loading');
    });

    // Did-fail-load
    this.mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      logger.error('Window failed to load', { errorCode, errorDescription });
    });
  }

  /**
   * Setup security handlers
   */
  private setupSecurityHandlers(): void {
    if (!this.mainWindow) return;

    const wc = this.mainWindow.webContents;

    // Block navigation to external URLs
    wc.on('will-navigate', (event, url) => {
      const parsedUrl = new URL(url);
      const isAllowed = SECURITY.ALLOWED_NAVIGATION_HOSTS.includes(parsedUrl.hostname) 
        || url.startsWith('file://') 
        || url.startsWith('data:');
      
      if (!isAllowed) {
        logger.warn('Blocked navigation to', { url });
        event.preventDefault();
      }
    });

    // Block new window creation
    wc.setWindowOpenHandler(({ url }) => {
      logger.warn('Blocked new window', { url });
      return { action: 'deny' };
    });

    // Block context menu (right-click)
    wc.on('context-menu', (event) => {
      event.preventDefault();
    });

    // Block keyboard shortcuts
    wc.on('before-input-event', (event, input) => {
      const key = input.key.toLowerCase();

      // Block F1-F12 keys
      if (SECURITY.BLOCKED_SHORTCUTS.includes(key)) {
        event.preventDefault();
        return;
      }

      // Block Ctrl+I (DevTools), Ctrl+R (reload), etc.
      if (input.control && ['i', 'r', 'u', '=', '-', '0'].includes(key)) {
        event.preventDefault();
        return;
      }

      // Block Alt+F4
      if (input.alt && key === 'f4') {
        event.preventDefault();
      }
    });
  }

  /**
   * Window control methods
   */
  minimize(): void {
    logger.debug('Minimize blocked (kiosk mode)');
  }

  maximize(): void {
    this.mainWindow?.maximize();
  }

  close(): void {
    this.mainWindow?.close();
  }

  reload(): void {
    logger.info('Reloading renderer');
    this.mainWindow?.reload();
  }

  setFullscreen(enabled: boolean): void {
    this.mainWindow?.setFullScreen(enabled);
    this.mainWindow?.setKiosk(enabled);
  }

  isFullscreen(): boolean {
    return this.mainWindow?.isFullScreen() || false;
  }

  focus(): void {
    this.mainWindow?.focus();
    this.mainWindow?.show();
  }

  destroy(): void {
    this.mainWindow?.destroy();
    this.mainWindow = null;
  }

  /**
   * Set callback for renderer crashes
   */
  onRendererCrashed(callback: () => void): void {
    this.onRendererCrashedCallback = callback;
  }
}
