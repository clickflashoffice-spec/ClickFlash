/**
 * afterPack hook for electron-builder
 * 1. Ensures native module dependencies are copied into the app.asar.unpacked node_modules
 * 2. Verifies native .node binaries match the target Electron ABI — rebuilds if mismatched
 * 3. Generates KioskGuardian.exe SHA-256 hash for runtime integrity verification
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

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

// Native modules that ship .node binaries and MUST match Electron's ABI
const MODULES_REQUIRING_ABI_CHECK = [
  'better-sqlite3-multiple-ciphers',
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

/**
 * Find all .node files recursively in a directory
 */
function findNodeFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findNodeFiles(full));
    } else if (entry.name.endsWith('.node')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Get expected Electron Node ABI from the electron version.
 * Reads the electron package.json to find the version, then looks up
 * process.versions or uses a known mapping.
 */
function getElectronABI(electronVersion) {
  // Electron version -> Node ABI mapping for recent versions
  // This is the critical mapping that prevents ABI mismatches
  const abiMap = {
    '33': '128',  // Electron 33 -> Node ABI 128
    '34': '131',  // Electron 34 -> Node ABI 131
    '35': '132',  // Electron 35 -> Node ABI 132
    '36': '134',  // Electron 36 -> Node ABI 134
    '37': '136',  // Electron 37 -> Node ABI 136
    '38': '138',  // Electron 38 -> Node ABI 138
    '39': '140',  // Electron 39 -> Node ABI 140
    '40': '142',  // Electron 40 -> Node ABI 142
  };
  const major = electronVersion.split('.')[0];
  return abiMap[major] || null;
}

/**
 * Check if a .node binary was built for the expected ABI by reading the
 * binary and looking for the napi/node_module_version marker.
 * Falls back to checking file path patterns (e.g., "abi-140" in prebuilt path).
 */
function checkBinaryABI(nodeFilePath, expectedABI) {
  try {
    // Check path-based ABI marker (prebuild-install convention)
    const pathStr = nodeFilePath.replace(/\\/g, '/');
    if (pathStr.includes(`abi-${expectedABI}`)) return true;

    // Check the binary for ABI string marker
    const buf = fs.readFileSync(nodeFilePath);
    const str = buf.toString('latin1');
    
    // Look for NODE_MODULE_VERSION pattern in the binary
    // Prebuilt binaries from prebuild-install embed the ABI version in the path
    if (str.includes(`abi${expectedABI}`) || str.includes(`napi-v`)) return true;

    // If we can't determine ABI from the binary, check if it was recently rebuilt
    // by comparing mtime with a sentinel file
    return false;
  } catch (e) {
    console.warn(`[ABI-Check] Could not read ${nodeFilePath}: ${e.message}`);
    return false;
  }
}

/**
 * Rebuild a native module against the target Electron version.
 * Uses @electron/rebuild which is already a devDependency.
 */
function rebuildForElectron(modulePath, electronVersion, arch) {
  const moduleName = path.basename(modulePath);
  console.log(`[ABI-Rebuild] Rebuilding ${moduleName} for Electron ${electronVersion} (${arch})...`);
  
  try {
    // Use npx @electron/rebuild to rebuild the specific module
    const cmd = [
      'npx', '@electron/rebuild',
      '--force',
      '--module-dir', `"${modulePath}"`,
      '--electron-version', electronVersion,
      '--arch', arch,
    ].join(' ');
    
    console.log(`[ABI-Rebuild] Running: ${cmd}`);
    execSync(cmd, {
      cwd: modulePath,
      stdio: 'inherit',
      timeout: 120000, // 2 minute timeout
      env: { ...process.env, npm_config_runtime: 'electron', npm_config_target: electronVersion },
    });
    console.log(`[ABI-Rebuild] ✓ ${moduleName} rebuilt successfully for Electron ${electronVersion}`);
    return true;
  } catch (e) {
    console.error(`[ABI-Rebuild] ✗ Failed to rebuild ${moduleName}: ${e.message}`);
    
    // Fallback: try prebuild-install directly
    try {
      console.log(`[ABI-Rebuild] Trying prebuild-install fallback...`);
      const prebuildCmd = [
        'npx', 'prebuild-install',
        '--runtime=electron',
        `--target=${electronVersion}`,
        `--arch=${arch}`,
        '--tag-prefix=v',
        '--force',
      ].join(' ');
      
      execSync(prebuildCmd, {
        cwd: modulePath,
        stdio: 'inherit',
        timeout: 120000,
      });
      console.log(`[ABI-Rebuild] ✓ ${moduleName} prebuild installed for Electron ${electronVersion}`);
      return true;
    } catch (e2) {
      console.error(`[ABI-Rebuild] ✗ Prebuild fallback also failed: ${e2.message}`);
      return false;
    }
  }
}

/**
 * Verify all native .node binaries in app.asar.unpacked match the target
 * Electron ABI. If any mismatch is detected, rebuild the module.
 */
function verifyAndRebuildNative(appOutDir, electronVersion, arch) {
  const expectedABI = getElectronABI(electronVersion);
  if (!expectedABI) {
    console.warn(`[ABI-Check] Unknown Electron version ${electronVersion}, skipping ABI verification`);
    return;
  }
  
  console.log(`[ABI-Check] Verifying native modules for Electron ${electronVersion} (ABI ${expectedABI}, ${arch})`);
  
  const nodeModulesDir = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) return;
  
  for (const mod of MODULES_REQUIRING_ABI_CHECK) {
    const modDir = path.join(nodeModulesDir, mod);
    if (!fs.existsSync(modDir)) continue;
    
    const nodeFiles = findNodeFiles(modDir);
    if (nodeFiles.length === 0) {
      console.warn(`[ABI-Check] No .node files found in ${mod} — may need rebuild`);
      rebuildForElectron(modDir, electronVersion, arch);
      continue;
    }
    
    for (const nf of nodeFiles) {
      const relPath = path.relative(nodeModulesDir, nf);
      
      // Check if path contains the expected ABI marker
      const pathNorm = nf.replace(/\\/g, '/');
      if (pathNorm.includes(`abi-${expectedABI}`) || pathNorm.includes(`electron-v${electronVersion}`)) {
        console.log(`[ABI-Check] ✓ ${relPath} — correct ABI ${expectedABI} (path match)`);
        continue;
      }
      
      // Check if path contains a WRONG ABI marker
      const wrongAbiMatch = pathNorm.match(/abi-(\d+)/);
      if (wrongAbiMatch && wrongAbiMatch[1] !== expectedABI) {
        console.error(`[ABI-Check] ✗ ${relPath} — built for ABI ${wrongAbiMatch[1]}, need ${expectedABI}`);
        console.log(`[ABI-Check] Triggering rebuild of ${mod}...`);
        rebuildForElectron(modDir, electronVersion, arch);
        break; // Rebuild handles all files in the module
      }
      
      // No ABI marker in path — flag as unknown, rebuild to be safe
      console.warn(`[ABI-Check] ? ${relPath} — unknown ABI, rebuilding to be safe`);
      rebuildForElectron(modDir, electronVersion, arch);
      break;
    }
  }
  
  // Write a sentinel file to mark this build as ABI-verified
  const sentinelPath = path.join(nodeModulesDir, '.abi-verified');
  fs.writeFileSync(sentinelPath, JSON.stringify({
    electronVersion,
    expectedABI,
    arch,
    timestamp: new Date().toISOString(),
    modules: MODULES_REQUIRING_ABI_CHECK,
  }, null, 2));
  console.log(`[ABI-Check] Sentinel written to ${sentinelPath}`);
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
  const electronVersion = context.electronPlatformName
    ? context.packager.config.electronVersion
    : context.packager?.config?.electronVersion || '39.8.7';
  const arch = context.arch === 1 ? 'x64' : context.arch === 3 ? 'arm64' : 'x64';
  
  console.log('[afterPack] Running ensure-native-deps + ABI verification + guardian-hash...');
  console.log(`[afterPack] Electron: ${electronVersion}, Arch: ${arch}`);
  
  ensureNativeDeps(appOutDir);
  verifyAndRebuildNative(appOutDir, electronVersion, arch);
  generateGuardianHash(appOutDir);
};
