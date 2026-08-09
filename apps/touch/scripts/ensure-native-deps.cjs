/**
 * afterPack hook for electron-builder
 * Ensures native module dependencies are copied into the app.asar.unpacked node_modules
 * and correct prebuilt binaries for Electron runtime are downloaded.
 */
const fs = require('fs');
const path = require('path');

const MODULES_TO_COPY = [
  // Native modules (must be unpacked for fork() with ELECTRON_RUN_AS_NODE)
  'better-sqlite3-multiple-ciphers',
  'sharp',
  '@img',
  '@napi-rs',
  // JS dependencies required by sharp/better-sqlite3 at runtime
  'bindings',
  'file-uri-to-path',
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
  let actualSrc;
  try {
    actualSrc = fs.realpathSync(src);
  } catch (e) {
    return; // Ignore broken symlinks
  }
  
  let entries;
  try {
    entries = fs.readdirSync(actualSrc);
  } catch (e) {
    return;
  }

  for (const name of entries) {
    const srcPath = path.join(actualSrc, name);
    const destPath = path.join(dest, name);
    
    let stat;
    try {
      stat = fs.statSync(srcPath);
    } catch (e) {
      continue; // Ignore broken symlink targets like sharp-darwin-arm64 on Windows
    }

    if (stat.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (e) {
        // Ignore copy errors
      }
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
  
  const ALWAYS_OVERWRITE = ['better-sqlite3-multiple-ciphers', 'sharp', 'bindings', 'file-uri-to-path', '@img', '@napi-rs'];
  for (const dep of MODULES_TO_COPY) {
    const destDir = path.join(nodeModulesDir, dep);
    const isScoped = dep.startsWith('@');
    
    const shouldOverwrite = ALWAYS_OVERWRITE.includes(dep);
    if (shouldOverwrite && fs.existsSync(destDir)) {
      console.log(`[ensure-native-deps] Overwriting ${dep}`);
      fs.rmSync(destDir, { recursive: true, force: true });
    } else if (!isScoped && fs.existsSync(destDir)) {
      console.log(`[ensure-native-deps] ${dep} already exists`);
      continue;
    }
    
    // Try to find in various locations (handle scoped packages like @img, @napi-rs)
    const depParts = dep.split('/');
    const depPath = depParts.join(path.sep);
    const resolvedSrc = isScoped ? null : resolvePackagePath(dep, [__dirname, path.join(monorepoRoot, 'apps', 'touch'), monorepoRoot]);
    const possiblePaths = [
      resolvedSrc,
      path.join(monorepoRoot, 'node_modules', depPath),
      path.join(monorepoRoot, 'node_modules', '.pnpm', 'node_modules', depPath),
      path.join(monorepoRoot, 'apps', 'touch', 'node_modules', depPath),
      path.join(monorepoRoot, 'node_modules', '.pnpm', 'bindings@1.5.0', 'node_modules', depPath),
      path.join(monorepoRoot, 'node_modules', '.pnpm', 'file-uri-to-path@1.0.0', 'node_modules', depPath),
      path.join(monorepoRoot, 'node_modules', '.pnpm', 'file-uri-to-path@2.0.0', 'node_modules', depPath),
    ].filter(Boolean);
    
    let found = false;
    for (const src of possiblePaths) {
      if (fs.existsSync(src)) {
        if (isScoped) {
          console.log(`[ensure-native-deps] Copying scoped package ${dep} components from ${src}`);
          fs.mkdirSync(destDir, { recursive: true });
          const subDeps = fs.readdirSync(src);
          for (const subDep of subDeps) {
            const subSrc = path.join(src, subDep);
            const subDest = path.join(destDir, subDep);
            if (!fs.existsSync(subDest)) {
              console.log(`[ensure-native-deps] Copying scoped sub-dependency ${dep}/${subDep} from ${subSrc}`);
              fs.mkdirSync(subDest, { recursive: true });
              copyDir(subSrc, subDest);
            } else {
              console.log(`[ensure-native-deps] Scoped sub-dependency ${dep}/${subDep} already exists`);
            }
          }
        } else {
          console.log(`[ensure-native-deps] Copying ${dep} from ${src}`);
          fs.mkdirSync(destDir, { recursive: true });
          copyDir(src, destDir);
        }
        
        if (dep === 'better-sqlite3-multiple-ciphers') {
          try {
            const execSync = require('child_process').execSync;
            const prebuildInstallBin = require.resolve('prebuild-install/bin.js', { paths: [fs.realpathSync(src), monorepoRoot] });
            console.log(`[ensure-native-deps] Downloading Electron binary for ${dep}...`);
            execSync(`node "${prebuildInstallBin}" --runtime electron --target 39.8.7 --force`, {
              cwd: destDir,
              stdio: 'inherit'
            });
          } catch (e) {
            console.error(`[ensure-native-deps] Failed to download prebuilt binary for ${dep}:`, e.message);
          }
        }
        
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.warn(`[ensure-native-deps] WARNING: Could not find ${dep}`);
    }
  }
}

// electron-builder afterPack hook
module.exports = async function(context) {
  const appOutDir = context.appOutDir;
  console.log('[afterPack] Running ensure-native-deps...');
  ensureNativeDeps(appOutDir);
};
