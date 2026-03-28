const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'pb_data', 'touch.db');
console.log('Opening DB at:', dbPath);

try {
    const db = new Database(dbPath);

    // Check current
    const current = db.prepare("SELECT value FROM settings WHERE key = 'kioskId'").get();
    console.log('Current ID:', current ? current.value : 'NOT SET');

    // Update to 123
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)");
    const now = new Date().toISOString();

    stmt.run('kioskId', '123', now, now);
    stmt.run('kioskName', 'Touch Kiosk', now, now);

    console.log('Updated kioskId to 123');

    // Verify
    const newVal = db.prepare("SELECT value FROM settings WHERE key = 'kioskId'").get();
    console.log('New ID:', newVal.value);

} catch (e) {
    console.error('Error:', e.message);
}
