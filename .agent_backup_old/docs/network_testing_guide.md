# Network Testing Guide: Local WiFi Simulation

This guide explains how to test the **Management App** and **Customer Gallery** on a separate PC within the same Local WiFi network to verify connectivity and test upload/download speeds.

---

## 📋 Prerequisites

1. **Host PC (Server):** The computer running the Apps.
2. **Client PC (Tester):** A second laptop/phone on the **SAME** WiFi network.
3. **Network:** Private WiFi (Home/Office). *Public/Hotel WiFi often blocks device-to-device communication (AP Isolation).*

---

## 🚀 Step 1: Find Host IP Address

On the **Host PC**:

1. Open Terminal (`cmd`).
2. Run `ipconfig`.
3. Look for **IPv4 Address** (e.g., `192.168.1.15`).

---

## 🔓 Step 2: Configure Firewall (Windows)

By default, Windows blocks incoming connections to Node.js.

1. **Quick Test (Disable Firewall):** *Only for 5 minutes during testing.*
    * Settings -> Update & Security -> Windows Security -> Firewall & Network Protection -> Private Network -> Toggle **Off**.
    * *(Remember to turn ON after testing)*.
2. **Proper Setup (Allow Port):**
    * Open PowerShell as Admin.
    * Run:

    ```powershell
    New-NetFirewallRule -DisplayName "ClickFlash Gallery" -Direction Inbound -LocalPort 8093 -Protocol TCP -Action Allow
    New-NetFirewallRule -DisplayName "ClickFlash Management" -Direction Inbound -LocalPort 8092 -Protocol TCP -Action Allow
    ```

---

## 🔗 Step 3: Access from Client PC

On the **Client PC**:

1. Open Chrome/Edge.
2. **Customer Gallery:** Go to `http://<HOST_IP>:8093` (e.g., `http://192.168.1.15:8093`).
3. **Management App:** Go to `http://<HOST_IP>:8092` (e.g., `http://192.168.1.15:8092`).

> **Note:** If the site loads but API calls fail, ensure the Frontend Config (`vite.config.ts` or built `.env`) points to the relative path or the IP, not `localhost`.

---

## 🏎️ Step 4: Speed Test (Upload/Download)

1. **Upload Test (Master -> Gallery):**
    * On Host PC: Run Master App.
    * Ensure Master App `.env` points to `CLOUD_API_URL=http://<HOST_IP>:8093` (or localhost if Master is on Host).
    * Trigger a sync.
    * *Monitor:* Task Manager (Performance > WiFi) on Host PC to see Mbps throughput.
2. **Download Test (Client -> Gallery):**
    * On Client PC: Log into Customer Gallery.
    * Open DevTools (F12) -> **Network** tab.
    * Download a full-size image.
    * Check the "Time" and "Size" to calculate speed.

---

## ⚠️ Troubleshooting

* **"Site can't be reached":**
  * Check Firewall (Step 2).
  * Ensure Host and Client are on same WiFi (check first 3 IP segments: `192.168.1.x`).
* **Infinite Loading:**
  * Backend might be bound to `127.0.0.1` instead of `0.0.0.0`.
  * *Fix:* Check `server.js` `server.listen(PORT, '0.0.0.0', ...)` (We firmly set this earlier).
