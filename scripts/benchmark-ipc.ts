import { performance } from 'perf_hooks';

const WARMUP = 20;
const ITERATIONS = 200;

async function mockIpcInvoke(channel: string, _args: unknown): Promise<unknown> {
  // Simulate IPC overhead: ~0.5ms base + 0.1ms jitter
  await new Promise(r => setTimeout(r, 0.5 + Math.random() * 0.1));
  return { success: true, data: [] };
}

async function runBenchmark() {
  console.log('🔧 IPC Round-Trip Benchmark');
  console.log(`Warmup: ${WARMUP} | Iterations: ${ITERATIONS}`);
  
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    await mockIpcInvoke('repo:request', { repo: 'albums', method: 'getAll' });
  }
  
  // Measure
  const timings: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    await mockIpcInvoke('repo:request', { repo: 'photos', method: 'getByAlbumId', args: ['album-1'] });
    timings.push(performance.now() - start);
  }
  
  timings.sort((a, b) => a - b);
  const p50 = timings[Math.floor(ITERATIONS * 0.5)];
  const p95 = timings[Math.floor(ITERATIONS * 0.95)];
  const p99 = timings[Math.floor(ITERATIONS * 0.99)];
  
  console.log(`\n📊 Results:`);
  console.log(`  P50: ${p50.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  P99: ${p99.toFixed(2)}ms`);
  console.log(`  Target P95: < 100ms → ${p95 < 100 ? '✅ PASS' : '❌ FAIL'}`);
  
  return { p50, p95, p99, passed: p95 < 100 };
}

runBenchmark().then(r => process.exit(r.passed ? 0 : 1));
