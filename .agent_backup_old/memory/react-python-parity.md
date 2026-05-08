# React vs Python Master App Parity Report

**Date**: 2026-01-14
**Scope**: Operational Laws & Core Features

## 1. Operational Laws Verification

### Law 09: Order Watcher (Master App Watch)

- **Goal**: Monitor kiosk folders for incoming orders.
- **Python**: Implemented in `backend/services/order_watcher.py`.
  - Logic: Scans `ordersFolderPath` from DB/Settings. Imports JSON.
  - Status: **VERIFIED PARITY** ✅
- **React**: Implemented in `backend/services/orderWatcher.ts`.
  - Logic: Similar polling mechanism.
  - Status: **VERIFIED PARITY** ✅

### Law 07: Master Push (Send to Kiosk)

- **Goal**: Push processed assets/albums to Touch App.
- **React**: Explicit "Send to Kiosk" feature in `collections.ts`. Verified.
- **Python**: Implemented in `backend/routes/albums.py` (`sync_album_to_kiosk`).
  - Logic: Checks settings or defaults to `d:/touch app python/local/uploads` (path needs update to `e:`).
  - Status: **LOGIC EXISTS** (Requires runtime verification matches new `e:\` paths) ⚠️

## 2. Architecture Comparison

### Master App

- **React**: Modern stack (Node/Vite/Tailwind). verified.
- **Python**: Legacy/Robust stack (FastAPI/PyQt6). 17k+ files. Needs venv.

### Touch App

- **React**: Verified.
- **Python**: Exists (`e:\ClickFlash\touch-app\python`). Layout suggests PyQt6.

## 3. Action Items

- Update Python hardcoded paths from `d:` to `e:` if found.
- Verify Python Kiosk Sync path resolution.
