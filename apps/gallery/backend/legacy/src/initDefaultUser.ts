import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DatabaseManager from './db.js';
import { hashPassword } from './auth.js';
import { DATA_DIR, DB_FILE } from './config.js';

const DEFAULT_USER = {
    name: 'Alaeddine',
    email: 'alaeddine@example.com',
    password: 'DEFAULT_PASSWORD_PLACEHOLDER',
    role: 'Admin'
};

export async function initDefaultUser(dbManagerOrPath?: DatabaseManager | string): Promise<void> {
    let dbManager: DatabaseManager;

    if (dbManagerOrPath instanceof DatabaseManager) {
        dbManager = dbManagerOrPath;
    } else {
        const dbPath = typeof dbManagerOrPath === 'string'
            ? path.join(dbManagerOrPath, 'data.db')
            : DB_FILE;

        if (!fs.existsSync(dbPath)) {
            console.warn(`[Init] Database file not found at ${dbPath}. Will initialize on first server connection.`);
            return;
        }

        dbManager = new DatabaseManager(dbPath);
        dbManager.connect();
    }

    try {
        const existingUsers = dbManager.query('SELECT COUNT(*) as count FROM users');
        const userCount = (existingUsers[0] as any)?.count || 0;

        const defaultUser = dbManager.get('SELECT * FROM users WHERE email = ?', [DEFAULT_USER.email]);

        if (userCount === 0 || !defaultUser) {
            console.log(`[Init] Creating default admin user: ${DEFAULT_USER.email}`);
            const hashedPassword = await hashPassword(DEFAULT_USER.password);

            dbManager.run(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role]
            );

            console.log(`[Init] ✓ Default user created successfully`);
        } else {
            console.log(`[Init] Default user already exists.`);
        }
    } catch (error: any) {
        console.error('[Init] Error initializing default user:', error.message);
    }
}

// Support for direct execution
const isMain = process.argv[1] && (
    process.argv[1].endsWith('initDefaultUser.ts') ||
    process.argv[1].endsWith('initDefaultUser.js')
);

if (isMain) {
    initDefaultUser().then(() => {
        console.log('[Init] Done.');
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
