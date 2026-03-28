const { contextBridge, ipcRenderer } = require('electron');

/**
 * Rule 05: Universal Environment Parity
 * Expose a consistent 'electron' API to the frontend.
 */
contextBridge.exposeInMainWorld('electron', {
    getPrinters: () => ipcRenderer.invoke('getPrinters'),
    print: (options) => ipcRenderer.invoke('print', options),
    exitKiosk: (password) => ipcRenderer.invoke('exit-kiosk', password),
    isElectron: true
});
