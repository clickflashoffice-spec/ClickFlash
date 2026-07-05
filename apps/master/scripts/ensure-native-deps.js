/**
 * afterPack hook for electron-builder
 * 1. Ensures native module dependencies are copied into the app.asar.unpacked node_modules
 * 2. Generates KioskGuardian.exe SHA-256 hash for runtime integrity verification
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const NATIVE_MODULE_DEPS = [
  'color',
  'color-convert',
  'color-name',
  'color-string',
  'detect-libc',
  'semver',
  'simple-swizzle',
  'is-arrayish',
];

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureNativeDeps(appOutDir) {
  const nodeModulesDir = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules');
  
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('[ensure-native-deps] node_modules dir not found, skipping');
    return;
  }
  
  console.log('[ensure-native-deps] Ensuring native deps in:', nodeModulesDir);
  
  // Find monorepo root
  const monorepoRoot = path.resolve(__dirname, '..', '..', '..');
  
  for (const dep of NATIVE_MODULE_DEPS) {
    const destDir = path.join(nodeModulesDir, dep);
    
    // Check if already exists
    if (fs.existsSync(destDir)) {
      console.log(`[ensure-native-deps] ${dep} already exists`);
      continue;
    }
    
    // Try to find in various locations
    const possiblePaths = [
      path.join(monorepoRoot, 'node_modules', dep),
      path.join(monorepoRoot, 'node_modules', '.pnpm', 'node_modules', dep),
      path.join(monorepoRoot, 'apps', 'master', 'node_modules', dep),
    ];
    
    let found = false;
    for (const src of possiblePaths) {
      if (fs.existsSync(src)) {
        console.log(`[ensure-native-deps] Copying ${dep} from ${src}`);
        fs.mkdirSync(destDir, { recursive: true });
        copyDir(src, destDir);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.warn(`[ensure-native-deps] WARNING: Could not find ${dep}`);
    }
  }
}

function generateGuardianHash(appOutDir) {
  const resourcesDir = path.join(appOutDir, 'resources', 'helper_scripts');
  const exePath = path.join(resourcesDir, 'KioskGuardian.exe');
  const hashPath = exePath + '.sha256';
  
  if (!fs.existsSync(exePath)) {
    console.warn(`[HashGen] KioskGuardian.exe not found at ${exePath} — skipping`);
    return;
  }

  const data = fs.readFileSync(exePath);
  const digest = crypto.createHash('sha256').update(data).digest('hex');

  fs.writeFileSync(hashPath, digest + '\n', 'utf8');
  console.log(`[HashGen] ${path.basename(exePath)} → ${digest}`);
}

// electron-builder afterPack hook
module.exports = async function(context) {
  const appOutDir = context.appOutDir;
  console.log('[afterPack] Running ensure-native-deps + guardian-hash...');
  
  ensureNativeDeps(appOutDir);
  generateGuardianHash(appOutDir);
};
