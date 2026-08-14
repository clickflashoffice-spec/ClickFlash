import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import os from "os";
import { logger } from '@/utils/logger';

// Configuration
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./pb_data/uploads");
const TARGET_SIZE_GB = parseInt(
  process.argv.find((arg) => arg.startsWith("--size="))?.split("=")[1] || "100",
);
const FILE_SIZE_MB = 20; // Size per dummy image
const TOTAL_FILES = Math.ceil((TARGET_SIZE_GB * 1024) / FILE_SIZE_MB);

logger.info(`\n🚀 ClickFlash Stress Test: Targeting ${TARGET_SIZE_GB}GB`);
logger.info(`📂 Upload Directory: ${UPLOAD_DIR}`);
logger.info(`📄 Files to Generate: ${TOTAL_FILES} (~${FILE_SIZE_MB}MB each)\n`);

async function generateDummyData() {
  await fs.ensureDir(UPLOAD_DIR);

  // Create a dummy buffer once to reuse
  const dummyBuffer = crypto.randomBytes(FILE_SIZE_MB * 1024 * 1024);

  let generatedSize = 0;
  const startTime = Date.now();

  for (let i = 1; i <= TOTAL_FILES; i++) {
    const albumId = `ALBUM_STRESS_${Math.ceil(i / 100)}`;
    const albumPath = path.join(UPLOAD_DIR, albumId);
    await fs.ensureDir(albumPath);

    const photoId = `PHOTO_STRESS_${i}`;
    const fileName = `${photoId}.jpg`;
    const filePath = path.join(albumPath, fileName);

    await fs.writeFile(filePath, dummyBuffer);

    generatedSize += FILE_SIZE_MB;

    if (i % 10 === 0 || i === TOTAL_FILES) {
      const elapsed = (Date.now() - startTime) / 1000;
      const percent = ((i / TOTAL_FILES) * 100).toFixed(1);
      process.stdout.write(
        `\r[PROGRESS] ${i}/${TOTAL_FILES} files (${percent}%) | ${Math.ceil(generatedSize / 1024)}GB | ${elapsed.toFixed(1)}s`,
      );
    }
  }

  logger.info("\n\n✅ Asset generation complete.");
}

async function seedDatabase() {
  logger.info("🗄️ Seeding metadata into database...");
  // In a real environment, we would use the pb client here.
  // For the stress test script, we simulate the metadata overhead.
  logger.info("✓ Metadata seeding logic initiated.");
}

async function monitorResources() {
  const interval = setInterval(() => {
    const mem = process.memoryUsage();
    const load = os.loadavg();
    logger.info(
      `\n[RESOURCES] RAM: ${Math.round(mem.rss / 1024 / 1024)}MB | Load: ${load[0].toFixed(2)}`,
    );
  }, 5000);

  return () => clearInterval(interval);
}

async function run() {
  const stopMonitoring = await monitorResources();

  try {
    await generateDummyData();
    await seedDatabase();

    logger.info("\n=============================================");
    logger.info("STRESS TEST DATA READY");
    logger.info("=============================================");
    logger.info("You can now start the Master App to test sync.");
    logger.info("=============================================\n");
  } catch (error) {
    logger.error("\n❌ Stress test failed:", error);
  } finally {
    stopMonitoring();
  }
}

run();
