# TOUCH APP - Installation & Setup Guide

Follow these steps to set up the Touch Kiosk on this PC.

## 1. Prerequisites

- **Node.js**: Ensure Node.js (v18+) is installed.
- **Hardware**: This app is optimized for touch-screen interfaces.

## 2. Installation Steps

Run the following scripts in order:

1. **`1_INSTALL.bat`**: Installs the required libraries.
2. **`2_BUILD.bat`**: Compiles the frontend and backend for production.
3. **`3_SETUP_PC.bat`**: Configures the Windows Firewall to allow port **8091** and discovery.

## 3. Running the App

- Run **`4_START.bat`** to start the kiosk.
- The interface will be available at: `http://localhost:8091`

## 4. Connecting to Master

- On the first run, open Settings (Ctrl+Shift+S).
- The app should automatically discover the Master PC if both are on the same Ethernet cable.
- Ensure the **Orders Hot Folder** is set to a local path where you want the fulfillment bundles to be saved.

---
*For offline networking tips, see `OFFLINE_DEPLOYMENT.md` in this folder.*
