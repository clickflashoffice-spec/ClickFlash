/**
 * Build script for Phase 71 Electron Rebuild
 * Compiles TypeScript and prepares for packaging
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Phase 71 Electron Main Process...');

// Clean dist directory
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
  console.log('Cleaned dist directory');
}

// Compile TypeScript
try {
  execSync('npx tsc', { stdio: 'inherit', cwd: __dirname });
  console.log('TypeScript compilation complete');
} catch (error) {
  console.error('TypeScript compilation failed:', error);
  process.exit(1);
}

// Copy empty preload if needed
const preloadDir = path.join(distDir, 'preload');
if (!fs.existsSync(preloadDir)) {
  fs.mkdirSync(preloadDir, { recursive: true });
}

// Create the main entry point that imports from dist
const mainEntry = path.join(__dirname, '..', 'electron-main-new.js');
const mainEntryContent = `/**
 * Phase 71: New Electron Main Entry Point
 * This file bridges to the new TypeScript-built main process
 */

const path = require('path');

// Set up paths for the new electron structure
process.env.PHASE71_ELECTRON = 'true';

// Load the compiled main process
require(path.join(__dirname, 'electron-new', 'dist', 'main', 'index.js'));
`;

fs.writeFileSync(mainEntry, mainEntryContent);
console.log('Created electron-main-new.js entry point');

// Copy to apps/master root
const rootEntry = path.join(__dirname, '..', '..', '..', 'electron-main-new.js');
fs.copyFileSync(mainEntry, rootEntry);
console.log('Copied entry point to project root');

console.log('Build complete!');
