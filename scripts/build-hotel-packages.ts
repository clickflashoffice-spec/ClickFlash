#!/usr/bin/env ts-node
/**
 * ClickFlash Hotel Deployment Package Builder
 *
 * Assembles per-hotel deployment folders with:
 * - Master installer + .env + bootstrap.json
 * - Touch installer + .env
 * - SETUP.txt with hotel-specific instructions
 *
 * Usage:
 *   npx tsx scripts/build-hotel-packages.ts
 *
 * Prerequisites:
 *   - Master installer built: npm --prefix apps/master run package:installer
 *   - Touch installer built:  npm --prefix apps/touch run build:electron
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const ROOT = path.resolve(__dirname, "..");
const DEPLOYMENT_DIR = path.join(ROOT, "deployment");

interface HotelConfig {
  id: string;
  name: string;
  folderName: string;
  location: string;
  deskId: string;
  machineId: string;
  adminEmail: string;
  adminPassword: string;
  adminPin: string;
  kioskPassword: string;
  jwtSecret: string;
  moneytrashPrice: string;
}

const HOTELS: HotelConfig[] = [
  {
    id: "TN001-MO",
    name: "Marhaba Occidental",
    folderName: "TN001-MO-Marhaba-Occidental",
    location: "Sousse, Tunisia",
    deskId: "TN001-MO",
    machineId: "station_mo_001",
    adminEmail: "admin@mo.clickflash.photo",
    adminPassword: "mo_secure_2026",
    adminPin: "314159",
    kioskPassword: "mo_exit_2026",
    jwtSecret:
      "42898c0d9a60e0a55c2f061c0d0d4a7c8e9b0a1c2d3e4f5a6b7c8d9e0f1a2b3c",
    moneytrashPrice: "20.00",
  },
  {
    id: "TN002-MC",
    name: "Marhaba Club",
    folderName: "TN002-MC-Marhaba-Club",
    location: "Sousse, Tunisia",
    deskId: "TN002-MC",
    machineId: "station_mc_001",
    adminEmail: "admin@mc.clickflash.photo",
    adminPassword: "mc_secure_2026",
    adminPin: "271828",
    kioskPassword: "mc_exit_2026",
    jwtSecret:
      "b7d2f8e1c3a5d9f0a2b4c6e8d0f2a4b6c8e0d2f4a6b8c0e2d4f6a8b0c2d4f6a8",
    moneytrashPrice: "20.00",
  },
  {
    id: "TN003-CGP",
    name: "Green Park Palace",
    folderName: "TN003-CGP-Green-Park-Palace",
    location: "Hammamet, Tunisia",
    deskId: "TN003-CGP",
    machineId: "station_cgp_001",
    adminEmail: "admin@cgp.clickflash.photo",
    adminPassword: "cgp_secure_2026",
    adminPin: "161803",
    kioskPassword: "cgp_exit_2026",
    jwtSecret:
      "f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8",
    moneytrashPrice: "25.00",
  },
];

const HUB_URL = "https://management-hub.clickflash-office.workers.dev";
const GALLERY_URL = "https://gallery-backend.clickflash-office.workers.dev";
const CLOUD_EMAIL = "clickflash.office@gmail.com";
const CLOUD_PASSWORD = "DEFAULT_PASSWORD_PLACEHOLDER";
const PROVISIONING_SECRET = "IndustrialProvisioningSecret2026";

function generateMasterEnv(hotel: HotelConfig): string {
  return `# ClickFlash Master Station — ${hotel.name} (${hotel.deskId})
PORT=8090
NODE_ENV=production

# Security
JWT_SECRET=${hotel.jwtSecret}
DEFAULT_ADMIN_NAME=${hotel.deskId.replace(/-/g, "_")}_Admin
DEFAULT_ADMIN_EMAIL=${hotel.adminEmail}
DEFAULT_ADMIN_PASSWORD=${hotel.adminPassword}

# Hub Connection
HUB_URL=${HUB_URL}
CLOUD_API_URL=${HUB_URL}
CLOUD_EMAIL=${CLOUD_EMAIL}
CLOUD_PASSWORD=${CLOUD_PASSWORD}
DESK_ID=${hotel.deskId}
MACHINE_ID=${hotel.machineId}
PROVISIONING_SECRET=${PROVISIONING_SECRET}

# Customer Gallery
GALLERY_URL=${GALLERY_URL}

# MoneyTrash
MONEYTRASH_ENABLED=true
MONEYTRASH_PRICE=${hotel.moneytrashPrice}
MONEYTRASH_RETENTION_DAYS=7

# Database
DB_PATH=./pb_data/master.db

# Cloud Sync
CLOUD_SYNC_ENABLED=true
CLOUD_ARCHIVE_ENABLED=true

# Kiosk
ADMIN_PIN=${hotel.adminPin}
KIOSK_PASSWORD=${hotel.kioskPassword}
`;
}

function generateTouchEnv(hotel: HotelConfig): string {
  const touchJwt = crypto.randomBytes(32).toString("hex");
  return `# ClickFlash Touch Kiosk — ${hotel.name} (${hotel.deskId})
PORT=8091
NODE_ENV=production
JWT_SECRET=${touchJwt}
TOUCH_BACKEND_PORT=8091
FRONTEND_PORT=8001
DATA_DIR=./pb_data_touch
LOG_LEVEL=WARN
ADMIN_PIN=${hotel.adminPin}
KIOSK_PASSWORD=${hotel.kioskPassword}
CORS_ORIGINS=http://localhost:8001,http://localhost:8090,http://127.0.0.1:8001
VITE_API_URL=http://localhost:8091
VITE_WS_URL=ws://localhost:8091
VITE_APP_MODE=production
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_SYNC=true
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=warn
`;
}

function generateBootstrapJson(hotel: HotelConfig): string {
  return JSON.stringify(
    {
      locationName: hotel.name,
      adminEmail: hotel.adminEmail,
      adminPassword: hotel.adminPassword,
      provisioningSecret: PROVISIONING_SECRET,
      hubUrl: HUB_URL,
    },
    null,
    2,
  );
}

function generateSetupTxt(hotel: HotelConfig): string {
  return `ClickFlash Kiosk Setup - ${hotel.name}
${"=".repeat(40 + hotel.name.length)}

MASTER PC:
1. Run ClickFlash-Master-OS-Setup.exe (install as Administrator)
2. After install, copy config\\.env to:
   C:\\Users\\<user>\\AppData\\Local\\clickflash-master\\
3. Copy config\\bootstrap.json to:
   C:\\Users\\<user>\\AppData\\Local\\clickflash-master\\pb_data\\
4. Launch "ClickFlash Master OS" from Start Menu
5. First boot runs Zero-Touch Provisioning - registers with cloud hub automatically

TOUCH KIOSK PC (same LAN as Master):
1. Run ClickFlash-Touch-Kiosk-Setup.exe (install as Administrator)
2. Copy config\\.env to:
   C:\\Users\\<user>\\AppData\\Local\\clickflash-touch\\
3. Launch "ClickFlash Touch" from Start Menu
4. Touch discovers Master on LAN automatically via port 8090

ADMIN UNLOCK:
  Shortcut: Ctrl+Alt+Shift+X -> enter PIN
  PIN: ${hotel.adminPin}
  Exit Password: ${hotel.kioskPassword}

NETWORK REQUIREMENTS:
  Master: port 8090 (backend API + WebSocket)
  Touch:  port 8091 (backend), 8001 (frontend)
  Both PCs must be on the same LAN subnet

CLOUD SYNC:
  Desk ID: ${hotel.deskId}
  Hub: ${HUB_URL}
  Auto-syncs albums, orders, photos to cloud on schedule
`;
}

function findInstaller(dir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const match = files.find((f) => pattern.test(f) && f.endsWith(".exe"));
  return match ? path.join(dir, match) : null;
}

function main() {
  console.log("ClickFlash Hotel Deployment Package Builder\n");

  // Find installers
  const masterReleaseDir = path.join(ROOT, "apps", "master", "release");
  const touchReleaseDir = path.join(ROOT, "apps", "touch", "release");

  const masterInstaller = findInstaller(masterReleaseDir, /ClickFlash.*Setup/i);
  const touchInstaller = findInstaller(touchReleaseDir, /ClickFlash.*Setup/i);

  if (!masterInstaller) {
    console.error(
      `ERROR: Master installer not found in ${masterReleaseDir}`,
    );
    console.error(
      "       Run: npm --prefix apps/master run package:installer",
    );
    process.exit(1);
  }

  if (!touchInstaller) {
    console.error(
      `ERROR: Touch installer not found in ${touchReleaseDir}`,
    );
    console.error("       Run: npm --prefix apps/touch run build:electron");
    process.exit(1);
  }

  console.log(`Master installer: ${path.basename(masterInstaller)}`);
  console.log(`Touch installer:  ${path.basename(touchInstaller)}`);

  // Clean and create deployment directory
  if (fs.existsSync(DEPLOYMENT_DIR)) {
    fs.rmSync(DEPLOYMENT_DIR, { recursive: true });
  }
  fs.mkdirSync(DEPLOYMENT_DIR, { recursive: true });

  for (const hotel of HOTELS) {
    console.log(`\nAssembling: ${hotel.name} (${hotel.deskId})`);

    const hotelDir = path.join(DEPLOYMENT_DIR, hotel.folderName);
    const masterDir = path.join(hotelDir, "master");
    const masterConfigDir = path.join(masterDir, "config");
    const touchDir = path.join(hotelDir, "touch");
    const touchConfigDir = path.join(touchDir, "config");

    // Create directories
    fs.mkdirSync(masterConfigDir, { recursive: true });
    fs.mkdirSync(touchConfigDir, { recursive: true });

    // Copy installers
    fs.copyFileSync(
      masterInstaller,
      path.join(masterDir, path.basename(masterInstaller)),
    );
    fs.copyFileSync(
      touchInstaller,
      path.join(touchDir, path.basename(touchInstaller)),
    );

    // Write master config
    fs.writeFileSync(
      path.join(masterConfigDir, ".env"),
      generateMasterEnv(hotel),
    );
    fs.writeFileSync(
      path.join(masterConfigDir, "bootstrap.json"),
      generateBootstrapJson(hotel),
    );

    // Write touch config
    fs.writeFileSync(
      path.join(touchConfigDir, ".env"),
      generateTouchEnv(hotel),
    );

    // Write SETUP.txt
    fs.writeFileSync(
      path.join(hotelDir, "SETUP.txt"),
      generateSetupTxt(hotel),
    );

    console.log(`  master/  - installer + config/.env + config/bootstrap.json`);
    console.log(`  touch/   - installer + config/.env`);
    console.log(`  SETUP.txt`);
  }

  console.log(`\nDone! ${HOTELS.length} deployment packages ready at:`);
  console.log(`  ${DEPLOYMENT_DIR}`);
}

main();
