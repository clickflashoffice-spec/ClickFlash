
import { logger } from "@/utils/logger";
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve('pb_data/master.db');
logger.info('--- Read-Only Audit ---');

if (!fs.existsSync(dbPath)) {
    logger.error('DB Not Found');
    process.exit(1);
}

// Open in read-only mode to avoid being blocked by writers
const db = new Database(dbPath, { readonly: true, timeout: 5000 });
try {
    const journal = db.pragma('journal_mode');
    logger.info('Journal Mode:', journal);

    // Target from user's logs
    const targetAlbumId = '4f0def33-13db-4f00-bc9f-f977298aac9d';
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(targetAlbumId);

    if (album) {
        logger.info('✅ Found Album:', album);
    } else {
        logger.info('❌ Album NOT FOUND:', targetAlbumId);

        // Find if *any* album exists
        const count = db.prepare('SELECT count(*) as count FROM albums').get();
        logger.info('Total Albums in DB:', count.count);

        // Find recent albums
        const recent = db.prepare('SELECT id, title, created_at FROM albums ORDER BY created_at DESC LIMIT 5').all();
        logger.info('Recent Albums:', recent);
    }

    const photographerId = album ? album.photographerId : null;
    if (photographerId) {
        const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(photographerId);
        logger.info('Photographer User:', user ? user : 'NOT FOUND');
    }

} catch (e) {
    logger.error('Error:', e.message);
} finally {
    db.close();
}
