import { performance } from 'perf_hooks';

const WARMUP = 10;
const ITERATIONS = 100;
const DB_SIZE = 10000;
const DIM = 128;

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < DIM; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function runBenchmark() {
  console.log('👤 Face Vector Search Benchmark');
  console.log(`Warmup: ${WARMUP} | Iterations: ${ITERATIONS} | Index: ${DB_SIZE}`);
  
  const generateVector = () => {
    const vec = new Float32Array(DIM);
    for (let i = 0; i < DIM; i++) {
      vec[i] = Math.random() * 2 - 1;
    }
    return vec;
  };
  
  const index = Array.from({ length: DB_SIZE }, generateVector);
  
  const search = (query: Float32Array) => {
    let bestScore = -Infinity;
    let bestIdx = -1;
    for (let i = 0; i < DB_SIZE; i++) {
      const score = cosineSimilarity(query, index[i]);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  };
  
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    search(generateVector());
  }
  
  // Measure
  const timings: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const query = generateVector();
    const start = performance.now();
    search(query);
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
  console.log(`  Target P95: < 2000ms → ${p95 < 2000 ? '✅ PASS' : '❌ FAIL'}`);
  
  return { p50, p95, p99, passed: p95 < 2000 };
}

runBenchmark().then(r => process.exit(r.passed ? 0 : 1));
