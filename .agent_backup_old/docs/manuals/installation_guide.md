# ClickFlash - Technical Installation & Deployment Guide

## Prerequisites

- **Master/Touch Station Hardware**: Windows 10/11 Pro (minimum 16GB RAM, 512GB SSD).
- **Network**: Dedicated local Ethernet bridge between Master and Touch stations.
- **Cloud**: Cloudflare account with D1 and R2 enabled.

## 1. Cloud Infrastructure Setup

### D1 Database (Management Hub)

1. Run `wrangler d1 create management-db`.
2. Update `wrangler.toml` with the new `database_id`.
3. Apply migrations: `wrangler d1 migrations apply management-db --local`.

### R2 Storage (Customer Gallery)

1. Create a bucket named `clickflash-gallery-assets`.
2. Configure CORS to allow access from the Management Hub domain.

## 2. Master App Deployment

### Configuration

1. Navigate to `apps/master/.env`.
2. Set `PORT=8090` (Backend).
3. Set `MANAGEMENT_HUB_URL` to your production URL.
4. Set `DATA_DIR` to a high-capacity drive (e.g., `D:\cf_data`).

### Kiosk Lockdown (Assigned Access)

1. In Windows Settings, search for **Set up a kiosk (Assigned Access)**.
2. Select the **Master App** as the default shell.
3. Enable "Auto-on" and "Single-app mode" to block OS-level shortcuts.

## 3. Touch Kiosk Deployment

### Ethernet Bridge

1. Assign a static IP to the Master Station (e.g., `192.168.1.100`).
2. Configure the Touch App `vite.config.ts` proxy to point to the Master IP on port 8091.

### Face Search Indexing

1. Ensure `sqlite` is available for the local face vector database.
2. Verify hardware acceleration for TensorFlow.js if using a GPU.

## 4. Automated Cloud Deployment

For rapid setup of the entire cloud ecosystem (Hub, Gallery, Website), use the provided PowerShell script:

1. Open PowerShell as Administrator.
2. Run: `.\deploy_ecosystem.ps1`
3. The script will automatically configure D1, R2, build all frontends, and deploy to Cloudflare Pages.

## 5. Troubleshooting

### Error: "Photo Not Found"

- **Cause**: Sync delay or Master Station push failure.
- **Fix**: Check `SyncManager` logs in the Master App and verify network connectivity.

### Error: "Local DB Service Down"

- **Cause**: Backend server on port 8090/8091 crashed.
- **Fix**: Restart the application via the Kiosk manager or check for port conflicts.

### Sync Conflicts

- **Cause**: Simultaneous edits on multiple stations.
- **Fix**: The Hub uses a "Last-Edit-Wins" strategy; verify the `updated_at` timestamp in the Hub DMR (Data Management Room).
