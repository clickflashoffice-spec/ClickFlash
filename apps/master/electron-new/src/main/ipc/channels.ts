import { z } from 'zod';

export const KioskUnlockSchema = z.object({
  pin: z.string().length(6).regex(/^\d+$/)
});

export const DialogOptionsSchema = z.object({
  title: z.string().optional(),
  buttonLabel: z.string().optional(),
  defaultPath: z.string().optional(),
  filters: z.array(z.object({
    name: z.string(),
    extensions: z.array(z.string())
  })).optional(),
  multiple: z.boolean().optional(),
  properties: z.array(z.string()).optional()
});

export const PhotoImportSchema = z.object({
  albumId: z.string().uuid(),
  photographerId: z.string().optional(),
  sessionType: z.string().optional()
});

export const IpcChannels = {
  invoke: [
    'kiosk:unlock',
    'kiosk:lock',
    'dialog:openDirectory',
    'dialog:openFile',
    'dialog:saveFile',
    'updater:check',
    'updater:download',
    'updater:install',
    'updater:status',
    'db:query',
    'db:run',
    'system:getInfo',
    'system:getHealth',
    'photos:import',
    'photos:getBlobs',
    'window:minimize',
    'window:maximize',
    'window:close'
  ] as const,
  on: [
    'updater:checking',
    'updater:available',
    'updater:not-available',
    'updater:progress',
    'updater:downloaded',
    'updater:error',
    'sync:status',
    'sync:progress',
    'db:changed'
  ] as const
} as const;

export type InvokeChannel = typeof IpcChannels.invoke[number];
export type OnChannel = typeof IpcChannels.on[number];

export interface ElectronAPI {
  invoke: <T = unknown>(channel: InvokeChannel, ...args: unknown[]) => Promise<T>;
  on: (channel: OnChannel, callback: (...args: unknown[]) => void) => () => void;
  off: (channel: OnChannel, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
