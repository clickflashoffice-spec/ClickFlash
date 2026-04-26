import fs from 'fs-extra';
import path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(ROOT_DIR, '..', '..');
const SRC_DIR = path.join(ROOT_DIR, 'backend');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'backend');
const UI_SRC = path.join(MONOREPO_ROOT, 'packages', 'ui', 'src');
const UI_DEST = path.join(ROOT_DIR, 'src', 'components', 'ui');

async function copyAssets() {
    console.log('[Assets] Copying static assets for Master...');
    console.log('[Assets] ROOT_DIR:', ROOT_DIR);
    console.log('[Assets] MONOREPO_ROOT:', MONOREPO_ROOT);
    console.log('[Assets] UI_SRC:', UI_SRC);

    // Migrations
    const srcMigrations = path.join(SRC_DIR, 'shared', 'migrations');
    const destMigrations = path.join(DIST_DIR, 'shared', 'migrations');

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

    // CRITICAL: Copy UI package components into master src for self-contained bundle
    // This ensures NO external symlinks are needed in production
    if (await fs.pathExists(UI_SRC)) {
        await fs.ensureDir(UI_DEST);
        await fs.copy(UI_SRC, UI_DEST, { overwrite: true });
        console.log(`[Assets] Copied @clickflash/ui components to ${UI_DEST}`);
        
        // Copy package.json for UI package
        const uiPkgJson = path.join(UI_SRC, '..', 'package.json');
        if (await fs.pathExists(uiPkgJson)) {
            await fs.copy(uiPkgJson, path.join(UI_DEST, 'package.json'));
        }
    } else {
        console.warn('[Assets] Warning: packages/ui not found - using existing src/components/ui');
    }

    console.log('[Assets] Done.');
}

copyAssets().catch(err => {
    console.error('[Assets] Error copying assets:', err);
    process.exit(1);
});
