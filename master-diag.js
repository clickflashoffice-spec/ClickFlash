const Database = require('better-sqlite3-multiple-ciphers');
const path = require('path');
const os = require('os');
const fs = require('fs');

const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const dbPath = path.join(appData, 'clickflash-master', 'pb_data', 'master.db');

console.log('--- ClickFlash Master Diagnosis ---');
console.log('Database Path:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('ERROR: Database file not found!');
    process.exit(1);
}

try {
    const db = new Database(dbPath);
    
    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`\nFound ${tables.length} tables in the database.`);
    
    // Check specific stats
    const usersCount = db.prepare("SELECT count(*) as count FROM users").get();
    const photosCount = db.prepare("SELECT count(*) as count FROM photos").get();
    const albumsCount = db.prepare("SELECT count(*) as count FROM albums").get();
    const ordersCount = db.prepare("SELECT count(*) as count FROM orders").get();
    
    console.log('\n--- Data Stats ---');
    console.log(`Users: ${usersCount.count}`);
    console.log(`Albums: ${albumsCount.count}`);
    console.log(`Photos: ${photosCount.count}`);
    console.log(`Orders: ${ordersCount.count}`);

    // Check Sync Queue or latest photos
    const recentPhotos = db.prepare("SELECT id, sync_status, created_at FROM photos ORDER BY created_at DESC LIMIT 5").all();
    console.log('\n--- Recent Photos ---');
    recentPhotos.forEach(p => {
        console.log(`Photo ${p.id}: sync_status=${p.sync_status}, created=${p.created_at}`);
    });

    db.close();
    console.log('\nDiagnosis completed successfully.');
} catch (err) {
    console.error('Database Error:', err.message);
}
