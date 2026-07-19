import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '@/utils/logger';

// ESM dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths (assuming script is in apps/touch/scripts)
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'backend');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'backend');

async function copyAssets() {
    logger.info('[Assets] Copying static assets...');

    // Migrations
    const srcMigrations = path.join(SRC_DIR, 'migrations');
    const destMigrations = path.join(DIST_DIR, 'migrations');

    if (await fs.pathExists(srcMigrations)) {
        await fs.copy(srcMigrations, destMigrations);
        logger.info(`[Assets] Copied migrations to ${destMigrations}`);
    } else {
        logger.warn('[Assets] Warning: No migrations directory found.');
    }

    // Add other assets here if needed (e.g. email templates)

    logger.info('[Assets] Done.');
}

copyAssets().catch(err => {
    logger.error('[Assets] Error copying assets:', err);
    process.exit(1);
});
