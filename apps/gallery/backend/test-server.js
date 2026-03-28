/**
 * Server Test Script
 * Tests basic server creation and database connection
 * 
 * @module test-server
 */

const http = require('http');
const DatabaseManager = require('./db');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../pb_data');
const DB_FILE = path.join(DATA_DIR, 'data.db');

console.log('Testing database connection...');
const dbManager = new DatabaseManager(DB_FILE);

try {
    dbManager.connect();
    console.log('Database connected successfully!');

    console.log('Testing server creation...');
    const server = http.createServer((req, res) => {
        res.writeHead(200);
        res.end('OK');
    });

    console.log('Attempting to listen on port 8090...');
    server.listen(8090, '0.0.0.0', () => {
        console.log('Server started successfully on port 8090!');
        server.close();
        console.log('Test completed successfully!');
        process.exit(0);
    });

    server.on('error', (err) => {
        console.error('Server error:', err);
        process.exit(1);
    });

} catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
}
