import { logger } from '@/utils/logger';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const DatabaseManager =
  require("../shared/db").default || require("../shared/db");
const Logger = require("../shared/logger").Logger;
const AlbumService =
  require("./albumService").default || require("./albumService");
const path = require("path");

async function verifyIngestion() {
  logger.info("--- Ingestion Consistency Verification (JS) ---");

  // Setup paths manually to ensure they are correct in this environment
  const DATA_DIR = path.resolve(_dirname, "../../pb_data");
  const DB_FILE = path.join(DATA_DIR, "master.db");

  logger.info(`Using Database: ${DB_FILE}`);

  const dbManager = new DatabaseManager(DB_FILE);
  dbManager.connect(); // Ensure connected

  const logger = new Logger(DATA_DIR);
  const albumService = new AlbumService({ dbManager, logger });

  const TEST_ALBUM = "verify_ingest_js_1492";
  const TEST_PHOTO = "verify_photo_js_1492";

  try {
    // 1. Setup Test Album
    logger.info("[Test] Creating album...");
    albumService.createAlbum({
      id: TEST_ALBUM,
      title: "Verification Album JS",
      photographerId: "admin_js",
    });

    // 2. Test registerPhoto
    logger.info("[Test] Registering photo...");
    albumService.registerPhoto({
      id: TEST_PHOTO,
      albumId: TEST_ALBUM,
      url: "/test/path_js.jpg",
      title: "Test Photo JS",
    });

    // 3. Verify Result
    const photo = dbManager.get(
      "SELECT photographerId, created_at FROM photos WHERE id = ?",
      [TEST_PHOTO],
    );

    if (photo && photo.photographerId === "admin_js") {
      logger.info("✅ SUCCESS: Photographer ID inherited from album.");
    } else {
      logger.info("❌ FAILED: Photographer ID missing or incorrect.", photo);
    }

    if (photo && photo.created_at) {
      logger.info("✅ SUCCESS: Timestamps automatically generated.");
    }

    const album = dbManager.get(
      "SELECT coverPhotoUrl FROM albums WHERE id = ?",
      [TEST_ALBUM],
    );

    if (album && album.coverPhotoUrl === "/test/path_js.jpg") {
      logger.info("✅ SUCCESS: Album cover automatically assigned.");
    } else {
      logger.info("❌ FAILED: Album cover not assigned.", album);
    }
  } catch (err) {
    logger.error("❌ ERROR during verification:", err.message);
  } finally {
    // Cleanup
    logger.info("[Cleanup] Removing test records...");
    dbManager.run("DELETE FROM photos WHERE id = ?", [TEST_PHOTO]);
    dbManager.run("DELETE FROM albums WHERE id = ?", [TEST_ALBUM]);
  }

  logger.info("--- Verification Complete ---");
}

verifyIngestion();
