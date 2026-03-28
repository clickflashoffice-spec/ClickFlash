# Hotel-Specific Master Portal Installer Guide

## Overview

This guide explains how to build pre-configured Master Portal installers for each hotel location. Each installer is a "one-click" solution that embeds all hotel-specific settings.

## Hotel Configurations

| Hotel                                 | Desk ID Prefix | App Name       | App ID                      | Cloud Config                   |
| ------------------------------------- | -------------- | -------------- | --------------------------- | ------------------------------ |
| **Concorde Green Park Palace Sousse** | `CGP_`         | ClickFlash CGP | `com.clickflash.master.cgp` | D1: `cgp-db`, R2: `cgp-assets` |
| **Marhaba Occidental Sousse**         | `MAO_`         | ClickFlash MAO | `com.clickflash.master.mao` | D1: `mao-db`, R2: `mao-assets` |
| **Marhaba Club Sousse**               | `MAC_`         | ClickFlash MAC | `com.clickflash.master.mac` | D1: `mac-db`, R2: `mac-assets` |

---

## Pre-Configuration Requirements

Before building installers, ensure:

1. **Cloudflare D1 Databases Created:**

   ```bash
   wrangler d1 create cgp-db
   wrangler d1 create mao-db
   wrangler d1 create mac-db
   ```

2. **Cloudflare R2 Buckets Created:**

   ```bash
   wrangler r2 bucket create cgp-gallery-assets
   wrangler r2 bucket create mao-gallery-assets
   wrangler r2 bucket create mac-gallery-assets
   ```

3. **Environment Variables Ready:**
   - `CLOUD_API_URL` - Management Hub endpoint
   - `CLOUD_EMAIL` - Hotel's cloud account email
   - `CLOUD_PASSWORD` - Hotel's cloud account password
   - `JWT_SECRET` - Cloud sync JWT secret

---

## Build Process

### Option A: Using the Build Script (Recommended)

```bash
cd apps/master

# Build all hotel installers
npm run build:hotels

# Build specific hotel
npm run build:hotel -- --hotel=cgp
npm run build:hotel -- --hotel=mao
npm run build:hotel -- --hotel=mac
```

### Option B: Manual Build

```bash
cd apps/master

# Concorde Green Park Palace
HOTEL=cgp HOTEL_NAME="Concorde Green Park Palace Sousse" \
DESK_ID_PREFIX=CGP_ \
npm run package:hotel

# Marhaba Occidental
HOTEL=mao HOTEL_NAME="Marhaba Occidental Sousse" \
DESK_ID_PREFIX=MAO_ \
npm run package:hotel

# Marhaba Club
HOTEL=mac HOTEL_NAME="Marhaba Club Sousse" \
DESK_ID_PREFIX=MAC_ \
npm run package:hotel
```

---

## What Gets Embedded

Each hotel installer includes:

### 1. Hotel Identity

- **Hotel Name**: Displayed in app header and dashboard
- **Desk ID Prefix**: Used for kiosk identification (e.g., `CGP_01`, `MAO_01`)
- **Unique Machine ID**: Generated from hardware fingerprint

### 2. Cloud Configuration

- **Cloudflare D1 Database**: Hotel-specific database
- **Cloudflare R2 Bucket**: Hotel-specific asset storage
- **Management Hub URL**: `https://management.feethub.com`
- **Gallery URL**: `https://gallery.feethub.com`

### 3. Local Network Settings

- **Default Kiosk Port**: `8091`
- **Discovery Timeout**: `30 seconds`
- **Pairing Secret**: Pre-configured for initial setup

### 4. Branding

- **App Name**: Hotel-specific application name
- **App Icon**: Standard icon (can be customized per hotel)
- **Copyright**: "© 2026 [Hotel Name]"

---

## Output Files

Build output location: `apps/master/release_v2/`

```
release_v2/
├── ClickFlash-CGP-4.2.0-setup.exe    # Concorde Green Park
├── ClickFlash-MAO-4.2.0-setup.exe    # Marhaba Occidental
└── ClickFlash-MAC-4.2.0-setup.exe   # Marhaba Club
```

---

## Installation Experience

For the hotel technician, installation is a one-click process:

1. **Download** the correct installer for their hotel
2. **Run** the `.exe` installer
3. **Done** - App starts immediately with all settings pre-configured

The app will:

- Connect to Cloudflare automatically
- Appear in the Fleet Monitor under the correct hotel
- Be ready to pair with Touch Kiosks

---

## Verification Checklist

After installation, verify:

- [ ] App launches without errors
- [ ] Hotel name displays correctly in header
- [ ] Cloud connection shows "Online" status
- [ ] Desk ID uses correct prefix (e.g., `CGP_01`)
- [ ] Fleet Monitor shows the new station
- [ ] Test order creation syncs to cloud
- [ ] Kiosk pairing works on local network

---

## Troubleshooting

### "Cloud Connection Failed"

- Verify `CLOUD_EMAIL` and `CLOUD_PASSWORD` embedded correctly
- Check firewall allows outbound HTTPS

### "Desk ID Already Exists"

- The desk ID is registered to another machine
- Contact support to reset hardware lock

### "D1 Database Not Found"

- Verify D1 database was created in Cloudflare
- Check `WRANGLER_ACCOUNT_ID` environment variable

---

## Customization Options

### Per-Hotel App Icon

Replace icon before building:

```bash
cp ../hotel-icons/cgp-icon.ico apps/master/build/icon.ico
npm run package:hotel -- --hotel=cgp
```

### Per-Hotel Theme Colors

Edit `src/constants/hotelThemes.ts` before building.

### Per-Hotel Default Settings

Modify `configs/hotel-configs/{hotel}.json` before building.

---

## Script Reference

| Script                         | Purpose                  |
| ------------------------------ | ------------------------ |
| `build-hotel-installers.js`    | Main build orchestrator  |
| `hotel-configs/template.json`  | Configuration template   |
| `configs/hotel-configs/*.json` | Per-hotel configurations |

---

**Document Version:** 1.0  
**Last Updated:** March 22, 2026
