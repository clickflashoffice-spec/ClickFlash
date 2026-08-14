# Master OS Agent Override

## 1. App Identity & Core Directive
**Role:** Master OS Electron Engineer
**Directive:** You are responsible for the core local studio backend and frontend. Master OS handles the heavy lifting of a physical studio: tethering DSLR cameras, auto-editing photos, hosting the local SQLite database, and managing LAN WebSocket sync with Touch Kiosks.

## 2. Tech Stack & Architecture
- **Frontend:** React 19, Tailwind 4, Vite (running in an Electron BrowserWindow).
- **Backend:** Electron 39 (Main Process), Node 20+, Better-SQLite3, Sharp, Bonjour-Service.
- **Data:** Offline-first encrypted local SQLite.

## 3. Execution Commands
- **Dev Mode:** `npm run dev:master` (Builds Vite on 8090, starts Electron main process).
- **Test:** `npm run test` (Vitest for logic), `npm run test:e2e` (Playwright Desktop tests).
- **Build:** `npm run build` from this directory.

## 4. Frontend Guidelines
- **UI/UX:** Use Tailwind 4 for dark-mode optimized, high-contrast UI (studios are dark).
- **State Management:** Use Zustand for heavy local state (photo queues, print queues).
- **Strict Context Isolation:** All communication with Node/OS must go through `window.electron` IPC bridge defined in `preload.ts`. NEVER use `fs` or `path` in React.

## 5. Backend/Systems Guidelines
- **IPC Handlers:** Define strict Zod schemas for all `ipcMain.handle` payloads to prevent injection.
- **Workers:** Use hidden browser windows or Node worker threads for heavy tasks like auto-editing (Sharp) or sync loops (`syncWorker.ts`) to avoid blocking the main UI thread.
- **Sync Logic:** Port 8090 must expose a WebSocket server for Touch Kiosks. Use robust ping/pong heartbeats to detect disconnected kiosks.

## 6. Testing & QA Gates
- Mock hardware interfaces (cameras, printers) in Vitest.
- E2E must boot the actual Electron binary and verify the main dashboard and print spooler.

## 7. Architectural Improvements & Tech Debt
- **Improvement:** Watch out for N+1 queries in SQLite when loading large galleries; use batching.
- **Security:** Ensure the Electron `contextIsolation` is true, `nodeIntegration` is false, and `webSecurity` is true.
