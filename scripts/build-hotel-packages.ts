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
 *   - Master installer built: pnpm --filter clickflash-master run package:installer
 *   - Touch installer built:  pnpm --filter clickflash-touch run build:electron
 *
 * Security notice:
 *   All passwords, PINs, and secrets are read from environment variables.
 *   If a secret is not provided, a cryptographically random value is generated
 *   and printed to stdout. Record these values securely; they are not persisted
 *   by this script.
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

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

function generateSecret(lengthBytes = 32): string {
  return crypto.randomBytes(lengthBytes).toString("hex");
}

function getHotelSecret(hotelId: string, field: string): string {
  const envKey = `HOTEL_${hotelId.replace(/-/g, "_")}_${field.toUpperCase()}`;
  const value = process.env[envKey];
  if (value) return value;

  const generated = generateSecret();
  console.warn(
    `[build-hotel-packages] ${envKey} not set. Generated random ${field}: ${generated}`,
  );
  console.warn(
    `[build-hotel-packages] Store this value securely and set ${envKey} on subsequent runs to keep credentials stable.`,
  );
  return generated;
}

const HOTEL_TEMPLATES = [
  {
    id: "TN001-MO",
    name: "Marhaba Occidental",
    folderName: "TN001-MO-Marhaba-Occidental",
    location: "Sousse, Tunisia",
    deskId: "TN001-MO",
    machineId: "station_mo_001",
    adminEmail: "admin@mo.clickflash.photo",
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
    moneytrashPrice: "25.00",
  },
];

const HOTELS: HotelConfig[] = HOTEL_TEMPLATES.map((template) => ({
  ...template,
  adminPassword: getHotelSecret(template.id, "admin_password"),
  adminPin: getHotelSecret(template.id, "admin_pin"),
  kioskPassword: getHotelSecret(template.id, "kiosk_password"),
  jwtSecret: getHotelSecret(template.id, "jwt_secret"),
}));

const HUB_URL = getEnv(
  "CLICKFLASH_HUB_URL",
  "https://management-hub.clickflash-office.workers.dev",
);
const GALLERY_URL = getEnv(
  "CLICKFLASH_GALLERY_URL",
  "https://gallery-backend.clickflash-office.workers.dev",
);
const CLOUD_EMAIL = getEnv("CLICKFLASH_CLOUD_EMAIL");
const CLOUD_PASSWORD = getEnv("CLICKFLASH_CLOUD_PASSWORD");
const PROVISIONING_SECRET = getEnv("CLICKFLASH_PROVISIONING_SECRET");

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

function generateCredentialsTxt(hotel: HotelConfig): string {
  return `CLICKFLASH CREDENTIALS - ${hotel.name}
${"=".repeat(40 + hotel.name.length)}
CONFIDENTIAL - Keep this document secure. Do not share publicly.
Generated: ${new Date().toISOString().split("T")[0]}

HOTEL IDENTITY
  Hotel:        ${hotel.name}
  Desk ID:      ${hotel.deskId}
  Machine ID:   ${hotel.machineId}
  Location:     ${hotel.location}

MASTER ADMIN LOGIN
  Email:        ${hotel.adminEmail}
  Password:     ${hotel.adminPassword}
  Admin PIN:    ${hotel.adminPin}

KIOSK EXIT
  Password:     ${hotel.kioskPassword}
  Shortcut:     Ctrl+Alt+Shift+X then enter PIN

CLOUD MANAGEMENT HUB
  URL:          ${HUB_URL}
  Email:        ${CLOUD_EMAIL}
  Password:     ${CLOUD_PASSWORD}

CUSTOMER GALLERY
  URL:          ${GALLERY_URL}

MONEYTRASH PRICING
  Price/photo:  ${hotel.moneytrashPrice} EUR
  Retention:    7 days

PROVISIONING
  Secret:       ${PROVISIONING_SECRET}
  JWT Secret:   ${hotel.jwtSecret}

NETWORK PORTS
  Master API:   8090 (HTTP + WebSocket)
  Touch Backend: 8091
  Touch Frontend: 8001
`;
}

