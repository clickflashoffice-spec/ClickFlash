// benchmark-jwt.js
// Updated to use jose instead of @tsndr/cloudflare-worker-jwt.
async function runBenchmark() {
    const { SignJWT, jwtVerify } = await import('jose');

    const encoder = new TextEncoder();
    const secretKey = encoder.encode('benchmark_secret_2026');
    const payload = { desk_id: 'site_alpha', role: 'Admin' };

    console.log('--- JWT HS256 Performance Benchmark ---');
    const start = Date.now();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('1h')
            .sign(secretKey);
        await jwtVerify(token, secretKey);
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

runBenchmark().catch(console.error);
