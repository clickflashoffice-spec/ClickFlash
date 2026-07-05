---
sidebar_position: 6
title: IPC Communication Protocol
description: Architecture of the Inter-Process Communication (IPC) bridging Electron Main and Renderer processes.
---

# IPC Communication Protocol

ClickFlash heavily relies on the Electron framework for both the **Master Station** and the **Touch Kiosks**. To maintain security and strictly isolate the Node.js environment from the Chromium frontend, we enforce a strict Inter-Process Communication (IPC) protocol.

## 1. The Context Isolation Boundary

By default, `contextIsolation` is set to `true` and `nodeIntegration` is set to `false` across all ClickFlash Electron `BrowserWindow` instances. The Renderer process (React) has zero direct access to the filesystem, network stack, or OS-level APIs.

All communication must traverse the `preload.ts` boundary using `contextBridge`.

## 2. Global `window.api` Object

The preload script exposes a locked-down API object to the `window`. This object acts as the sole communication conduit.

### Standardized Channels

We categorize IPC channels into three types:

1. **Commands (Renderer to Main, Expects Response)**
   - Used for asynchronous actions where the frontend needs data (e.g., fetching local files, reading printer status).
   - *Example:* `window.api.invoke('system:get-printers', payload)`

2. **Actions (Renderer to Main, Fire & Forget)**
   - Used for triggering OS-level actions without needing a data response (e.g., closing the app, maximizing the window).
   - *Example:* `window.api.send('window:close')`

3. **Events (Main to Renderer)**
   - Used for pushing hardware events or background task updates to the frontend (e.g., USB drive inserted, sync progress).
   - *Example:* `window.api.on('usb:detected', callback)`

## 3. Security Requirements

To prevent arbitrary code execution (ACE) vulnerabilities:
- **Stringent Channel Whitelisting**: The `preload.ts` file must contain an explicit array of permitted channels (e.g., `const validChannels = ['system:ping', 'file:read']`). If a channel is not in the whitelist, the IPC bridge will silently block the message.
- **Payload Validation**: The Main process (`electron-main.ts`) utilizes Zod schemas to aggressively validate all payloads coming from the Renderer. Never trust IPC payloads.

## 4. Example Implementation

### Preload Script (`preload.ts`)
```typescript
import { contextBridge, ipcRenderer } from 'electron';

const validInvokeChannels = ['printer:list', 'file:read-image'];
const validSendChannels = ['window:minimize'];

contextBridge.exposeInMainWorld('api', {
  invoke: (channel: string, data: any) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    throw new Error(`Unauthorized IPC channel: ${channel}`);
  },
  send: (channel: string, data: any) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  }
});
```

### Main Process Receiver (`electron-main.ts`)
```typescript
import { ipcMain } from 'electron';
import { z } from 'zod';

const FileReadSchema = z.object({
  path: z.string().min(1)
});

ipcMain.handle('file:read-image', async (event, payload) => {
  // 1. Validate payload
  const result = FileReadSchema.safeParse(payload);
  if (!result.success) throw new Error("Invalid payload");
  
  // 2. Execute secure OS action
  return await secureFileRead(result.data.path);
});
```
