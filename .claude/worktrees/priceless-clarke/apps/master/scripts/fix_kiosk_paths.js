
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../pb_data/master.db');
const db = new Database(DB_PATH);

console.log('--- Fixing Kiosk Paths in DB ---');

// 1. Fix Global Settings
const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'network_settings'").get();
if (settingsRow) {
    try {
        let settings = JSON.parse(settingsRow.value);
        let changed = false;

        if (settings.touchSharedImportFolder && settings.touchSharedImportFolder.includes('\\touch\\')) {
            console.log(`[Settings] Fix needed for touchSharedImportFolder: ${settings.touchSharedImportFolder}`);
            settings.touchSharedImportFolder = settings.touchSharedImportFolder.replace('\\touch\\', '\\touch app\\');
            changed = true;
        }

        if (changed) {
            db.prepare("UPDATE settings SET value = ? WHERE key = 'network_settings'").run(JSON.stringify(settings));
            console.log(`[Settings] Updated network_settings: ${settings.touchSharedImportFolder}`);
        } else {
            console.log('[Settings] network_settings appeared correct or did not match pattern.');
        }
    } catch (e) {
        console.error('[Settings] Failed to parse network_settings', e);
    }
}

// 2. Fix Kiosk Specific Settings
const kiosks = db.prepare("SELECT id, settings, uploadFolderPath, ordersFolderPath FROM kiosks").all();
kiosks.forEach(kiosk => {
    let updateNeeded = false;
    let newUploadPath = kiosk.uploadFolderPath;
    let newOrdersPath = kiosk.ordersFolderPath;

    if (newUploadPath && newUploadPath.includes('\\touch\\')) {
        newUploadPath = newUploadPath.replace('\\touch\\', '\\touch app\\');
        updateNeeded = true;
    }

    if (newOrdersPath && newOrdersPath.includes('\\touch\\')) {
        newOrdersPath = newOrdersPath.replace('\\touch\\', '\\touch app\\');
        updateNeeded = true;
    }

    // Check JSON settings
    let newSettings = kiosk.settings;
    if (newSettings) {
        try {
            let s = typeof newSettings === 'string' ? JSON.parse(newSettings) : newSettings;
            let sChanged = false;
            if (s.touchImportPath && s.touchImportPath.includes('\\touch\\')) {
                s.touchImportPath = s.touchImportPath.replace('\\touch\\', '\\touch app\\');
                sChanged = true;
            }
            if (s.uploadFolderPath && s.uploadFolderPath.includes('\\touch\\')) {
                s.uploadFolderPath = s.uploadFolderPath.replace('\\touch\\', '\\touch app\\');
                sChanged = true;
            }

            if (sChanged) {
                newSettings = JSON.stringify(s);
                updateNeeded = true;
            }
        } catch (e) { }
    }

    if (updateNeeded) {
        db.prepare(`UPDATE kiosks SET uploadFolderPath = ?, ordersFolderPath = ?, settings = ? WHERE id = ?`)
            .run(newUploadPath, newOrdersPath, newSettings, kiosk.id);
        console.log(`[Kiosk] Updated paths for Kiosk ${kiosk.id}`);
    }
});

console.log('--- DB Fix Complete ---');
