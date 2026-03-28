# ClickFlash — Resort Hardware Deployment Guide

> Version: Production 2026 | Applies to: Marhaba Occidental Sousse, Marhaba Club Sousse, Concorde Green Park Palace

---

## Pre-Deployment Requirements

### Hardware (per site)

| Item               | Spec                                                  | Qty          |
| ------------------ | ----------------------------------------------------- | ------------ |
| Master Station PC  | Windows 10/11 Pro, 16GB RAM, SSD ≥ 500GB, Gigabit LAN | 1            |
| Touch Kiosk PCs    | Windows 10/11 Pro, 8GB RAM, SSD ≥ 256GB, Touchscreen  | 1–4          |
| Network Switch     | Gigabit, unmanaged, ≥ 8 ports                         | 1            |
| USB SD Card Reader | Multi-format (CF/SD/XQD)                              | 1 per Master |

### Network

- All devices on the **same local subnet** (e.g. `192.168.1.x/24`)
- Master Station assigned a **static IP** (e.g. `192.168.1.100`)
- No internet required for core operation (internet only for cloud sync)
- Firewall: open TCP ports `8090` (Master) and `8091` (Touch) on LAN

### Software Prerequisites

- Node.js ≥ 18 LTS
- Git (for updates)
- Windows is in **Assigned Access / Kiosk Mode** configured post-install

---

## Installation Order

> ⚠️ Always install Master Station FIRST. Kiosks cannot pair without a running Master.

### Step 1 — Master Station Setup

```
1. Run: ClickFlash Server Setup.exe (as Administrator)
2. Accept default install path: C:\ClickFlash\Master
3. After install, copy .env.production to C:\ClickFlash\Master\resources\backend\
4. Edit .env.production:
   - Set MASTER_IP=192.168.1.100 (this machine's static IP)
   - Set CLOUD_HUB_URL=https://<site-slug>.clickflash.workers.dev
   - Set CLOUD_HUB_API_KEY=<key from Management Hub>
5. Run: C:\ClickFlash\Master\resources\helper_scripts\setup_firewall.bat (Admin)
6. Launch ClickFlash Server from Start Menu
7. Complete Photographer face-login setup
```

### Step 2 — Touch Kiosk Setup (repeat per kiosk)

```
1. Run: ClickFlash Touch Kiosk Setup.exe (as Administrator)
2. Accept default install path: C:\ClickFlash\Touch
3. After install, copy .env.production to C:\ClickFlash\Touch\resources\backend\touch\
4. Edit .env.production:
   - Set MASTER_URL=http://192.168.1.100:8090
   - Set KIOSK_ID=<unique name, e.g. "kiosk-pool-1">
5. Launch ClickFlash Touch Kiosk from Start Menu
6. Navigate to Master App → Settings → Kiosk Connections → "Pair New Kiosk"
7. Enter the pairing code shown on the kiosk screen
8. Verify kiosk appears as "Connected" in the Kiosk Connections panel
```

---

## First-Run Configuration (Master App)

After installation, complete these steps in Master App Settings:

- [ ] **Photo Settings** → Set `masterImportPath` to the SD card mount point (e.g. `E:\`)
- [ ] **Network Settings** → Set `touchSharedImportFolder` to the kiosk upload destination
- [ ] **Watermark Settings** → Upload resort logo watermark
- [ ] **Session Types** → Configure session type labels (Beach, Pool, Restaurant, etc.)
- [ ] **Products & Pricing** → Set product catalogue and prices
- [ ] **Cloud Settings** → Test cloud connection → "Sync Now"
- [ ] **Photographer Setup** → Enroll all photographer face logins

---

## Kiosk Pairing Verification

After pairing each kiosk:

```
Master App → Settings → Kiosk Connections
✅ Status: Connected (green)
✅ Last Heartbeat: < 30s ago
✅ Signing: HMAC Active
```

Push a test album:

```
Master App → Albums → [any album] → "Send to Kiosk"
→ Select newly paired kiosk
→ Verify photos appear on kiosk within 60 seconds
```

---

## Site-Specific Configuration

### Site 1: Marhaba Occidental Sousse

| Setting         | Value                                               |
| --------------- | --------------------------------------------------- |
| `CLOUD_HUB_URL` | `https://marhaba-occidental.clickflash.workers.dev` |
| Site Code       | `MO-SOUSSE`                                         |
| R2 Bucket       | `clickflash-marhaba-occidental`                     |

### Site 2: Marhaba Club Sousse

| Setting         | Value                                         |
| --------------- | --------------------------------------------- |
| `CLOUD_HUB_URL` | `https://marhaba-club.clickflash.workers.dev` |
| Site Code       | `MC-SOUSSE`                                   |
| R2 Bucket       | `clickflash-marhaba-club`                     |

### Site 3: Concorde Green Park Palace

| Setting         | Value                                         |
| --------------- | --------------------------------------------- |
| `CLOUD_HUB_URL` | `https://concorde-gpp.clickflash.workers.dev` |
| Site Code       | `CGP`                                         |
| R2 Bucket       | `clickflash-concorde-gpp`                     |

---

## Post-Deployment Verification Checklist

- [ ] Master starts without errors (`pb_data/logs/info-*.log` is clean)
- [ ] All kiosks show "Connected" in Kiosk Connections
- [ ] Photo import from SD card works end-to-end (import → process → push to kiosk)
- [ ] Customer can select photos on kiosk and create order
- [ ] Order appears in Master → Orders view within 30s
- [ ] Cloud sync pushes order to Management Hub
- [ ] Error log (`pb_data/logs/errors.jsonl`) is empty

---

## Routine Maintenance

| Task                 | Frequency          | How                                                        |
| -------------------- | ------------------ | ---------------------------------------------------------- |
| DB Backup            | Daily (automated)  | Master App → Settings → Database → Manual Backup           |
| Log Review           | Weekly             | Check `pb_data/logs/errors.jsonl` via `/api/system/errors` |
| Software Update      | As released        | `git pull` + `npm run build` + rebuild installer           |
| Face Login Re-enroll | When staff changes | Master App → Settings → Photographers                      |
| Cloud Sync Status    | Daily              | Management Hub → Sites → [Site] → Last Sync                |

---

## Emergency Procedures

### Kiosk Unresponsive

```
1. Ctrl+Shift+Alt+Esc → Exit kiosk mode (admin shortcut)
2. Check: C:\ClickFlash\Touch\resources\backend\touch\logs\error-*.log
3. Restart: Relaunch ClickFlash Touch Kiosk
```

### Master App Crash

```
1. Check: pb_data/logs/errors.jsonl
2. Check: pb_data/logs/error-<date>.log
3. If DB corruption suspected: Master App → Settings → Database → Restore from Backup
4. Restart: Relaunch ClickFlash Server
```

### Network Failure (Touch Cannot Reach Master)

```
1. Verify Master static IP is reachable: ping 192.168.1.100
2. Verify port 8090 is open: Test-NetConnection 192.168.1.100 -Port 8090
3. Touch Kiosk operates in degraded mode: orders are queued locally and synced on reconnect
```
