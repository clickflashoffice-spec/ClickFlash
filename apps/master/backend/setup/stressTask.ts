import { StressTestService } from "../services/StressTestService";
import { DatabaseManager } from "../shared/db";
import { Logger } from "../shared/logger";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load from root env first
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Target the CORRECT production database (two levels up from setup/)
const DB_FILE = path.join(__dirname, "../../pb_data/master.db");

async function runStress() {
  console.log("========================================");
  console.log("   CLICKFLASH STRESS TEST INJECTOR      ");
  console.log("========================================");

  const count = parseInt(process.argv[2]) || 100;
  const siteCode = process.env.DESK_ID || "STRESS_SITE_01";

  console.log(`[INIT] Target: ${siteCode}`);
  console.log(`[INIT] Mode: Ingest ${count} simulated items`);
  console.log(`[INIT] DB: ${DB_FILE}`);

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

    console.log(
      `\n[SUCCESS] Ingested ${result.count} items into album ${result.albumId}`,
    );

    dbManager.close();
    process.exit(0);
  } catch (err) {
    console.error(`\n[FATAL] Stress test failed:`, err);
    process.exit(1);
  }
}

runStress();
