const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'pb_data', 'data.db');
const db = new Database(dbPath);

const destination = {
    id: 'local_master_8090',
    name: 'Local Master App',
    country: 'Localhost',
    type: 'Resort',
    licenseKey: 'LOCAL-DEV-001',
    featuresJSON: JSON.stringify({ ai: true, face: true, watermark: true }),
    uRL: 'http://127.0.0.1:8090', // Assuming 'uRL' or 'ip' field exists, guessing based on context
    created: new Date().toISOString(),
    updated: new Date().toISOString()
};

const tableInfo = db.pragma('table_info(destinations)');
console.log('Destinations Table Schema:', tableInfo);

try {
    const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO destinations (id, name, country, type, licenseKey, featuresJSON, created_at)
        VALUES (@id, @name, @country, @type, @licenseKey, @featuresJSON, @created)
    `);

    const info = insertStmt.run(destination);
    console.log('Insert Success:', info);
} catch (e) {
    console.error('Insert Failed:', e);
}
