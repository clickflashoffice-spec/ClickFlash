// backend/migrate-passwords.js
// Utility script to hash existing plain text passwords in the database
// Run this once to migrate any existing users with plain text passwords

const Database = require('better-sqlite3');
const path = require('path');
const { hashPassword } = require('./auth');

// Configuration
const DATA_DIR = process.argv[2] || path.join(__dirname, '../pb_data');
const DB_FILE = path.join(DATA_DIR, 'data.db');

// Bcrypt hashes start with $2a$, $2b$, or $2y$
function isHashed(password) {
    return password && typeof password === 'string' && password.startsWith('$2');
}

async function migratePasswords() {
    console.log('[Password Migration] Starting password migration...');
    console.log(`[Password Migration] Database: ${DB_FILE}`);

    if (!require('fs').existsSync(DB_FILE)) {
        console.error(`[Password Migration] ERROR: Database file not found: ${DB_FILE}`);
        process.exit(1);
    }

    const db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');

    try {
        // Get all users
        const users = db.prepare('SELECT id, email, password FROM users WHERE password IS NOT NULL').all();
        
        console.log(`[Password Migration] Found ${users.length} users with passwords`);

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const user of users) {
            try {
                // Check if password is already hashed
                if (isHashed(user.password)) {
                    console.log(`[Password Migration] ✓ User ${user.email} already has hashed password`);
                    skipped++;
                    continue;
                }

                // Hash the plain text password
                console.log(`[Password Migration] Hashing password for user: ${user.email}`);
                const hashedPassword = await hashPassword(user.password);

                // Update the database
                const update = db.prepare('UPDATE users SET password = ? WHERE id = ?');
                update.run(hashedPassword, user.id);

                console.log(`[Password Migration] ✓ Migrated password for user: ${user.email}`);
                migrated++;
            } catch (error) {
                console.error(`[Password Migration] ✗ Error migrating user ${user.email}:`, error.message);
                errors++;
            }
        }

        console.log('\n[Password Migration] Migration Summary:');
        console.log(`  - Migrated: ${migrated} users`);
        console.log(`  - Already hashed: ${skipped} users`);
        console.log(`  - Errors: ${errors} users`);
        console.log(`[Password Migration] ✓ Migration completed!`);

        if (migrated > 0) {
            console.log('\n[Password Migration] ⚠️  IMPORTANT: All users with migrated passwords should change their passwords on next login.');
        }
    } catch (error) {
        console.error('[Password Migration] FATAL ERROR:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run migration
migratePasswords().catch(error => {
    console.error('[Password Migration] Unhandled error:', error);
    process.exit(1);
});

