import fs from 'fs';
import path from 'path';
import DatabaseManager from './db.js';
import { hashPassword } from './auth.js';
import { DB_FILE } from './config.js';

const DEFAULT_USER = {
    name: 'Alaeddine',
    email: 'alaeddine@example.com',
    password: 'DEFAULT_PASSWORD_PLACEHOLDER',
    role: 'Admin',
    desk_id: 'AdminStation'
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

        const defaultUser = dbManager.get('SELECT * FROM users WHERE email = ?', [DEFAULT_USER.email]) as any;

        if (userCount === 0 || !defaultUser) {
            console.log(`[Init] Creating default admin user: ${DEFAULT_USER.email}`);
            const hashedPassword = await hashPassword(DEFAULT_USER.password);

            dbManager.run(
                'INSERT INTO users (name, email, password, role, desk_id) VALUES (?, ?, ?, ?, ?)',
                [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role, DEFAULT_USER.desk_id]
            );

            console.log(`[Init] ✓ Default user created successfully`);
        } else {
            console.log(`[Init] Default user already exists: ${DEFAULT_USER.email}`);
            
            // Ensure desk_id is set for existing admin
            if (!defaultUser.desk_id) {
                console.log(`[Init] Patching missing desk_id for: ${DEFAULT_USER.email}`);
                dbManager.run('UPDATE users SET desk_id = ? WHERE email = ?', [DEFAULT_USER.desk_id, DEFAULT_USER.email]);
            }
        }
    } catch (error: any) {
        console.error('[Init] Error initializing default user:', error.message);
    }
}
