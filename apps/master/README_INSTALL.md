# MASTER APP - Installation & Setup Guide

Follow these steps to set up the Master Portal on this PC.

## 1. Prerequisites

- **Node.js**: Ensure Node.js (v18+) is installed.
- **Ethernet**: Connect this PC to your local network switch.

## 2. Installation Steps

Run the following scripts in order:

1. **`1_INSTALL.bat`**: Installs the required libraries.
2. **`2_BUILD.bat`**: Compiles the frontend and backend for production.
3. **`3_SETUP_PC.bat`**: Configures the Windows Firewall to allow port **8090**.
4. **`4_START.bat`**: Launches the production server.
5. **`5_ENABLE_KIOSK.bat`**: (Optional) Sets the app as the primary Windows Shell (Kiosk Mode).
6. **`6_DISABLE_KIOSK.bat`**: (Maintenance) Restores the standard Windows Desktop/Explorer.
- The dashboard will be available at: `http://localhost:8090`
- Other PCs on the network can access it via: `http://[THIS_PC_IP]:8090`

## 4. Configuration

- Ensure your **Master Import Path** is set in the dashboard settings to point to your physical photo storage.
- If using as a server for Touch PCs, ensure this PC has a **Static IP** configured (see `OFFLINE_DEPLOYMENT.md`).

---
*For advanced network settings, see `WINDOWS_FIREWALL_SETUP.md` and `OFFLINE_DEPLOYMENT.md` in this folder.*
