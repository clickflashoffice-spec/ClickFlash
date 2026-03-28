const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(__dirname, '..', '..', 'pb_data', 'master.db');
    console.log(`Opening DB at ${dbPath}`);
    const db = new Database(dbPath);

    console.log('--- FIXING ID MISMATCHES (GENERIC) ---');

    // 1. Fix Daily Objectives
    // Replace '.0' with empty string if it exists at the end
    const info1 = db.prepare("UPDATE daily_objectives SET photographer_id = REPLACE(photographer_id, '.0', '') WHERE photographer_id LIKE '%.0'").run();
    console.log(`Updated Daily Objectives (removed .0 suffix): ${info1.changes}`);

    // 2. Fix Login History
    const info2 = db.prepare("UPDATE login_history SET user_id = REPLACE(user_id, '.0', '') WHERE user_id LIKE '%.0'").run();
    console.log(`Updated Login History (removed .0 suffix): ${info2.changes}`);

    console.log('\n--- VERIFICATION ---');
    console.table(db.prepare('SELECT * FROM daily_objectives').all());

    // Check Karim specifically
    const karimObj = db.prepare("SELECT * FROM daily_objectives WHERE photographer_id = '7'").all();
    console.log('Karim Objectives (ID 7):');
    console.table(karimObj);

} catch (e) {
    console.error('Error:', e);
}
