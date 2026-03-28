
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'apps/master/pb_data/master.db');

console.log('--- Final Role Standardization ---');
if (!fs.existsSync(dbPath)) {
    console.error('Database file not found!');
    process.exit(1);
}

const db = new Database(dbPath);

try {
    db.transaction(() => {
        // 1. Fix User Role Casing
        const users = db.prepare("SELECT id, email, role FROM users").all();
        console.log('Current Users:', users);

        users.forEach(user => {
            const raw = user.role || '';
            let standardized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();

            // Handle special cases
            if (raw.toLowerCase().replace(/\s/g, '') === 'teamleader') {
                standardized = 'Team Leader';
            }

            if (standardized !== raw) {
                console.log(`Fixing role for ${user.email}: ${raw} -> ${standardized}`);
                db.prepare("UPDATE users SET role = ? WHERE id = ?").run(standardized, user.id);
            }
        });

        // 2. Fix role_permissions Casing
        const rolePerms = db.prepare("SELECT DISTINCT role FROM role_permissions").all();
        rolePerms.forEach(row => {
            const raw = row.role || '';
            let standardized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
            if (raw.toLowerCase().replace(/\s/g, '') === 'teamleader') {
                standardized = 'Team Leader';
            }

            if (standardized !== raw) {
                console.log(`Fixing permissions role: ${raw} -> ${standardized}`);
                // Move permissions from old to new, then delete old
                db.prepare("INSERT OR IGNORE INTO role_permissions (role, permission, created_at) SELECT ?, permission, created_at FROM role_permissions WHERE role = ?").run(standardized, raw);
                db.prepare("DELETE FROM role_permissions WHERE role = ?").run(raw);
            }
        });

        // 3. Ensure 'Admin' has manageSystemInfrastructure
        console.log('Ensuring Admin has manageSystemInfrastructure...');
        const hasPerm = db.prepare("SELECT 1 FROM role_permissions WHERE role = 'Admin' AND permission = 'manageSystemInfrastructure'").get();
        if (!hasPerm) {
            db.prepare("INSERT INTO role_permissions (role, permission, created_at) VALUES ('Admin', 'manageSystemInfrastructure', CURRENT_TIMESTAMP)").run();
            console.log('Added manageSystemInfrastructure to Admin.');
        } else {
            console.log('Admin already has the permission.');
        }
    })();

    console.log('Standardization complete.');

} catch (err) {
    console.error('Error:', err.message);
} finally {
    db.close();
}
