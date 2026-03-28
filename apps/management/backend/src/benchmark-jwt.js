// benchmark-jwt.js
import { sign, verify } from '@tsndr/cloudflare-worker-jwt';

const JWT_SECRET = 'benchmark_secret_2026';
const payload = { desk_id: 'site_alpha', role: 'Admin', exp: Math.floor(Date.now() / 1000) + 3600 };

async function runBenchmark() {
    console.log('--- JWT RS256 Performance Benchmark ---');
    const start = Date.now();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
        const token = await sign(payload, JWT_SECRET);
        await verify(token, JWT_SECRET);
    }

    const end = Date.now();
    const total = end - start;
    const avg = total / iterations;

    console.log(`Total Time for ${iterations} ops: ${total}ms`);
    console.log(`Average Latency: ${avg.toFixed(2)}ms`);

    if (avg < 50) {
        console.log('RESULT: PASS (Performance within target)');
    } else {
        console.log('RESULT: FAIL (Latency above 50ms threshold)');
    }
}

runBenchmark();
