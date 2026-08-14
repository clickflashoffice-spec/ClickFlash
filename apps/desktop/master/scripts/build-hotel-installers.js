#!/usr/bin/env node
/**
 * Hotel-Specific Master Portal Installer Builder
 *
 * Builds pre-configured installers for each hotel location:
 * - Concorde Green Park Palace Sousse (CGP)
 * - Marhaba Occidental Sousse (MAO)
 * - Marhaba Club Sousse (MAC)
 *
 * Usage:
 *   node scripts/build-hotel-installers.js [--all] [--hotel=cgp|mao|mac]
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const HOTEL_CONFIGS_DIR = path.join(ROOT_DIR, "configs", "hotel-configs");

// Hotel configurations
const HOTELS = {
  cgp: {
    id: "cgp",
    name: "Concorde Green Park Palace Sousse",
    shortName: "CGP",
    deskPrefix: "CGP_",
    appId: "com.clickflash.master.cgp",
    productName: "ClickFlash CGP",
    cloudDb: "cgp-db",
    cloudBucket: "cgp-gallery-assets",
    copyright: "© 2026 Concorde Green Park Palace Sousse",
  },
  mao: {
    id: "mao",
    name: "Marhaba Occidental Sousse",
    shortName: "MAO",
    deskPrefix: "MAO_",
    appId: "com.clickflash.master.mao",
    productName: "ClickFlash MAO",
    cloudDb: "mao-db",
    cloudBucket: "mao-gallery-assets",
    copyright: "© 2026 Marhaba Occidental Sousse",
  },
  mac: {
    id: "mac",
    name: "Marhaba Club Sousse",
    shortName: "MAC",
    deskPrefix: "MAC_",
    appId: "com.clickflash.master.mac",
    productName: "ClickFlash MAC",
    cloudDb: "mac-db",
    cloudBucket: "mac-gallery-assets",
    copyright: "© 2026 Marhaba Club Sousse",
  },
};

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[36m",
  cyan: "\x1b[96m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.blue}▶ ${step}${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, "green");
}

function logError(message) {
  log(`✗ ${message}`, "red");
}

function logWarning(message) {
  log(`⚠ ${message}`, "yellow");
}

function runCommand(command, options = {}) {
  log(`  Running: ${command}`, "yellow");
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      cwd: ROOT_DIR,
      stdio: "pipe",
      ...options,
    });
    return output ? output.trim() : "";
  } catch (error) {
    logError(`Command failed: ${command}`);
    if (error.stdout) log(error.stdout, "red");
    if (error.stderr) log(error.stderr, "red");
    throw error;
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createHotelConfig(hotel) {
  const configPath = path.join(HOTEL_CONFIGS_DIR, `${hotel.id}.json`);

  const config = {
    hotel: {
      id: hotel.id,
      name: hotel.name,
      shortName: hotel.shortName,
      deskPrefix: hotel.deskPrefix,
    },
    cloud: {
      databaseName: hotel.cloudDb,
      bucketName: hotel.cloudBucket,
      managementHubUrl: "https://management.feethub.com",
      galleryUrl: "https://gallery.feethub.com",
    },
    app: {
      appId: hotel.appId,
      productName: hotel.productName,
      copyright: hotel.copyright,
    },
    sync: {
      enabled: true,
      intervalSeconds: 60,
      retryAttempts: 3,
    },
    kiosk: {
      defaultPort: 8091,
      discoveryTimeout: 30000,
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  logSuccess(`Created config: ${configPath}`);
  return configPath;
}

function createElectronBuilderConfig(hotel) {
  const configPath = path.join(ROOT_DIR, `electron-builder-${hotel.id}.yml`);

  const config = `extends: electron-builder.yml
appId: ${hotel.appId}
productName: ${hotel.productName}
copyright: ${hotel.copyright}

directories:
  output: release_${hotel.id}
  buildResources: build

extraResources:
  - from: .env.production.${hotel.id}
    to: .env.production
  - from: configs/hotel-configs/${hotel.id}.json
    to: configs/hotel-configs/${hotel.id}.json

nsis:
  shortcutName: ${hotel.productName}
`;

  fs.writeFileSync(configPath, config);
  logSuccess(`Created electron-builder config: ${configPath}`);
  return configPath;
}

function createEnvFile(hotel, envVars = {}) {
  const envPath = path.join(ROOT_DIR, `.env.production.${hotel.id}`);

  const defaultVars = {
    NODE_ENV: "production",
    HOTEL_ID: hotel.id,
    HOTEL_NAME: hotel.name,
    DESK_PREFIX: hotel.deskPrefix,
    CLOUD_SYNC_ENABLED: "true",
    CLOUD_API_URL: "https://management.feethub.com",
    GALLERY_API_URL: "https://gallery.feethub.com",
    // Cloudflare D1
    D1_DATABASE_NAME: hotel.cloudDb,
    // Cloudflare R2
    R2_BUCKET_NAME: hotel.cloudBucket,
    // Default credentials (should be overridden per-installation)
    CLOUD_EMAIL: `admin@${hotel.id}.feethub.com`,
    CLOUD_PASSWORD: "CHANGE_ME_ON_FIRST_LOGIN",
    // JWT
    JWT_SECRET: generateJwtSecret(),
    // Local server
    SERVER_PORT: "8090",
    KIOKS_PORT: "8091",
  };

  const mergedVars = { ...defaultVars, ...envVars };
  const envContent = Object.entries(mergedVars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  fs.writeFileSync(envPath, envContent);
  logSuccess(`Created env file: ${envPath}`);
  return envPath;
}

function generateJwtSecret() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
  let secret = "";
  for (let i = 0; i < 64; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

function buildHotelInstaller(hotel) {
  logStep("BUILD", `Building installer for ${hotel.name}...`);

  const configPath = createHotelConfig(hotel);
  const builderConfigPath = createElectronBuilderConfig(hotel);
  const envPath = createEnvFile(hotel);

  // Ensure release directory exists
  ensureDir(path.join(ROOT_DIR, `release_${hotel.id}`));

  // Run the build
  try {
    log("  Starting build process (this may take several minutes)...", "cyan");

    // Clean
    runCommand("npm run clean", { stdio: "inherit" });

    // Build frontend
    runCommand("npm run build", { stdio: "inherit" });

    // Build backend
    runCommand("npm run build:backend", { stdio: "inherit" });

    // Build electron main process
    runCommand("npm run build:electron", { stdio: "inherit" });

    // Package with electron-builder
    runCommand(
      `npx electron-builder build --win --config ${builderConfigPath}`,
      { stdio: "inherit" },
    );

    logSuccess(`Build complete for ${hotel.name}`);
    log(`  Output: release_${hotel.id}/`, "cyan");

    return true;
  } catch (error) {
    logError(`Build failed for ${hotel.name}`);
    return false;
  }
}

function showHelp() {
  console.log(`
${colors.bold}Hotel Installer Builder${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node scripts/build-hotel-installers.js [options]

${colors.cyan}Options:${colors.reset}
  --all       Build all hotel installers (default)
  --hotel=cgp Build only Concorde Green Park Palace
  --hotel=mao Build only Marhaba Occidental
  --hotel=mac Build only Marhaba Club
  --help      Show this help message

${colors.cyan}Examples:${colors.reset}
  node scripts/build-hotel-installers.js --all
  node scripts/build-hotel-installers.js --hotel=cgp
  node scripts/build-hotel-installers.js --hotel=mao --hotel=mac

${colors.cyan}Prerequisites:${colors.reset}
  1. Cloudflare D1 databases created:
     - cgp-db, mao-db, mac-db
  
  2. Cloudflare R2 buckets created:
     - cgp-gallery-assets, mao-gallery-assets, mac-gallery-assets
  
  3. Wrangler authenticated:
     npx wrangler login

${colors.cyan}Output:${colors.reset}
  apps/master/release_cgp/ClickFlash-CGP-4.2.0-setup.exe
  apps/master/release_mao/ClickFlash-MAO-4.2.0-setup.exe
  apps/master/release_mac/ClickFlash-MAC-4.2.0-setup.exe
`);
}

async function main() {
  console.log(`
${colors.bold}╔════════════════════════════════════════════════════════════════╗
║     ClickFlash Hotel Installer Builder                    ║
║     Version 4.2.0                                       ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    showHelp();
    process.exit(0);
  }

  // Ensure hotel configs directory exists
  ensureDir(HOTEL_CONFIGS_DIR);

  // Determine which hotels to build
  let hotelsToBuild = Object.values(HOTELS);

  const specificHotel = args.find((arg) => arg.startsWith("--hotel="));
  if (specificHotel) {
    const hotelId = specificHotel.split("=")[1];
    if (HOTELS[hotelId]) {
      hotelsToBuild = [HOTELS[hotelId]];
    } else {
      logError(`Unknown hotel: ${hotelId}`);
      log("Valid hotels: cgp, mao, mac");
      process.exit(1);
    }
  }

  log(
    `Building ${colors.cyan}${hotelsToBuild.length}${colors.reset} hotel installer(s)`,
  );

  const results = [];

  for (const hotel of hotelsToBuild) {
    const success = buildHotelInstaller(hotel);
    results.push({ hotel: hotel.name, success });
  }

  // Summary
  console.log(`
${colors.bold}╔════════════════════════════════════════════════════════════════╗
║     Build Summary                                          ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  for (const result of results) {
    const status = result.success
      ? `${colors.green}SUCCESS${colors.reset}`
      : `${colors.red}FAILED${colors.reset}`;
    log(`  ${status}  ${result.hotel}`);
  }

  const allSuccess = results.every((r) => r.success);

  if (allSuccess) {
    console.log(`
${colors.green}All builds completed successfully!${colors.reset}

Output files:
  ${colors.cyan}release_cgp/ClickFlash-CGP-4.2.0-setup.exe${colors.reset}
  ${colors.cyan}release_mao/ClickFlash-MAO-4.2.0-setup.exe${colors.reset}
  ${colors.cyan}release_mac/ClickFlash-MAC-4.2.0-setup.exe${colors.reset}

Next steps:
  1. Test installers on target machines
  2. Verify cloud connectivity for each hotel
  3. Deploy to hotel locations
    `);
  } else {
    console.log(`
${colors.red}Some builds failed. Check logs above for details.${colors.reset}
    `);
    process.exit(1);
  }
}

main();
