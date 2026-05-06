# Deep Dive Audit Plan: Touch App (React vs. Python)

This document outlines the strategy for side-by-side verification of the **Touch App React** (Original) and **Touch App Python** (New Native) implementations to ensure 100% feature parity and UX consistency.

## 1. Executive Summary

* **Objective**: Verify that the Python/Qt6 Touch App delivers an equivalent or superior experience to the React/Electron version.
* **Key Driver**: The Python version aims to reduce resource overhead (Electron RAM usage) and provide better hardware integration (RFID/GPIO) while maintaining the premium "ClickFlash" aesthetic.
* **Status**: Python version is functionally complete (Phase 28+). Verification is needed for edge cases and UI polish.

## 2. Side-by-Side Comparison Matrix

### A. Core Architecture

| Component | React / Electron | Python / Qt6 | Audit Check |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js + Chromium (High RAM) | Python 3.11 + Qt6 (Low RAM) | ✅ Validated |
| **UI Framework** | HTML5/CSS3/Tailwind | PyQt6 Widgets + Stylesheets | ⚠️ check responsiveness |
| **Data Fetching** | React Query / Fetch API | SQLAlchemy Async / Local DB | ✅ Validated |
| **State Mgmt** | Redux / Context API | Python Class Attributes / Signals | ✅ Validated |

### B. User Interface (UI)

| Screen | React Implementation | Python Implementation | Action Item |
| :--- | :--- | :--- | :--- |
| **Attract Screen** | 4-Card Hero Layout, Video Bg? | 4-Card Hero Layout, CSS Animation | **Verify Animations** |
| **Network Banner** | Toast / Top Bar | **Top Bar (Orange)** | ✅ Parity Achieved |
| **Room Entry** | Full Screen Input | **Modal Dialog (New)** | **Approve UX Change** |
| **Gallery** | Masonry Grid + Cart Sidebar | Scroll Area + Cart Sidebar | **Check Grid Flow** |
| **Settings** | `/settings` Route (Full Page) | `SettingsDialog` (Modal) | ✅ Parity Logic |

### C. Feature Logic

| Feature | React Logic | Python Logic | Gap Analysis |
| :--- | :--- | :--- | :--- |
| **Search by Room**| API Call to Master | Local DB Query (Synced) | Equal |
| **Browse All** | Pagination / Infinite Scroll | `limit=500` (Simulated) | **Check Limit** |
| **Photo Detail** | Full Screen Preview / Zoom | Direct Add-To-Cart | **Major UX Difference** |
| **Face Search** | `face-api.js` (Browser) | `face_recognition` (dlib) | **Python is more accurate** |
| **RFID / NFC** | WebUSB / Keyboard Emulation | PySerial / HID Event | **Python is more robust** |
| **Order Sync** | POST to Master API | File System Push (Law 8) | **Python is Offline-Native** |

## 3. Detailed Audit Steps

### Step 1: UI Polish Verification

* [ ] **Attract Screen**: Does the "Pulse" animation match the React CSS keyframes?

* [ ] **Icons**: Are we using the same SVG assets or approximations?
* [ ] **Typography**: Is `Segoe UI` rendering identically to the browser font stack?

### Step 2: Critical Logic Stress Test

* [ ] **Offline Mode**: Disconnect network. React might blank out; Python should show local cache.

* [ ] **Large Gallery**: Load 5,000 photos. Compare Electron RAM vs Python RAM.
* [ ] **Rapid Searching**: Spam the "Find Room" button. Check for UI freeze.

### Step 3: Configuration "Deep Dive"

* [x] **Settings Modal**: Verify all files from React exist in Python (Master URL, Kiosk ID). **(Implemented in Step 958)**

* [x] **Persistence**: Does Python save settings to `.env` or `config.json`? **(Implemented: kiosk_config.json)**
* [x] **Admin Tools**: "Reload" and "Exit" buttons must function 100%. **(Implemented)**

## 4. Next Actions (Immediate)

1. **Run Python App**: Validate the new `RoomDialog` and `SettingsDialog`.
2. **Visual Compare**: Open React App on Port 8091 (if avail) and Python on 8093. Screenshot both.
3. **Performance**: Check Task Manager for memory footprint.

## 5. Deployment Recommendation

If Python version passes **Step 2 (Offline Mode)**, it should become the **primary** deployment target for Windows Kiosks due to stability. React version remains fallback for Web/iPad clients.
