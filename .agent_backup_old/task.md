# Task: Master App Production Hardening

- [x] **Phase 1: Build Pipeline & Bundler Hardening**
    - [x] Update `electron-builder.yml` for correct dependency packaging
    - [x] Whitelist essential native modules in builder config
    - [x] Update `package.json` build scripts
- [x] **Phase 2: Main Process & IPC Stabilization**
    - [x] Migrate `electron-main.js` to use `app.getPath('userData')`
    - [x] Implement sequential boot and health-check logic
    - [x] Refactor `preload.js` for safe IPC cleanup
- [x] **Phase 3: Resource & Memory Management**
    - [x] Implement "Copy-First" strategy in `PhotoProcessor.ts`
    - [x] Update worker management to prevent leaks
- [x] **Verification**
    - [x] Validate build output folder structure
    - [x] Test persistence in read-only installation directory
    - [x] Verify non-blocking ingestion of large photo sets
