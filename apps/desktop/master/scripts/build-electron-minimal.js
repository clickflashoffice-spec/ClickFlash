import { logger } from '@/utils/logger';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appDir = path.resolve(__dirname, '..');
const buildDir = path.join(appDir, 'release', 'build-tmp');
const distDir = path.join(appDir, 'dist');
const buildResourcesDir = path.join(appDir, 'build');

// Clean build dir
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Minimal package.json with only runtime dependencies
const minimalPkg = {
  name: 'clickflash-master',
  version: '4.2.0',
  main: 'dist/electron/electron-main.js',
  dependencies: {
    // Electron runtime (needed for electron-builder version detection)
    'electron': '^39.8.7',
    // Native modules (external in esbuild)
    'better-sqlite3-multiple-ciphers': '^12.8.0',
    'better-sqlite3-session-store': '^0.1.0',
    'sharp': '^0.33.2',
    '@napi-rs/canvas': '^0.1.86',
    // Electron updater (used by autoUpdater)
    'electron-updater': '^6.3.9',
    // Backend runtime deps that may be dynamically required
    'express': '^5.1.0',
    'express-session': '^1.18.2',
    'jsonwebtoken': '^9.0.2',
    'helmet': '^8.1.0',
    'bcryptjs': '^2.4.3',
    'cookie-parser': '^1.4.7',
    'cors': '^2.8.5',
    'dotenv': '^17.2.3',
    'uuid': '^10.0.0',
    'ws': '^8.18.3',
    'zod': '^4.1.13',
    'formidable': '^2.1.5',
    'nodemailer': '^8.0.5',
    'qrcode': '^1.5.4',
    'resend': '^6.9.3',
    'stripe': '^20.2.0',
    'systeminformation': '^5.30.5',
    'pdfmake': '~0.2.23',
    'pdf-to-printer': '^5.6.1',
    'archiver': '^7.0.1',
    'adm-zip': '^0.5.16',
    'fs-extra': '^11.3.2',
    'rimraf': '^6.1.3',
    'semver': '^7.7.4',
    // Color deps (sharp transitive deps)
    'color': '^4.2.3',
    'color-convert': '^2.0.1',
    'color-name': '^1.1.4',
    'color-string': '^1.9.1',
    'detect-libc': '^2.1.2',
    'is-arrayish': '^0.3.4',
    'simple-swizzle': '^0.2.2',
    'universalify': '^2.0.1',
  }
};

fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify(minimalPkg, null, 2));

// Copy dist
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

logger.info('Copying dist...');
copyDir(distDir, path.join(buildDir, 'dist'));

// Copy build resources
logger.info('Copying build resources...');
copyDir(buildResourcesDir, path.join(buildDir, 'build'));

// Create minimal electron-builder.yml
const electronBuilderConfig = `appId: com.clickflash.master
productName: "ClickFlash - Master Portal"
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - package.json
asar: true
asarUnpack:
  - "dist/backend/**/*"
npmRebuild: true
win:
  target:
    - nsis
  icon: build/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico
  installerHeaderIcon: build/icon.ico
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: "ClickFlash Master"
  artifactName: "ClickFlash - Master Portal Setup \${version}.\${ext}"
`;
fs.writeFileSync(path.join(buildDir, 'electron-builder.yml'), electronBuilderConfig.trim());

// Run npm install
logger.info('Installing production dependencies...');
execSync('npm install --production', { cwd: buildDir, stdio: 'inherit' });

// Run electron-builder using the main project's electron-builder
logger.info('Running electron-builder...');
const electronBuilderPath = path.join(appDir, 'node_modules', '.bin', 'electron-builder.CMD');
execSync(`"${electronBuilderPath}" build --win --dir`, { cwd: buildDir, stdio: 'inherit' });

logger.info('Build complete!');
