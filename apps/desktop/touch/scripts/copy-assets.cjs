const fs = require('fs-extra');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'backend');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'backend');

async function copyAssets() {
    console.log('[Assets] Copying static assets for Touch...');

    // Migrations
    const srcMigrations = path.join(SRC_DIR, 'migrations');
    const destMigrations = path.join(DIST_DIR, 'migrations');

    if (await fs.pathExists(srcMigrations)) {
        await fs.copy(srcMigrations, destMigrations);
        console.log(`[Assets] Copied migrations to ${destMigrations}`);
    } else {
        console.warn('[Assets] Warning: No migrations directory found.');
    }

    console.log('[Assets] Done.');
}

copyAssets().catch(err => {
    console.error('[Assets] Error copying assets:', err);
    process.exit(1);
});
