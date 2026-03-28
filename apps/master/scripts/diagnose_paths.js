
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../pb_data/master.db');
const db = new Database(DB_PATH);

console.log('--- DIAGNOSTIC: Current DB Paths ---');

const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'network_settings'").get();
if (settingsRow) {
    console.log('[Global Settings] ', settingsRow.value);
} else {
    console.log('[Global Settings] network_settings key not found');
}

const kiosks = db.prepare("SELECT id, uploadFolderPath, ordersFolderPath, settings FROM kiosks").all();
console.log(`[Kiosks] Found ${kiosks.length} kiosks.`);
kiosks.forEach(k => {
    console.log(`Kiosk ${k.id}:`);
    console.log(`  Upload: ${k.uploadFolderPath}`);
    console.log(`  Orders: ${k.ordersFolderPath}`);
    console.log(`  Settings: ${k.settings}`);
});
