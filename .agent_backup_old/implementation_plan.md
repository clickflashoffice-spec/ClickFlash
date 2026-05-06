# Implementation Plan - Master App Production Hardening

This plan outlines the systematic refactoring of the ClickFlash Master application to ensure commercial-grade stability, reliable builds, and high-performance ingestion.

## Top 3 Fatal Flaws in Current Setup

1.  **Native Dependency Chain Paradox**: The build system marks critical native modules (`better-sqlite3`, `sharp`) as `external` in `esbuild` while `electron-builder` excludes `node_modules` (!\*\*/node_modules/\*\*). result: Packaged builds will missing critical `.node` files, causing an immediate crash.
2.  **Unauthorized Data Path Resolution**: The application resolves its primary data store to `path.dirname(app.getPath("exe"))`. Commercial deployments in `C:\Program Files` are read-only; the app will fail to create its database or store photos without elevated privileges.
3.  **Invariant Violation: Source-Media I/O Stalling**: `PhotoProcessor.ts` currently processes and hashes assets directly on source media (SD cards) before copying. This violates Architectural Invariant #3 and Law 13, causing massive UI stuttering and potential data corruption during large-scale imports.

---

## Proposed Changes

### Phase 1: Build Pipeline & Bundler Hardening

Fix the disconnect between the bundler (esbuild) and the packager (electron-builder).

#### [MODIFY] [electron-builder.yml](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/electron-builder.yml)
- Adjust `files` to correctly include the `dist` folder and local `node_modules` for production.
- Refine `asarUnpack` to specifically target native binaries (`.node` files) to ensure `child_process.fork` and native bindings function correctly.

#### [NEW] [scripts/package-production-deps.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/scripts/package-production-deps.ts)
- Create a script to prune and copy only essential production native modules into the `dist/backend/node_modules` folder, ensuring the bundle is entirely self-contained without symlinks.

#### [MODIFY] [package.json](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/package.json)
- Update `build:backend` to trigger the new dependency packaging script.

---

### Phase 2: Main Process & IPC Stabilization

Refactor the core Electron entry point for resilience and commercial-standard pathing.

#### [MODIFY] [electron-main.js](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/electron-main.js)
- **Hardened Pathing**: Change `getDataDir` to use `app.getPath('userData')`. This ensures high-permission writability and standardizes data storage across Windows environments.
- **Robust Sequential Booting**: Refactor `startBackend` to ensure the Express server on Port 8090 is fully bound and healthy *before* the main window is even initialized, preventing the "white screen of death."
- **Global Error Handling**: Implement a robust catch-all UI for main-process crashes, allowing users to see a "Technical details" screen rather than the app simply disappearing.

#### [MODIFY] [preload.js](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/preload.js)
- Clean up IPC exposures and implement automated listener cleanup to prevent memory leaks in the renderer.

---

### Phase 3: Resource & Memory Management (Ingestion)

Enforce Architectural Invariant #3 and Law 13 for 100GB+ libraries.

#### [MODIFY] [PhotoProcessor.ts](file:///c:/Users/alamo/Desktop/ClickFlash/apps/master/backend/shared/photoProcessor.ts)
- **Copy-First Ingestion**: Refactor `processPhoto` to strictly copy source files to a local `temp/processing` directory *before* any CPU-heavy hashing or image processing occurs.
- **Background Worker Pruning**: Ensure worker threads are correctly terminated and their memory is freed after large batch imports.

---

## Verification Plan

### Automated Tests
- Run `npm run build && npm run package` to verify the self-contained bundle creation.
- Execute the Playwright E2E suite to confirm IPC communication remains valid after stabilization.

### Manual Verification
- **Installer Test**: Install the packaged app into `C:\Program Files` and verify that `userData` pathing allows database creation without Admin rights.
- **Stress Test**: Trigger a 10GB+ import from a slow USB drive to verify "Copy-First" logic doesn't block the main event loop.
