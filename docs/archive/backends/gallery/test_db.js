/**
 * Database Test Script
 * Simple test script to verify database connection and basic CRUD operations
 * 
 * @module test_db
 */

const DatabaseManager = require('./db');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, '../pb_data/data.db');
const dbManager = new DatabaseManager(DB_FILE);

try {
    console.log("Connecting...");
    dbManager.connect();
    console.log("Connected.");

    const table = 'users';
    const data = {
        // id: auto-increment
        name: 'Debug User',
        email: 'debug@example.com'
    };

    console.log("Inserting...", data);

    const keys = Object.keys(data);
    const cols = keys.join(', ');
    const vals = keys.map(k => `@${k}`).join(', ');
    const sql = `INSERT INTO ${table} (${cols}) VALUES (${vals})`;

    console.log("SQL:", sql);

    const info = dbManager.run(sql, data);
    console.log("Insert success. Info:", info);

    const newId = info.lastInsertRowid;
    const row = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [newId]);
    console.log("Fetched:", row);

} catch (e) {
    console.error("Test Failed:", e);
}
