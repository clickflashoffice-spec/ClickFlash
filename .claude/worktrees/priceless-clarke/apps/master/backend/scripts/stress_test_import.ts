
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:8090';
const CONCURRENCY = 100;

async function runStressTest() {
    console.log(`Starting Stress Test: ${CONCURRENCY} concurrent uploads...`);

    const results = {
        startTime: new Date().toISOString(),
        concurrency: CONCURRENCY,
        albumId: 'stress_test_' + Date.now(),
        successCount: 0,
        failCount: 0,
        errors: [] as string[],
        memoryHistory: [] as any[],
        totalTimeMs: 0
    };

    const startTs = Date.now();

    try {
        // 1. Create Album
        const albumBody = {
            id: results.albumId,
            title: 'Stress Test Album',
            date: new Date().toISOString().split('T')[0],
            status: 'Draft'
        };

        const albumRes = await fetch(`${API_URL}/api/collections/albums/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(albumBody)
        });

        if (!albumRes.ok) {
            throw new Error(`Failed to create album: ${albumRes.status}`);
        }

        // 2. Prepare Dummy File
        const dummyPath = path.join(__dirname, 'stress_dummy.txt');
        fs.writeFileSync(dummyPath, 'stress test content '.repeat(100));

        // 3. Batch Uploads
        const uploadPromises = [];
        for (let i = 0; i < CONCURRENCY; i++) {
            const p = (async (idx) => {
                try {
                    const form = new FormData();
                    form.append('albumId', results.albumId);
                    form.append('id', `photo_${results.albumId}_${idx}`);
                    form.append('title', `Stress Photo ${idx}`);
                    form.append('url', fs.createReadStream(dummyPath), `stress_${idx}.jpg`);

                    const res = await fetch(`${API_URL}/api/collections/photos/records`, {
                        method: 'POST',
                        body: form
                    });

                    if (res.ok) {
                        results.successCount++;
                    } else {
                        results.failCount++;
                        const text = await res.text();
                        results.errors.push(`[Photo ${idx}] ${res.status}: ${text}`);
                    }
                } catch (err: any) {
                    results.failCount++;
                    results.errors.push(`[Photo ${idx}] Error: ${err.message}`);
                }

                if (idx % 10 === 0) {
                    results.memoryHistory.push({
                        idx,
                        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                        heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
                    });
                }
            })(i);
            uploadPromises.push(p);
        }

        await Promise.all(uploadPromises);
        fs.unlinkSync(dummyPath);

    } catch (e: any) {
        results.errors.push(`Global Error: ${e.message}`);
    }

    results.totalTimeMs = Date.now() - startTs;
    results.memoryHistory.push({
        final: true,
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });

    fs.writeFileSync(path.join(__dirname, '../audit_results.json'), JSON.stringify(results, null, 2));
}

runStressTest();
