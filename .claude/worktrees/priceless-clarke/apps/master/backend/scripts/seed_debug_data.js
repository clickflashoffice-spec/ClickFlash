const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Connect to DB
const dbPath = path.join(__dirname, '../../pb_data/master.db');
console.log('Connecting to database at:', dbPath);
const db = new Database(dbPath);

try {
    // 1. Verify Tables Exist and Schema
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    console.log('Tables found:', tables.sort().join(', '));

    if (tables.includes('users')) {
        const columns = db.prepare("PRAGMA table_info(users)").all();
        console.log('Users table columns:', columns.map(c => c.name).join(', '));
    }

    // 2. Restore Main User (Alaeddine)
    const email = 'alaeddine@example.com';
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
        console.log(`User ${email} missing. Creating...`);

        // Hash password
        const passwordHash = bcrypt.hashSync('DEFAULT_PASSWORD_PLACEHOLDER', 10);

        // Check if we need to use 'password' or 'passwordHash' column
        // Based on typical schemas, let's try generic or check columns above. 
        // For now assuming 'password' based on error message 'Invalid email or password' which implies password check.
        // Actually, let's verify schema first, but in a single shot script:
        const columns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);

        const hasPassword = columns.includes('password');
        const hasPasswordHash = columns.includes('passwordHash');

        let insertQuery = '';
        if (hasPassword) {
            insertQuery = `
                INSERT INTO users (id, name, email, role, password, dailyPhotoTarget, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `;
        } else if (hasPasswordHash) {
            insertQuery = `
                INSERT INTO users (id, name, email, role, passwordHash, dailyPhotoTarget, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `;
        } else {
            // Fallback or error
            console.error("No password column found in users table!");
        }

        if (insertQuery) {
            const id = 'usr_' + Date.now(); // Simple ID generation
            db.prepare(insertQuery).run(id, 'Alaeddine', email, 'Admin', passwordHash, 1000);
            user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
            console.log(`User restored: ${user.email} (Password: DEFAULT_PASSWORD_PLACEHOLDER)`);
        }
    } else {
        console.log(`User ${email} already exists.`);
        // Optional: Reset password if it exists but login fails? 
        // Let's assume user wants it fixed, so maybe we SHOULD reset it if they say "login not working".
        // But let's check if they exist first.
    }

    // ... rest of debugging data ...

    // 3. Seed Login History (keep or update)
    if (user) {
        db.prepare(`
            INSERT INTO login_history (user_id, email, ip_address, status, reason, created_at)
            VALUES (?, ?, '127.0.0.1', 'SUCCESS', 'System Recovery', datetime('now'))
        `).run(user.id, user.email);
    }



    console.log('SUCCESS: Debug data seeded.');

} catch (error) {
    console.error('Seeding Failed:', error);
} finally {
    db.close();
}
