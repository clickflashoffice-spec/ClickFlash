import { StressTestService } from "../services/StressTestService";
import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { logger } from "../utils/logger";

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

// Load from root env first
dotenv.config({ path: path.join(_dirname, "../../.env") });

// Target the CORRECT production database (two levels up from setup/)
const DB_FILE = path.join(_dirname, "../../pb_data/master.db");

async function runStress() {
  logger.info("========================================");
  logger.info("   CLICKFLASH STRESS TEST INJECTOR      ");
  logger.info("========================================");

  const count = parseInt(process.argv[2]) || 100;
  const siteCode = process.env.DESK_ID || "STRESS_SITE_01";

  logger.info(`[INIT] Target: ${siteCode}`);
  logger.info(`[INIT] Mode: Ingest ${count} simulated items`);
  logger.info(`[INIT] DB: ${DB_FILE}`);

  try {
    // Verify DB file exists
    if (!require("fs").existsSync(DB_FILE)) {
      throw new Error(`Database file not found: ${DB_FILE}`);
    }

    // Initialize Core Components
    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect(); // No migrations for stress test

    const logger = new Logger("STRESS-CLI");

    const stressService = new StressTestService(dbManager, logger);
    const result = await stressService.injectSimulatedPhotos(count, siteCode);

    logger.info(
      `\n[SUCCESS] Ingested ${result.count} items into album ${result.albumId}`,
    );

    dbManager.close();
    process.exit(0);
  } catch (err) {
    logger.error(`\n[FATAL] Stress test failed:`, err);
    process.exit(1);
  }
}

runStress();
