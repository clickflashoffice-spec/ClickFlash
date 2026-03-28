import http from 'http';

const MASTER_URL = 'http://localhost:8090';
const NUM_CLIENTS = 5;
const DURATION_MS = 10000; // 10 seconds
const REQUEST_INTERVAL_MS = 500; // 2 requests per second per client

interface Stats {
    totalRequests: number;
    success: number;
    failed: number;
    totalLatency: number;
}

const stats: Stats = {
    totalRequests: 0,
    success: 0,
    failed: 0,
    totalLatency: 0
};

function makeRequest(kioskId: string): Promise<void> {
    return new Promise((resolve) => {
        const start = Date.now();
        const data = JSON.stringify({
            kioskId,
            status: 'Active',
            version: '1.0.0'
        });

        const req = http.request(`${MASTER_URL}/api/system/kiosk/heartbeat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            const latency = Date.now() - start;
            stats.totalRequests++;
            stats.totalLatency += latency;

            if (res.statusCode === 200) {
                stats.success++;
            } else {
                stats.failed++;
                console.error(`[${kioskId}] Failed: ${res.statusCode}`);
            }
            res.resume(); // Consume response
            resolve();
        });

        req.on('error', (e) => {
            const latency = Date.now() - start;
            stats.totalRequests++;
            stats.totalLatency += latency;
            stats.failed++;
            console.error(`[${kioskId}] Error: ${e.message}`);
            resolve();
        });

        req.write(data);
        req.end();
    });
}

async function runClient(id: number) {
    const kioskId = `BENCHMARK_KIOSK_${id}`;
    const endTime = Date.now() + DURATION_MS;

    console.log(`[Client ${id}] Starting...`);

    while (Date.now() < endTime) {
        await makeRequest(kioskId);
        await new Promise(r => setTimeout(r, REQUEST_INTERVAL_MS));
    }
    console.log(`[Client ${id}] Finished.`);
}

async function main() {
    console.log(`Starting Benchmark: ${NUM_CLIENTS} clients, ${DURATION_MS / 1000}s duration...`);

    const clients = [];
    for (let i = 0; i < NUM_CLIENTS; i++) {
        clients.push(runClient(i + 1));
    }

    await Promise.all(clients);

    console.log('\n=== Benchmark Results ===');
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Success: ${stats.success}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Avg Latency: ${(stats.totalLatency / stats.totalRequests).toFixed(2)}ms`);
    console.log(`Requests/Sec: ${(stats.totalRequests / (DURATION_MS / 1000)).toFixed(2)}`);
}

main().catch(console.error);
