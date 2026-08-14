const fs = require('fs-extra');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(ROOT_DIR, '..', '..');
const SRC_DIR = path.join(ROOT_DIR, 'backend');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'backend');

// Dependencies of native modules that must be available in production node_modules
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

async function copyAssets() {
    console.log('[Assets] Copying static assets for Master...');
    console.log('[Assets] ROOT_DIR:', ROOT_DIR);
    console.log('[Assets] MONOREPO_ROOT:', MONOREPO_ROOT);

    // Migrations
    const srcMigrations = path.join(SRC_DIR, 'database', 'migrations');
    const destMigrations = path.join(DIST_DIR, 'database', 'migrations');

    if (await fs.pathExists(srcMigrations)) {
        await fs.copy(srcMigrations, destMigrations);
        console.log(`[Assets] Copied migrations to ${destMigrations}`);
    } else {
        console.warn('[Assets] Warning: No migrations directory found.');
    }

    // Backend-specific migrations
    const srcBackendMigrations = path.join(SRC_DIR, 'migrations');
    const destBackendMigrations = path.join(DIST_DIR, 'migrations');

    if (await fs.pathExists(srcBackendMigrations)) {
        await fs.copy(srcBackendMigrations, destBackendMigrations);
        console.log(`[Assets] Copied backend migrations to ${destBackendMigrations}`);
    }

    // CRITICAL: Copy native module dependencies into local node_modules
    // pnpm doesn't hoist transitive deps, but electron-builder needs them locally
    const pnpmModulesDir = path.join(MONOREPO_ROOT, 'node_modules', '.pnpm', 'node_modules');
    const localNodeModules = path.join(ROOT_DIR, 'node_modules');
    
    for (const dep of NATIVE_MODULE_DEPS) {
        const srcDep = path.join(pnpmModulesDir, dep);
        const destDep = path.join(localNodeModules, dep);
        
        if (await fs.pathExists(srcDep)) {
            await fs.ensureDir(localNodeModules);
            if (await fs.pathExists(destDep)) {
                await fs.remove(destDep);
            }
            await fs.copy(srcDep, destDep, { overwrite: true, dereference: true });
            console.log(`[Assets] Copied ${dep} to local node_modules`);
        } else {
            console.warn(`[Assets] Warning: ${dep} not found in pnpm store`);
        }
    }

    // CRITICAL: Copy .trie files for fontkit (used by PDF generation)
    const trieFilesToResolve = [
        '@foliojs-fork/fontkit/data.trie',
        '@foliojs-fork/fontkit/indic.trie',
        '@foliojs-fork/fontkit/use.trie',
        '@foliojs-fork/linebreak/src/classes.trie',
    ];
    
    for (const fileRoute of trieFilesToResolve) {
        try {
            // Using require.resolve to find the exact package path in pnpm
            const resolvedPath = require.resolve(fileRoute);
            const destTrie = path.join(DIST_DIR, path.basename(fileRoute));
            await fs.copy(resolvedPath, destTrie);
            console.log(`[Assets] Copied ${fileRoute} to dist/backend/`);
        } catch (err) {
            console.warn(`[Assets] Warning: Failed to resolve or copy ${fileRoute}`);
        }
    }

    console.log('[Assets] Done.');
}

copyAssets().catch(err => {
    console.error('[Assets] Error copying assets:', err);
    process.exit(1);
});
