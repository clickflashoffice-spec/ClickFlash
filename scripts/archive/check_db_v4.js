import { logger } from '@/utils/logger';


const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'apps', 'master', 'pb_data', 'master.db');
const db = new Database(dbPath, { verbose: logger.info });

let output = '';
const log = (...args) => {
    output += args.join(' ') + '\n';
    logger.info(...args);
};

try {
    const albumId = 'album_q27_r101_1738567115598';
    const photos = db.prepare('SELECT id, albumId, url, title FROM photos WHERE albumId = ? LIMIT 5').all(albumId);

    log('Photos for album:', albumId);
    log(JSON.stringify(photos, null, 2));

    const allPhotosCount = db.prepare('SELECT COUNT(*) as count FROM photos').get();
    log('Total photos in DB:', allPhotosCount.count);

} catch (err) {
    log('Error:', err.message);
} finally {
    fs.writeFileSync('check_db_v4_output.txt', output);
    db.close();
}
