import { logger } from '@/utils/logger';

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve('apps/master/pb_data/master.db');
logger.info('Opening database at:', dbPath);

try {
    const db = new Database(dbPath, { readonly: true });

    // Check if users table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();

    if (!tableExists) {
        logger.info('Users table does NOT exist.');
    } else {
        logger.info('Users table exists.');
        const user = db.prepare("SELECT * FROM users WHERE email='alaeddine@example.com'").get();
        if (user) {
            logger.info('SUCCESS: User found:', user);
        } else {
            logger.info('FAILURE: User alaeddine@example.com NOT found.');
            const allUsers = db.prepare('SELECT * FROM users').all();
            logger.info('Total users:', allUsers.length);
        }
    }

    db.close();
} catch (error) {
    logger.error('Error:', error.message);
}
