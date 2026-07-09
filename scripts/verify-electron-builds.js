/**
 * Automated Build Verification Script for ClickFlash Electron Apps
 * Audits unpacked Electron release folder to guarantee 100% presence of native bindings and loaders.
 * Usage: node scripts/verify-electron-builds.js <master|touch>
 */
const fs = require('fs');
const path = require('path');

const appName = process.argv[2] || 'master';
const monorepoRoot = path.resolve(__dirname, '..');
const appDir = path.join(monorepoRoot, 'apps', appName);
const winUnpackedDir = path.join(appDir, 'release', 'win-unpacked');
const unpackedNodeModules = path.join(winUnpackedDir, 'resources', 'app.asar.unpacked', 'node_modules');

console.log(`\n======================================================`);
console.log(`[VERIFICATION] Auditing native dependencies for: ${appName.toUpperCase()}`);
console.log(`======================================================`);

if (!fs.existsSync(winUnpackedDir)) {
  console.error(`[FAIL] win-unpacked directory does not exist at: ${winUnpackedDir}`);
  console.error(`Please run the build/package script first.`);
  process.exit(1);
}

if (!fs.existsSync(unpackedNodeModules)) {
  console.error(`[FAIL] app.asar.unpacked/node_modules directory missing at: ${unpackedNodeModules}`);
  process.exit(1);
}

const REQUIRED_DEPS = [
  { name: 'better-sqlite3-multiple-ciphers', checkNodeFile: true },
  { name: 'bindings', checkNodeFile: false },
  { name: 'file-uri-to-path', checkNodeFile: false },
];

let allPassed = true;

for (const req of REQUIRED_DEPS) {
  const depDir = path.join(unpackedNodeModules, req.name);
  if (!fs.existsSync(depDir)) {
    console.error(`[FAIL] Required module missing in app.asar.unpacked/node_modules: ${req.name}`);
    allPassed = false;
    continue;
  }
  
  if (req.checkNodeFile) {
    let hasNodeFile = false;
    function checkDirForNode(dir) {
      if (!fs.existsSync(dir)) return false;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.isDirectory()) {
          if (checkDirForNode(path.join(dir, item.name))) return true;
        } else if (item.name.endsWith('.node')) {
          return true;
        }
      }
      return false;
    }
    hasNodeFile = checkDirForNode(depDir);
    if (!hasNodeFile) {
      console.error(`[FAIL] ${req.name} exists but contains no compiled .node binary files!`);
      allPassed = false;
    } else {
      console.log(`[PASS] ${req.name} (with valid .node binaries)`);
    }
  } else {
    console.log(`[PASS] ${req.name}`);
  }
}

if (!allPassed) {
  console.error(`\n[RESULT] AUDIT FAILED for ${appName}. Native dependencies are incomplete.`);
  process.exit(1);
} else {
  console.log(`\n[RESULT] AUDIT SUCCESSFUL for ${appName}. All native runtime dependencies verified!`);
  process.exit(0);
}
