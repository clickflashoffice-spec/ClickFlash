import { performance } from 'perf_hooks';

const WARMUP = 10;
const ITERATIONS = 100;
const WIDTH = 512;
const HEIGHT = 512;

function computeLaplacianVariance(buffer: Uint8Array): number {
  let mean = 0;
  let count = 0;
  
  const laplacian = new Float32Array(WIDTH * HEIGHT);
  
  for (let y = 1; y < HEIGHT - 1; y++) {
    for (let x = 1; x < WIDTH - 1; x++) {
      const idx = y * WIDTH + x;
      const v = (
        buffer[idx - WIDTH] +
        buffer[idx + WIDTH] +
        buffer[idx - 1] +
        buffer[idx + 1] -
        4 * buffer[idx]
      );
      laplacian[idx] = v;
      mean += v;
      count++;
    }
  }
  
  mean /= count;
  let variance = 0;
  
  for (let y = 1; y < HEIGHT - 1; y++) {
    for (let x = 1; x < WIDTH - 1; x++) {
      const idx = y * WIDTH + x;
      const diff = laplacian[idx] - mean;
      variance += diff * diff;
    }
  }
  
  return variance / count;
}

async function runBenchmark() {
  console.log('🧠 AI Scoring (Laplacian Variance) Benchmark');
  console.log(`Warmup: ${WARMUP} | Iterations: ${ITERATIONS}`);
  
  const generateBuffer = () => {
    const buf = new Uint8Array(WIDTH * HEIGHT);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
    return buf;
  };
  
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    computeLaplacianVariance(generateBuffer());
  }
  
  // Measure
  const timings: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const buf = generateBuffer();
    const start = performance.now();
    computeLaplacianVariance(buf);
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
  console.log(`  Target P95: < 500ms → ${p95 < 500 ? '✅ PASS' : '❌ FAIL'}`);
  
  return { p50, p95, p99, passed: p95 < 500 };
}

runBenchmark().then(r => process.exit(r.passed ? 0 : 1));