function generateInstallManualTxt(hotel: HotelConfig): string {
  return `CLICKFLASH INSTALLATION & CONFIGURATION MANUAL
${hotel.name} (${hotel.deskId})
${"=".repeat(60)}

TABLE OF CONTENTS
  1. Prerequisites
  2. Master PC Installation
  3. Touch Kiosk PC Installation
  4. Network Configuration
  5. First Boot & Provisioning
  6. Cloud Sync Verification
  7. Troubleshooting
  8. Maintenance

${"=".repeat(60)}
1. PREREQUISITES
${"=".repeat(60)}

Hardware Requirements:
  Master PC:
    - Windows 10/11 (64-bit)
    - 8 GB RAM minimum
    - 256 GB SSD minimum
    - USB ports for camera/card reader
    - Ethernet or stable Wi-Fi

  Touch Kiosk PC:
    - Windows 10/11 (64-bit)
    - 4 GB RAM minimum
    - 128 GB SSD minimum
    - Touchscreen display (1080p recommended)
    - Ethernet or stable Wi-Fi (same LAN as Master)

Network Requirements:
    - Both PCs on the same LAN subnet
    - Internet access for cloud sync
    - Firewall: allow ports 8090, 8091, 8001 on local network

${"=".repeat(60)}
2. MASTER PC INSTALLATION
${"=".repeat(60)}

Step 1: Install the application
    - Right-click "ClickFlash-Master-OS-Setup.exe"
    - Select "Run as Administrator"
    - Follow the NSIS installer wizard
    - Install to default location: C:\\Program Files\\ClickFlash Master OS\\
    - Do NOT launch the application yet

Step 2: Deploy configuration files
    - Open File Explorer
    - Navigate to: C:\\Users\\<your-username>\\AppData\\Local\\clickflash-master\\
      (If the folder does not exist, create it)
    - Copy "config\\.env" from this package into that folder
    - Create subfolder "pb_data" if it does not exist
    - Copy "config\\bootstrap.json" into the pb_data subfolder

    Final structure:
      C:\\Users\\<user>\\AppData\\Local\\clickflash-master\\
        .env
        pb_data\\
          bootstrap.json

Step 3: Windows Firewall
    - Open Windows Firewall > Advanced Settings
    - Add Inbound Rule: Allow TCP port 8090 (for Touch to connect)
    - Name it: "ClickFlash Master API"

Step 4: Disable Windows Updates auto-restart
    - Open Group Policy (gpedit.msc)
    - Computer Configuration > Administrative Templates > Windows Update
    - Set "No auto-restart with logged on users" to Enabled
    - This prevents kiosk interruptions

Step 5: Auto-start (optional)
    - Create shortcut to "ClickFlash Master OS" in:
      C:\\Users\\<user>\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\

${"=".repeat(60)}
3. TOUCH KIOSK PC INSTALLATION
${"=".repeat(60)}

Step 1: Install the application
    - Right-click "ClickFlash-Touch-Kiosk-Setup.exe"
    - Select "Run as Administrator"
    - Follow the installer wizard
    - Install to default location

Step 2: Deploy configuration
    - Navigate to: C:\\Users\\<your-username>\\AppData\\Local\\clickflash-touch\\
      (Create if not exists)
    - Copy "config\\.env" from the touch folder into that directory

Step 3: Windows Firewall
    - Add Inbound Rule: Allow TCP ports 8091 and 8001
    - Name it: "ClickFlash Touch Kiosk"

Step 4: Kiosk Mode Setup
    - Set Windows to auto-login (netplwiz > uncheck "Users must enter...")
    - Place ClickFlash Touch shortcut in Startup folder
    - Disable Windows notifications: Settings > System > Notifications > Off
    - Disable screen timeout: Settings > System > Power > Screen: Never
    - Hide taskbar: Right-click taskbar > Taskbar settings > Auto-hide

${"=".repeat(60)}
4. NETWORK CONFIGURATION
${"=".repeat(60)}

Both PCs must be on the same local network:
    - Use wired Ethernet for best reliability
    - Master IP should be static (recommended)
    - Touch auto-discovers Master via port 8090 on local network

To set Master static IP:
    1. Open Network & Internet Settings > Ethernet > IP assignment > Edit
    2. Set to Manual, enable IPv4
    3. IP: 192.168.X.10 (replace X with your subnet)
    4. Subnet: 255.255.255.0
    5. Gateway: your router IP
    6. DNS: 8.8.8.8, 8.8.4.4

Verify connectivity:
    From Touch PC, open cmd:
    > ping 192.168.X.10
    > curl http://192.168.X.10:8090/api/health

${"=".repeat(60)}
5. FIRST BOOT & PROVISIONING
${"=".repeat(60)}

Master First Boot:
    1. Launch "ClickFlash Master OS" from Start Menu
    2. Application reads .env and bootstrap.json
    3. Zero-Touch Provisioning (ZTP) runs automatically:
       - Creates local database
       - Registers with cloud hub (${HUB_URL})
       - Downloads any existing albums/settings from cloud
    4. Admin login screen appears
    5. Login with:
       Email:    ${hotel.adminEmail}
       Password: ${hotel.adminPassword}

Touch First Boot:
    1. Ensure Master is running and accessible on the network
    2. Launch "ClickFlash Touch" from Start Menu
    3. Touch discovers Master automatically via LAN
    4. Welcome screen appears - kiosk is ready for customers

${"=".repeat(60)}
6. CLOUD SYNC VERIFICATION
${"=".repeat(60)}

After first boot, verify cloud connectivity:

    1. On Master, go to Settings > Cloud Sync
    2. Status should show "Connected" with green indicator
    3. Desk ID: ${hotel.deskId}
    4. Last sync timestamp should be recent

    To verify from cloud side:
    - Open ${HUB_URL} in a browser
    - Login with: ${CLOUD_EMAIL} / ${CLOUD_PASSWORD}
    - Check Desks list - ${hotel.name} should appear with "Online" status

${"=".repeat(60)}
7. TROUBLESHOOTING
${"=".repeat(60)}

Master won't start:
    - Check .env file exists in AppData\\Local\\clickflash-master\\
    - Run as Administrator
    - Check Windows Event Viewer for errors
    - Verify port 8090 is not used: netstat -an | findstr 8090

Touch can't find Master:
    - Verify Master is running (http://master-ip:8090/api/health)
    - Check both PCs are on the same subnet
    - Disable Windows Firewall temporarily to test
    - Check Touch .env has correct ports

Cloud sync not working:
    - Verify internet connection on Master
    - Check CLOUD_EMAIL and CLOUD_PASSWORD in .env
    - Check ${HUB_URL}/api/health is reachable
    - Look at Master logs: AppData\\Local\\clickflash-master\\logs\\

Admin locked out:
    - Use Ctrl+Alt+Shift+X to open admin unlock
    - Enter PIN: ${hotel.adminPin}
    - If PIN doesn't work, check .env ADMIN_PIN value

Kiosk exit:
    - Press Ctrl+Alt+Shift+X
    - Enter exit password: ${hotel.kioskPassword}

${"=".repeat(60)}
8. MAINTENANCE
${"=".repeat(60)}

Daily:
    - Verify cloud sync status in Master settings
    - Check disk space (photos can accumulate)

Weekly:
    - Review MoneyTrash: expired photos auto-delete after 7 days
    - Check for Windows updates (apply manually during off-hours)

Monthly:
    - Backup pb_data folder from Master:
      C:\\Users\\<user>\\AppData\\Local\\clickflash-master\\pb_data\\
    - Review cloud dashboard for any sync errors
    - Clean touchscreen physically

Updates:
    - Application updates are delivered via auto-updater
    - Master and Touch check for updates on launch
    - Updates download and install automatically on next restart
`;
}

