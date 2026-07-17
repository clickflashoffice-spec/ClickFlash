import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const DEVELOPMENT_ORIGIN = 'http://localhost:5176';
const RENDERER_ENTRY = path.join(__dirname, '../dist/renderer/index.html');
let mainWindow: BrowserWindow | null = null;

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged,
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

  // Load the renderer
  if (app.isPackaged) {
    void mainWindow.loadFile(RENDERER_ENTRY);
  } else {
    void mainWindow.loadURL(DEVELOPMENT_ORIGIN);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
