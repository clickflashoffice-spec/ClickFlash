
import fs from 'fs';
import path from 'path';
import { IMPORT_DIR } from '../config/constants';

import { logger } from "../utils/logger";

const cleanupProcessing = async () => {
    logger.info(`[Cleanup] Scanning ${IMPORT_DIR} for stuck files...`);

    if (!fs.existsSync(IMPORT_DIR)) {
        logger.info('[Cleanup] Processing dir not found.');
        return;
    }

    const files = await fs.promises.readdir(IMPORT_DIR);
    const now = Date.now();
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

    let removedCount = 0;

    for (const file of files) {
        const filePath = path.join(IMPORT_DIR, file);
        try {
            const stats = await fs.promises.stat(filePath);
            const age = now - stats.mtimeMs;

            if (stats.isFile() && age > MAX_AGE_MS) {
                logger.info(`[Cleanup] Removing stale file: ${file} (${Math.round(age / 1000 / 60)}m old)`);
                await fs.promises.unlink(filePath);
                removedCount++;
            }
        } catch (e) {
            logger.error(`[Cleanup] Error checking ${file}:`, e);
        }
    }

    logger.info(`[Cleanup] Removed ${removedCount} stale files.`);
};

// Run if called directly
if (require.main === module) {
    cleanupProcessing().catch(logger.error);
}

export default cleanupProcessing;
