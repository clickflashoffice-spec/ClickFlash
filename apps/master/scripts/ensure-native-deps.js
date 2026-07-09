/**
 * afterPack hook for electron-builder
 * 1. Ensures native module dependencies are copied into the app.asar.unpacked node_modules
 * 2. Generates KioskGuardian.exe SHA-256 hash for runtime integrity verification
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const NATIVE_MODULE_DEPS = [
  'better-sqlite3-multiple-ciphers',
  'sharp',
  'color',
  'color-convert',
  'color-name',
  'color-string',
  'detect-libc',
  'semver',
  'simple-swizzle',
  'is-arrayish',
  'bindings',
  'file-uri-to-path',
  '@napi-rs/canvas-win32-x64-msvc',
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

function resolvePackagePath(dep, startDirs) {
  try {
    const pkgJsonPath = require.resolve(path.join(dep, 'package.json'), { paths: startDirs });
    return path.dirname(pkgJsonPath);
  } catch (e) {
    return null;
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
    
    // Check if already exists and is non-empty
    if (fs.existsSync(destDir) && fs.readdirSync(destDir).length > 0) {
      console.log(`[ensure-native-deps] ${dep} already exists`);
      continue;
    }
    
    // 1. Try require.resolve
    let resolvedSrc = resolvePackagePath(dep, [__dirname, path.join(monorepoRoot, 'apps', 'master'), monorepoRoot]);
    
    // 2. Try possiblePaths fallback
    const possiblePaths = [
      resolvedSrc,
      path.join(monorepoRoot, 'node_modules', dep),
      path.join(monorepoRoot, 'node_modules', '.pnpm', 'node_modules', dep),
      path.join(monorepoRoot, 'apps', 'master', 'node_modules', dep),
      path.join(monorepoRoot, 'node_modules', '.pnpm', 'bindings@1.5.0', 'node_modules', dep),
      path.join(monorepoRoot, 'node_modules', '.pnpm', 'file-uri-to-path@1.0.0', 'node_modules', dep),
      path.join(monorepoRoot, 'node_modules', '.pnpm', 'file-uri-to-path@2.0.0', 'node_modules', dep),
      path.join(monorepoRoot, 'node_modules', '.pnpm', '@napi-rs+canvas-win32-x64-msvc@0.1.92', 'node_modules', dep),
    ].filter(Boolean);
    
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
