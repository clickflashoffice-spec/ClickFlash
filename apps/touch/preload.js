'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * ClickFlash Touch Kiosk — Preload Script
 *
 * Exposes a safe, channel-whitelisted IPC bridge to the renderer.
 * Merged from electron/preload.js (dead code) + original root preload.js.
 */

const INVOKE_CHANNELS = [
    // Kiosk mode control
    'exit-kiosk',
    'enter-kiosk',
    'kiosk:unlock',
    'kiosk:lock',
    // App lifecycle
    'get-app-version',
    'restart-app',
    // Printing
    'getPrinters',
    'print',
    // Auto-updater (admin UI triggers)
    'updater:check',
    'updater:status',
];

const ON_CHANNELS = [
    'kiosk:show-unlock-dialog',
    'updater:checking',
    'updater:available',
    'updater:not-available',
    'updater:progress',
    'updater:downloaded',
    'updater:error',
];

contextBridge.exposeInMainWorld('electron', {
    // Generic whitelist-guarded invoke / on
    invoke: (channel, ...args) => {
        if (!INVOKE_CHANNELS.includes(channel)) {
            throw new Error(`[Preload] Blocked IPC channel: ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, callback) => {
        if (!ON_CHANNELS.includes(channel)) return undefined;
        const handler = (_event, ...args) => callback(...args);
        ipcRenderer.on(channel, handler);
        return () => ipcRenderer.removeListener(channel, handler);
    },

    // Convenience helpers
    exitKiosk: (password) => ipcRenderer.invoke('exit-kiosk', password),
    enterKiosk: () => ipcRenderer.invoke('enter-kiosk'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    restartApp: () => ipcRenderer.invoke('restart-app'),

    // Kiosk PIN unlock / lock
    kiosk: {
        unlock: (pin) => ipcRenderer.invoke('kiosk:unlock', pin),
        lock: () => ipcRenderer.invoke('kiosk:lock'),
    },

    // Printing
    getPrinters: () => ipcRenderer.invoke('getPrinters'),
    print: (options) => ipcRenderer.invoke('print', options),

    // Meta
    platform: process.platform,
    isElectron: true,
});

contextBridge.exposeInMainWorld('touchApp', {
    isDesktop: true,
    platform: process.platform,
});