function generateUserManualTxt(hotel: HotelConfig): string {
  return `CLICKFLASH USER MANUAL
${hotel.name}
${"=".repeat(60)}

Welcome to ClickFlash - the hotel photo kiosk system.
This manual explains daily operation for hotel staff.

${"=".repeat(60)}
DAILY OPERATIONS
${"=".repeat(60)}

STARTING THE SYSTEM
    1. Power on the Master PC first
    2. ClickFlash Master OS launches automatically (if auto-start configured)
    3. Wait for "System Ready" status
    4. Power on the Touch Kiosk PC
    5. Touch screen shows Welcome screen - ready for guests

SHUTTING DOWN
    1. On Touch kiosk: Ctrl+Alt+Shift+X > enter PIN ${hotel.adminPin}
    2. Click "Exit Kiosk" > enter password: ${hotel.kioskPassword}
    3. Close Touch application, then shut down Touch PC
    4. On Master: close the application, then shut down Master PC
    Always shut down Touch BEFORE Master.

${"=".repeat(60)}
MASTER PC - STAFF INTERFACE
${"=".repeat(60)}

LOGIN
    Email:    ${hotel.adminEmail}
    Password: ${hotel.adminPassword}

CREATING A NEW ALBUM
    1. Login to Master
    2. Click "Albums" in the sidebar
    3. Click "+ New Album"
    4. Enter album name (e.g., guest name, room number, event)
    5. Import photos from camera/SD card/USB
    6. Photos are automatically processed and synced to cloud

MANAGING ORDERS
    1. Click "Orders" in the sidebar
    2. View pending/completed/cancelled orders
    3. Click on an order to see details
    4. Print receipts or resend gallery links

MONEYTRASH (PHOTO PRICING)
    - Price per photo: ${hotel.moneytrashPrice} EUR
    - Guests select photos on the Touch kiosk
    - Payment processed at reception
    - Unpurchased photos auto-delete after 7 days

CLOUD SYNC
    - Albums, photos, and orders sync to cloud automatically
    - Check sync status: Settings > Cloud Sync
    - Manual sync: Settings > Cloud Sync > Sync Now

${"=".repeat(60)}
TOUCH KIOSK - GUEST INTERFACE
${"=".repeat(60)}

HOW GUESTS USE THE KIOSK
    1. Guest approaches the touchscreen
    2. Welcome screen with hotel branding
    3. Guest enters their album code / room number / scans QR
    4. Photos from their album appear in a grid
    5. Guest selects photos they want to purchase
    6. Guest confirms selection
    7. Order is sent to Master for staff processing
    8. Guest receives gallery link (QR code / email)

ADMIN ACCESS ON TOUCH KIOSK
    - Press Ctrl+Alt+Shift+X on a keyboard
    - Enter admin PIN: ${hotel.adminPin}
    - Admin menu allows:
      * View system status
      * Restart application
      * Exit kiosk mode (requires password: ${hotel.kioskPassword})
      * View connection status to Master

${"=".repeat(60)}
CUSTOMER GALLERY
${"=".repeat(60)}

    - Guests access their photos online at:
      ${GALLERY_URL}
    - Each album has a unique access code
    - Guests can view, download, and share their photos
    - Gallery links are sent via QR code or email

${"=".repeat(60)}
QUICK REFERENCE
${"=".repeat(60)}

    Admin Email:      ${hotel.adminEmail}
    Admin Password:   ${hotel.adminPassword}
    Admin PIN:        ${hotel.adminPin}
    Kiosk Exit:       ${hotel.kioskPassword}
    Admin Shortcut:   Ctrl+Alt+Shift+X
    Desk ID:          ${hotel.deskId}
    Photo Price:      ${hotel.moneytrashPrice} EUR
    Master Port:      8090
    Touch Ports:      8091 (backend), 8001 (frontend)
    Cloud Hub:        ${HUB_URL}
    Gallery:          ${GALLERY_URL}
`;
}

