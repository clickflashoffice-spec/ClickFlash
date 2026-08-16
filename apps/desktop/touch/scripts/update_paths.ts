import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'pb_data', 'touch.db');
const db = new Database(dbPath);

const targetOrdersFolder = "E:\\ClickFlash\\apps\\touch\\pb_data\\orders";
const targetImportFolder = "E:\\ClickFlash\\apps\\touch\\pb_data\\uploads";

function updateSetting(key: string, value: string) {
    const exists = db.prepare("SELECT key FROM settings WHERE key = ?").get(key);
    if (exists) {
        db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(value, key);
        console.log(`Updated ${key} to ${value}`);
    } else {
        db.prepare("INSERT INTO settings (id, key, value) VALUES (?, ?, ?)").run(crypto.randomUUID(), key, value);
        console.log(`Inserted ${key} with ${value}`);
    }
}

try {
    updateSetting('touchOrdersFolder', targetOrdersFolder);
    updateSetting('photoImportFolder', targetImportFolder);
    console.log("Database settings updated successfully.");
} catch (error: unknown) {
    console.error("Error updating settings:", error);
} finally {
    db.close();
}
