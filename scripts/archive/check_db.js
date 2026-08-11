import { logger } from '@/utils/logger';


const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'apps/master/pb_data/master.db');
const migrationPath = path.join(__dirname, 'apps/master/backend/migrations/047_restore_missing_permissions.sql');

logger.info('--- Database Check ---');
logger.info('Path:', dbPath);

if (!fs.existsSync(dbPath)) {
    logger.error('Database file not found!');
    process.exit(1);
}

const db = new Database(dbPath);

try {
    // 1. Check Tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    logger.info('Tables:', tables.map(t => t.name).join(', '));

    // 2. Check Roles and Permission Counts
    const roles = db.prepare("SELECT role, COUNT(*) as count FROM role_permissions GROUP BY role").all();
    logger.info('Role Permissions:', roles);

    // 3. Check for the specific permission
    const hasPerm = db.prepare("SELECT COUNT(*) as count FROM role_permissions WHERE permission = 'manageSystemInfrastructure'").get();
    logger.info('manageSystemInfrastructure count:', hasPerm.count);

    // 4. Check user roles
    const users = db.prepare("SELECT email, role FROM users").all();
    logger.info('Users:', users);

    if (hasPerm.count === 0) {
        logger.info('Applying migration manually...');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        db.exec(sql);
        logger.info('Migration applied successfully.');

        const finalCount = db.prepare("SELECT COUNT(*) as count FROM role_permissions WHERE permission = 'manageSystemInfrastructure'").get();
        logger.info('Final count:', finalCount.count);
    } else {
        logger.info('Permission already exists in database.');
    }

} catch (err) {
    logger.error('Error:', err.message);
} finally {
    db.close();
}