function findInstaller(dir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const matches = files
    .filter((f) => pattern.test(f) && f.endsWith(".exe") && !f.includes("blockmap"))
    .sort((a, b) => {
      // Sort by modification time descending — pick newest build
      const aStat = fs.statSync(path.join(dir, a));
      const bStat = fs.statSync(path.join(dir, b));
      return bStat.mtimeMs - aStat.mtimeMs;
    });
  return matches.length > 0 ? path.join(dir, matches[0]) : null;
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

    // Write documentation files
    fs.writeFileSync(
      path.join(hotelDir, "SETUP.txt"),
      generateSetupTxt(hotel),
    );
    fs.writeFileSync(
      path.join(hotelDir, "CREDENTIALS.txt"),
      generateCredentialsTxt(hotel),
    );
    fs.writeFileSync(
      path.join(hotelDir, "INSTALL-MANUAL.txt"),
      generateInstallManualTxt(hotel),
    );
    fs.writeFileSync(
      path.join(hotelDir, "USER-MANUAL.txt"),
      generateUserManualTxt(hotel),
    );

    console.log(`  master/  - installer + config/.env + config/bootstrap.json`);
    console.log(`  touch/   - installer + config/.env`);
    console.log(`  SETUP.txt  CREDENTIALS.txt  INSTALL-MANUAL.txt  USER-MANUAL.txt`);
  }

  console.log(`\nDone! ${HOTELS.length} deployment packages ready at:`);
  console.log(`  ${DEPLOYMENT_DIR}`);
}

main();
