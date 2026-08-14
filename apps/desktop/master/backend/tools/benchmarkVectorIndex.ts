import { VectorIndexService } from "../services/VectorIndexService";
import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import path from "path";
import fs from "fs";
// removed extra import

const TEST_DB = path.join(process.cwd(), "pb_data", "test_benchmark.db");
const logger = new Logger(path.dirname(TEST_DB));
const db = new DatabaseManager(TEST_DB);

async function runBenchmark(count: number) {
  logger.info(`\n=== VectorIndex Benchmark: ${count} records ===`);

  // Cleanup
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  db.connect();

  const service = VectorIndexService.getInstance(db, logger);

  // 1. Generation
  console.time("Generation");
  const items = [];
  for (let i = 0; i < count; i++) {
    const vector = new Float32Array(128);
    for (let j = 0; j < 128; j++) vector[j] = Math.random();
    items.push({
      id: `photo_${i}`,
      title: `face_${i}`,
      vector,
    });
  }
  console.timeEnd("Generation");

  // 2. Build Tree
  console.time("Build Tree");
  // @ts-ignore
  service.root = service["buildVPTree"](items);
  // @ts-ignore
  service.isInitialized = true;
  console.timeEnd("Build Tree");

  // 3. Save (Binary)
  console.time("Persistence (Save Binary)");
  service.save();
  console.timeEnd("Persistence (Save Binary)");

  const binFile = path.join(process.cwd(), "pb_data", "face_vectors.bin");
  if (fs.existsSync(binFile)) {
    const stats = fs.statSync(binFile);
    logger.info(
      `Binary File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    );
  }

  // 4. Load (Binary)
  console.time("Persistence (Load Binary)");
  // @ts-ignore
  service["loadBinary"]();
  console.timeEnd("Persistence (Load Binary)");

  // 5. Search
  const query = new Float32Array(128);
  for (let j = 0; j < 128; j++) query[j] = Math.random();
  console.time("Search (Limit 20)");
  const results = service.search(query, 20, 0.6);
  console.timeEnd("Search (Limit 20)");
  logger.info(`Results found: ${results.length}`);

  // Memory usage
  const used = process.memoryUsage();
  logger.info(`Heap Used: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  db.close();
}

async function main() {
  await runBenchmark(10000);
  await runBenchmark(100000);
  // test 500k for scale
  await runBenchmark(500000);
}

main().catch(logger.error);
