const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const db = new Database('apps/master/pb_data/master.db');

// Check if users table exists
const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
console.log('Users table exists:', !!table);

if (!table) {
    console.log('Creating users table...');
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'Photographer',
            password_must_change INTEGER DEFAULT 0,
            created TEXT DEFAULT CURRENT_TIMESTAMP,
            updated TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// Create admin user
const hashedPassword = bcrypt.hashSync('DEFAULT_PASSWORD_PLACEHOLDER', 10);
console.log('Password hash created');

try {
    // Try to insert
    const result = db.prepare(`
        INSERT INTO users (id, name, email, password, role, password_must_change, created, updated)
        VALUES ('default-admin', 'Admin', 'alaeddine@example.com', ?, 'Admin', 0, datetime('now'), datetime('now'))
    `).run(hashedPassword);
    console.log('User created, changes:', result.changes);
} catch(e) {
    // If exists, update
    if (e.message.includes('UNIQUE constraint failed')) {
        console.log('User exists, updating password...');
        const result = db.prepare(`
            UPDATE users SET password = ?, updated = datetime('now') WHERE email = ?
        `).run(hashedPassword, 'alaeddine@example.com');
        console.log('User updated, changes:', result.changes);
    } else {
        console.error('Error:', e.message);
    }
}

// Verify
const user = db.prepare('SELECT * FROM users WHERE email=?').get('alaeddine@example.com');
console.log('User found:', !!user);
if(user) {
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
}

db.close();
console.log('Done!');
