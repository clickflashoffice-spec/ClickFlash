const { contextBridge, ipcRenderer } = require('electron');

const INVOKE_CHANNELS = [
    'exit-kiosk',
    'enter-kiosk',
    'get-app-version',
    'restart-app',
    'kiosk:unlock',
    'kiosk:lock',
];

const ON_CHANNELS = [
    'kiosk:show-unlock-dialog',
];

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, ...args) => {
        if (!INVOKE_CHANNELS.includes(channel)) {
            throw new Error(`[Preload] Blocked IPC channel: ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, callback) => {
        if (!ON_CHANNELS.includes(channel)) return;
        const handler = (_event, ...args) => callback(...args);
        ipcRenderer.on(channel, handler);
        return () => ipcRenderer.removeListener(channel, handler);
    },
    exitKiosk: () => ipcRenderer.invoke('exit-kiosk'),
    enterKiosk: () => ipcRenderer.invoke('enter-kiosk'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    restartApp: () => ipcRenderer.invoke('restart-app'),
    kiosk: {
        unlock: (pin) => ipcRenderer.invoke('kiosk:unlock', pin),
        lock: () => ipcRenderer.invoke('kiosk:lock'),
    },
    platform: process.platform,
    isElectron: true,
});

contextBridge.exposeInMainWorld('touchApp', {
    isDesktop: true,
    platform: process.platform,
});
