# ClickFlash Production Installation Guide

This guide covers how to deploy the ClickFlash ecosystem (Master Portal and Touch Kiosks) into a new hotel environment and connect it to the centralized Cloudflare Management Hub.

## 1. Network & Infrastructure Prep
Before installing, ensure the hotel network provides:
1. **Static IPs or DHCP Reservations:**
   - Assign a static IP for the **Master PC** (e.g., `192.168.1.50`).
   - Touch tablets can use standard DHCP, but ensure they are on the same subnet as the Master PC without client isolation enabled.
2. **Internet Access:** Ensure outbound connections on ports `80` and `443` are allowed for sync to Cloudflare and AWS.

## 2. Master Portal Setup
The Master Portal acts as the central brain of the hotel. It runs the SQLite database, coordinates photos, and syncs to the cloud.

1. **Install Master:**
   - Copy `ClickFlash - Master Portal Setup 4.2.0.exe` to the Master PC.
   - Run the executable. It uses `oneClick: true`, meaning it installs instantly and silently into the User's `AppData\Local\Programs` directory.
2. **Post-Install Automation (Automatic):**
   - The installer automatically triggers `install.ps1` which:
     - Opens Windows Firewall port `8090`.
     - Configures the Windows Power Plan to **High Performance** and disables sleep mode.
     - Adds a registry key so Master launches automatically on boot.
3. **Configuration:**
   - Launch Master. It will default to Local Mode (`http://127.0.0.1:8090`).
   - Go to **Settings > System Configuration**.
   - Input your Cloudflare Management Hub URL (`https://management-hub.clickflash-office.workers.dev`).
   - Set the connection mode to **Offline-First**. This activates the local `CloudSyncService` and `PhotosPipeline` to push batches to the cloud when internet is available.

## 3. Touch Kiosk Setup
The Touch Kiosks connect to the Master over the local network to fetch configuration and upload photos.

1. **Install Touch:**
   - Copy `ClickFlash - Touch Kiosk Setup 4.2.0.exe` to the kiosk tablet.
   - Run the executable. Like Master, it installs automatically and opens the firewall (port `8091`).
2. **Connect to Master:**
   - Launch the Touch app.
   - On the connection screen, enter the Master's IP Address (e.g., `http://192.168.1.50:8090`).
   - The Touch app will test the connection and download the active session types and photo frames directly from the Master.

## 4. Verification & Circulation
Once the apps are running:
1. Take a test photo on the Touch tablet.
2. Verify that it appears instantly on the Master Portal's incoming queue (via the optimized single-connection SSE multiplexer).
3. If connected to the internet, watch the Master Portal logs/status indicator to verify that the photo was batched and synced to the Cloudflare Management Hub.

## 5. Security & Isolation
- **No Direct Cloud Calls from Touch:** The Touch kiosks only communicate with the Master PC. They do not need internet access, ensuring a highly isolated and secure local network.
- **Resiliency:** If the hotel loses internet, operations continue 100% normally. The Master's SQLite DB holds all transactions, and the `PhotosPipeline` will automatically resume cloud uploads when connectivity returns.
