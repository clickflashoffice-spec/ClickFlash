import { VectorIndexService } from './apps/master/backend/services/VectorIndexService';
import fs from 'fs';
import path from 'path';

const logFile = 'verify_results.log';
function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function verify() {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    log('--- VP-Tree Face Index Verification ---');

    const pbDataDir = path.resolve(process.cwd(), 'pb_data');
    if (!fs.existsSync(pbDataDir)) fs.mkdirSync(pbDataDir);

    const mockDb = { query: () => [] } as any;
    const mockLogger = { info: log, error: log } as any;

    const index = VectorIndexService.getInstance(mockDb, mockLogger);

    log('Generating 10,000 simulated face descriptors...');
    const startTime = Date.now();
    for (let i = 0; i < 10000; i++) {
        const vector = Array.from({ length: 128 }, () => Math.random());
        index.addFace(`photo-${i}`, `face-${i}`, vector);
    }
    log(`Insertion of 10k vectors took: ${Date.now() - startTime}ms`);

    log('Testing search performance (100 searches with 10k library)...');
    const searchTimes: number[] = [];
    for (let i = 0; i < 100; i++) {
        const probe = Array.from({ length: 128 }, () => Math.random());
        const sStart = performance.now();
        index.search(probe, 50);
        searchTimes.push(performance.now() - sStart);
    }
    const avgSearch = searchTimes.reduce((a, b) => a + b) / searchTimes.length;
    log(`Average search time: ${avgSearch.toFixed(2)}ms`);

    log('Testing persistence...');
    index.save();
    const indexPath = path.join(pbDataDir, 'face_vectors.json');
    if (fs.existsSync(indexPath)) {
        const stats = fs.statSync(indexPath);
        log(`Index saved to ${indexPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
        log('Persistence failed: Index file not found!');
    }

    log('Verification Complete.');
    process.exit(0);
}

verify().catch((e) => log('ERROR: ' + e.message));
