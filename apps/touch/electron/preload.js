const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Kiosk controls
    exitKiosk: () => ipcRenderer.invoke('exit-kiosk'),
    enterKiosk: () => ipcRenderer.invoke('enter-kiosk'),

    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // App controls
    restartApp: () => ipcRenderer.invoke('restart-app'),

    // Platform info
    platform: process.platform,
    isElectron: true,
});

// Expose a safe API for the touch app
contextBridge.exposeInMainWorld('touchApp', {
    isDesktop: true,
    platform: process.platform,
});
