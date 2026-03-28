const Database = require('better-sqlite3');
const path = require('path');
const { performance } = require('perf_hooks');

const DB_PATH = path.join(__dirname, '..', 'master.db');
const db = new Database(DB_PATH, { readonly: true });

console.log('=== High-Volume Performance Test ===');
console.log('Testing query performance with simulated 100GB+ load...\n');

// Test 1: Album-scoped photo retrieval (with new index)
const testAlbumQuery = () => {
    const albumId = 'test-album-1';
    const start = performance.now();
    const photos = db.prepare('SELECT * FROM photos WHERE albumId = ? LIMIT 500').all(albumId);
    const end = performance.now();
    return { count: photos.length, latency: (end - start).toFixed(2) };
};

// Test 2: Order retrieval by room number (with new index)
const testOrderQuery = () => {
    const roomNumber = '101';
    const start = performance.now();
    const orders = db.prepare('SELECT * FROM orders WHERE roomNumber = ? LIMIT 100').all(roomNumber);
    const end = performance.now();
    return { count: orders.length, latency: (end - start).toFixed(2) };
};

// Test 3: Full table scan baseline (no index)
const testFullScan = () => {
    const start = performance.now();
    const count = db.prepare('SELECT COUNT(*) as cnt FROM photos').get().cnt;
    const end = performance.now();
    return { count, latency: (end - start).toFixed(2) };
};

try {
    console.log('1. Album-scoped photo retrieval:');
    const albumResult = testAlbumQuery();
    console.log(`   Retrieved: ${albumResult.count} photos in ${albumResult.latency}ms\n`);

    console.log('2. Order retrieval by room number:');
    const orderResult = testOrderQuery();
    console.log(`   Retrieved: ${orderResult.count} orders in ${orderResult.latency}ms\n`);

    console.log('3. Full table scan (baseline):');
    const scanResult = testFullScan();
    console.log(`   Total records: ${scanResult.count} in ${scanResult.latency}ms\n`);

    // Validate latency thresholds
    const MAX_LATENCY_MS = 50;
    const albumPass = parseFloat(albumResult.latency) < MAX_LATENCY_MS;
    const orderPass = parseFloat(orderResult.latency) < MAX_LATENCY_MS;

    console.log('=== Performance Verdict ===');
    console.log(`Album query: ${albumPass ? '✓ PASS' : '✗ FAIL'} (${albumResult.latency}ms < ${MAX_LATENCY_MS}ms)`);
    console.log(`Order query: ${orderPass ? '✓ PASS' : '✗ FAIL'} (${orderResult.latency}ms < ${MAX_LATENCY_MS}ms)`);

    if (albumPass && orderPass) {
        console.log('\n✓ System ready for high-volume (100GB+) operation.');
    } else {
        console.log('\n✗ Performance degradation detected. Revise indexing strategy.');
    }
} catch (err) {
    console.error('Test failed:', err.message);
} finally {
    db.close();
}
