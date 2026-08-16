import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'pb_data', 'touch.db');
console.log(`[Check] Opening database at ${dbPath}`);

try {
    const db = new Database(dbPath, { readonly: true });

    // Check Settings
    const kioskId = db.prepare("SELECT value FROM settings WHERE key = 'kioskId'").get() as { value: string } | undefined;
    const kioskName = db.prepare("SELECT value FROM settings WHERE key = 'kioskName'").get() as { value: string } | undefined;

    console.log('\n--- Current Database Settings ---');
    console.log(`kioskId:   ${kioskId ? kioskId.value : '(missing)'}`);
    console.log(`kioskName: ${kioskName ? kioskName.value : '(missing)'}`);

    // Check Kiosks Table (for redundancy)
    const kiosks = db.prepare("SELECT * FROM kiosks").all();
    console.log(`\n--- Kiosks Table (${kiosks.length} records) ---`);
    kiosks.forEach(k => console.log(k));

    console.log('\n[Check] Validation Complete.');
} catch (error: unknown) {
    if (error instanceof Error) {
        console.error('[Check] Failed:', error.message);
    }
}
