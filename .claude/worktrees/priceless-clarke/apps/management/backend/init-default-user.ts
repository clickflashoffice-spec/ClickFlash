// backend/init-default-user.js
// Script to initialize default admin user if database is empty
// Run this on first startup or when database is reset

const { DatabaseManager } = require('./db');
const { hashPassword } = require('./auth');
const path = require('path');

// Configuration (for standalone execution)
const DATA_DIR = process.argv[2] || process.env.DATA_DIR || path.join(__dirname, '../pb_data');
const DB_FILE = path.join(DATA_DIR, 'data.db');

// Default user credentials (matching Login.tsx defaults)
const DEFAULT_USER = {
    name: 'Alaeddine',
    email: 'alaeddine@example.com',
    password: 'DEFAULT_PASSWORD_PLACEHOLDER',
    role: 'Admin',
    desk_id: 'AdminStation'
};

async function initDefaultUser(dbManagerOrPath) {
    let dbManager;

    // If dbManager is provided (from server.js), use it directly
    if (dbManagerOrPath && typeof dbManagerOrPath.get === 'function') {
        dbManager = dbManagerOrPath;
        console.log('[Init] Checking for default user...');
    } else {
        // Otherwise, create a new connection (standalone execution)
        const dbPath = typeof dbManagerOrPath === 'string'
            ? path.join(dbManagerOrPath, 'data.db')
            : DB_FILE;
        console.log('[Init] Checking for default user...');
        console.log(`[Init] Database: ${dbPath}`);

        if (!require('fs').existsSync(dbPath)) {
            console.warn(`[Init] Database file not found: ${dbPath}`);
            console.warn('[Init] Will create default user when database is initialized.');
            return;
        }

        dbManager = new DatabaseManager(dbPath);
        dbManager.connect();
        console.log('[Init] Database connected');
    }

    try {

        // Check if any users exist
        const existingUsers = dbManager.query('SELECT COUNT(*) as count FROM users');
        const userCount = existingUsers[0]?.count || 0;

        console.log(`[Init] Found ${userCount} existing user(s)`);

        // Check if default user already exists
        const defaultUser = dbManager.get('SELECT * FROM users WHERE email = ?', [DEFAULT_USER.email]);

        if (userCount === 0 || !defaultUser) {
            console.log(`[Init] Creating default admin user: ${DEFAULT_USER.email}`);

            const hashedPassword = await hashPassword(DEFAULT_USER.password);

            const insertSql = `
                INSERT INTO users (name, email, password, role, desk_id)
                VALUES (?, ?, ?, ?, ?)
            `;

            dbManager.run(insertSql, [
                DEFAULT_USER.name,
                DEFAULT_USER.email,
                hashedPassword,
                DEFAULT_USER.role,
                DEFAULT_USER.desk_id
            ]);

            console.log(`[Init] ✓ Default user created successfully`);
            console.log(`[Init] Email: ${DEFAULT_USER.email}`);
            console.log(`[Init] Password: ${DEFAULT_USER.password}`);
            console.log(`[Init] Role: ${DEFAULT_USER.role}`);
            console.log(`[Init] Desk ID: ${DEFAULT_USER.desk_id}`);
        } else {
            console.log(`[Init] Default user already exists: ${DEFAULT_USER.email}`);
            console.log(`[Init] Role: ${defaultUser.role}`);
            
            // Ensure desk_id is set for existing admin (Rule 01 compliance)
            if (!defaultUser.desk_id) {
                console.log(`[Init] Patching missing desk_id for: ${DEFAULT_USER.email}`);
                dbManager.run('UPDATE users SET desk_id = ? WHERE email = ?', [DEFAULT_USER.desk_id, DEFAULT_USER.email]);
            }
        }
    } catch (error) {
        console.error('[Init] ERROR:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initDefaultUser()
        .then(() => {
            console.log('[Init] Initialization complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[Init] Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { initDefaultUser };

