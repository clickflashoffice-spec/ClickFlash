import DatabaseManager from "../shared/db";
import { Logger } from "../shared/logger";
import AlbumService from "./albumService";
import path from "path";

async function verifyIngestion() {
  const DATA_DIR = path.resolve(process.cwd(), "pb_data");
  const dbManager = new DatabaseManager(path.join(DATA_DIR, "master.db"));
  const logger = new Logger(DATA_DIR);
  const albumService = new AlbumService({ dbManager, logger });

  console.log("--- Ingestion Consistency Verification ---");

  const TEST_ALBUM = "verify_ingest_1492";
  const TEST_PHOTO = "verify_photo_1492";

  // 1. Setup Test Album
  albumService.createAlbum({
    id: TEST_ALBUM,
    title: "Verification Album",
    photographerId: "admin",
  });

  // 2. Test registerPhoto (Simulation of Folder Monitor or API)
  console.log("[Test] Registering photo...");
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
    console.log("✅ SUCCESS: Photographer ID inherited from album.");
  } else {
    console.log("❌ FAILED: Photographer ID missing or incorrect.", photo);
  }

  if (photo && photo.created_at) {
    console.log("✅ SUCCESS: Timestamps automatically generated.");
  }

  const album = dbManager.get<{ coverPhotoUrl: string }>(
    "SELECT coverPhotoUrl FROM albums WHERE id = ?",
    [TEST_ALBUM],
  );

  if (album && album.coverPhotoUrl === "/test/path.jpg") {
    console.log("✅ SUCCESS: Album cover automatically assigned.");
  } else {
    console.log("❌ FAILED: Album cover not assigned.", album);
  }

  // Cleanup
  dbManager.run("DELETE FROM photos WHERE id = ?", [TEST_PHOTO]);
  dbManager.run("DELETE FROM albums WHERE id = ?", [TEST_ALBUM]);
  console.log("--- Verification Complete ---");
}

verifyIngestion();
