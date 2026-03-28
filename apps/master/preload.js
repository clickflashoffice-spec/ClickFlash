/**
 * Preload script for secure IPC communication
 */

const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    invoke: (channel, ...args) => {
      // Whitelist channels
      const validChannels = [
        "updater:check",
        "updater:download",
        "updater:install",
        "updater:status",
        "dialog:openDirectory",
        "kiosk:unlock",
        "kiosk:lock",
      ];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      throw new Error(`Invalid channel: ${channel}`);
    },
    on: (channel, callback) => {
      const validChannels = [
        "updater:checking",
        "updater:available",
        "updater:not-available",
        "updater:progress",
        "updater:downloaded",
        "updater:error",
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => callback(event, ...args));
      }
    },
  },
});
