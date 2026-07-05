import DatabaseManager from '../database/db';
import { Logger } from '../utils/logger';
import AlbumService from "./albumService";
import path from "path";

async function verifyIngestion() {
  const DATA_DIR = path.resolve(process.cwd(), "pb_data");
  const dbManager = new DatabaseManager(path.join(DATA_DIR, "master.db"));
  const logger = new Logger(DATA_DIR);
  const albumService = new AlbumService({ dbManager, logger });

  logger.info("--- Ingestion Consistency Verification ---");

  const TEST_ALBUM = "verify_ingest_1492";
  const TEST_PHOTO = "verify_photo_1492";

  // 1. Setup Test Album
  albumService.createAlbum({
    id: TEST_ALBUM,
    title: "Verification Album",
    photographerId: "admin",
  });

  // 2. Test registerPhoto (Simulation of Folder Monitor or API)
  logger.info("[Test] Registering photo...");
  albumService.registerPhoto({
    id: TEST_PHOTO,
    albumId: TEST_ALBUM,
    url: "/test/path.jpg",
    title: "Test Photo",
  });

  // 3. Verify Result
  const photo = dbManager.get<{
    photographerId: string | number;
    created_at: string;
  }>("SELECT photographerId, created_at FROM photos WHERE id = ?", [
    TEST_PHOTO,
  ]);

  if (photo && photo.photographerId === "admin") {
    logger.info("✅ SUCCESS: Photographer ID inherited from album.");
  } else {
    logger.info("❌ FAILED: Photographer ID missing or incorrect.", photo);
  }

  if (photo && photo.created_at) {
    logger.info("✅ SUCCESS: Timestamps automatically generated.");
  }

  const album = dbManager.get<{ coverPhotoUrl: string }>(
    "SELECT coverPhotoUrl FROM albums WHERE id = ?",
    [TEST_ALBUM],
  );

  if (album && album.coverPhotoUrl === "/test/path.jpg") {
    logger.info("✅ SUCCESS: Album cover automatically assigned.");
  } else {
    logger.info("❌ FAILED: Album cover not assigned.", album);
  }

  // Cleanup
  dbManager.run("DELETE FROM photos WHERE id = ?", [TEST_PHOTO]);
  dbManager.run("DELETE FROM albums WHERE id = ?", [TEST_ALBUM]);
  logger.info("--- Verification Complete ---");
}

verifyIngestion();
