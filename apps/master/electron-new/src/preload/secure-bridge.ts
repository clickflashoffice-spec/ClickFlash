import { logger } from '@clickflash/logger';
import { contextBridge, ipcRenderer } from 'electron';

export interface SecurityConfig {
  enabled: boolean;
  channels: readonly string[];
}

const VALID_INVOKE_CHANNELS = [
  'kiosk:unlock',
  'kiosk:lock',
  'kiosk:status',
  'window:minimize',
  'window:maximize',
  'window:close',
  'window:fullscreen',
  'window:isFullscreen',
  'dialog:openDirectory',
  'dialog:openFile',
  'dialog:saveFile',
  'backend:restart',
  'backend:status',
  'backend:health',
  'log:write',
  'system:getInfo',
  'system:getHealth',
] as const;

const VALID_ON_CHANNELS = [
  'updater:checking',
  'updater:available',
  'updater:not-available',
  'updater:progress',
  'updater:downloaded',
  'updater:error',
  'sync:status',
  'sync:progress',
] as const;

type ValidInvokeChannel = typeof VALID_INVOKE_CHANNELS[number];
type ValidOnChannel = typeof VALID_ON_CHANNELS[number];

const onListeners = new Map<ValidOnChannel, Set<(...args: unknown[]) => void>>();

function validateInvokeChannel(channel: string): channel is ValidInvokeChannel {
  return (VALID_INVOKE_CHANNELS as readonly string[]).includes(channel);
}

function validateOnChannel(channel: string): channel is ValidOnChannel {
  return (VALID_ON_CHANNELS as readonly string[]).includes(channel);
}

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
    if (!validateInvokeChannel(channel)) {
      return Promise.reject(new Error(`Invalid IPC invoke channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args) as Promise<T>;
  },
  
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    if (!validateOnChannel(channel)) {
      logger.warn(`Invalid IPC on channel: ${channel}`);
      return () => {};
    }
    
    if (!onListeners.has(channel)) {
      onListeners.set(channel, new Set());
      
      ipcRenderer.on(channel, (_event, ...args) => {
        const listeners = onListeners.get(channel as ValidOnChannel);
        if (listeners) {
          listeners.forEach(cb => {
            try {
              cb(...args);
            } catch (err) {
              logger.error(`Error in IPC listener for ${channel}:`, err);
            }
          });
        }
      });
    }
    
    onListeners.get(channel as ValidOnChannel)!.add(callback);
    
    return () => {
      const listeners = onListeners.get(channel as ValidOnChannel);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  },
  
  off: (channel: string, callback: (...args: unknown[]) => void): void => {
    if (!validateOnChannel(channel)) {
      return;
    }
    
    const listeners = onListeners.get(channel as ValidOnChannel);
    if (listeners) {
      listeners.delete(callback);
    }
  },
  
  getSecurityConfig: (): SecurityConfig => ({
    enabled: true,
    channels: VALID_INVOKE_CHANNELS,
  }),
});

logger.info('[Preload] Security-hardened Electron API exposed');
