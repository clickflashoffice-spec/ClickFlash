# Antigravity OS: Offline Multi-PC Deployment Guide

This guide ensures Rule 03 (Offline Multi-Client Mesh) is correctly configured for your local Ethernet setup.

## 1. Network Configuration

### Ethernet Setup (Offline)

1. Connect both PCs to a dedicated Network Switch or directly to each other via an Ethernet cable.
2. **PC A (Master Server):** Set a static IP (e.g., `192.168.1.10`)
3. **PC B (Touch Client):** Set a static IP in the same range (e.g., `192.168.1.11`)
   - *Subnet Mask for both: 255.255.255.0*

### Firewall Configuration

On BOTH PCs, ensure the following ports are allowed in Windows Firewall (Inbound Rules):

- **Port 8090 (Master):** TCP/UDP
- **Port 8091 (Touch):** TCP/UDP
- **Port 5353 (mDNS/Bonjour):** UDP (Required for Auto-Discovery)

## 2. Master App Setup (PC A)

1. Copy the `master/` folder to PC A.
2. Run `start.bat` to build and start the server.
3. Access the dashboard at `http://192.168.1.10:8090`.
4. **Shared Folder:** Ensure the `pb_data/uploads` folder is "Shared" on the network if you plan to access photos across the cable.

## 3. Touch App Setup (PC B)

1. Copy the `touch/` folder to PC B.
2. Run `start.bat`.
3. Open the **Kiosk Settings Modal** (Ctrl+Shift+S in Touch UI).
4. **Master Connection:**
   - The app should automatically find the Master IP via mDNS.
   - If offline/firewall blocks mDNS, enter manually: `http://192.168.1.10:8090`
5. **Orders Hot Folder:**
   - Set this to a path on PC B.
   - The Master App will pull from this folder if it can access PC B's file system (via network sharing).

## 4. Verification Checklist

- [ ] **Ping Check:** From PC B, run `ping 192.168.1.10` in CMD to ensure the PCs see each other.
- [ ] **Discovery:** Check the Touch App "Connection Settings" to see if "StarMaster" appears in the discovery list.
- [ ] **Sync:** Create an order on Touch and verify it appears on the Master dashboard (ensure Master is monitoring the correct Hot Folder path).

## 5. Troubleshooting Offline Sync

- **"Cannot Connect":** Double-check that the Master port (8090) is open.
- **"Photo Copy Failed":** Check that the network path to the Master's upload directory is accessible from the Touch PC if you use absolute network paths (UNC).
- **mDNS Service:** Ensure the "Bonjour Service" is running (installed by default with Star Master).
