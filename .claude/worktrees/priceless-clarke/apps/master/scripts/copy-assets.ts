import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM dirname fix (if needed)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths (assuming script is in master/scripts)
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'backend');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'backend');

async function copyAssets() {
    console.log('[Assets] Copying static assets for Master...');

    // Migrations
    const srcMigrations = path.join(SRC_DIR, 'shared', 'migrations');
    const destMigrations = path.join(DIST_DIR, 'shared', 'migrations');

    if (await fs.pathExists(srcMigrations)) {
        await fs.copy(srcMigrations, destMigrations);
        console.log(`[Assets] Copied migrations to ${destMigrations}`);
    } else {
        console.warn('[Assets] Warning: No migrations directory found.');
    }

    // Backend-specific migrations (separate from shared)
    const srcBackendMigrations = path.join(SRC_DIR, 'migrations');
    const destBackendMigrations = path.join(DIST_DIR, 'migrations');

    if (await fs.pathExists(srcBackendMigrations)) {
        await fs.copy(srcBackendMigrations, destBackendMigrations);
        console.log(`[Assets] Copied backend migrations to ${destBackendMigrations}`);
    }

    console.log('[Assets] Done.');
}

copyAssets().catch(err => {
    console.error('[Assets] Error copying assets:', err);
    process.exit(1);
});
