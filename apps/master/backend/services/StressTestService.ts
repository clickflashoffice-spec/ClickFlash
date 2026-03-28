import { DatabaseManager } from "../shared/db";
import { v4 as uuidv4 } from "uuid";
import { Logger } from "../shared/logger";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "../config/constants";

export class StressTestService {
  private dbManager: DatabaseManager;
  private logger: Logger;

  constructor(dbManager: DatabaseManager, logger: Logger) {
    this.dbManager = dbManager;
    this.logger = logger;
  }

  /**
   * Generates a large number of dummy photos for stress testing sync.
   * @param count Number of photos to generate
   * @param siteCode Site code to associate with photos
   */
  async injectSimulatedPhotos(
    count: number,
    siteCode: string,
  ): Promise<{ albumId: string; count: number }> {
    const albumId = `stress_album_${uuidv4().substring(0, 8)}`;
    const date = new Date().toISOString().split("T")[0];

    // Create a stress test album
    try {
      await this.dbManager.run(
        "INSERT INTO albums (id, title, date, status, source) VALUES (?, ?, ?, ?, ?)",
        [albumId, `Stress Test Album ${date}`, date, "Published", "StressTest"],
      );
    } catch (e: any) {
      this.logger.error(`[STRESS] ERR: albums insert failed: ${e.message}`);
      throw e;
    }

    this.logger.info(
      `[STRESS] Injecting ${count} photos into album ${albumId}...`,
    );

    for (let i = 0; i < count; i++) {
      const photoId = `stress_photo_${uuidv4()}`;
      const filename = `stress_${i}.jpg`;
      const relativeUrl = `/uploads/${albumId}/highres/${filename}`;
      const url = relativeUrl;

      // Create physical dummy file for highres
      const absolutePath = path.join(UPLOAD_DIR, albumId, "highres", filename);
      const dirPath = path.dirname(absolutePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      // Write 1KB of dummy data
      fs.writeFileSync(absolutePath, Buffer.alloc(1024, "0"));

      // Create physical dummy file for preview
      const previewFilename = filename.replace(/\.[^.]+$/, "_preview_wm.webp");
      const previewAbsolutePath = path.join(
        UPLOAD_DIR,
        albumId,
        "thumbs",
        previewFilename,
      );
      const previewDirPath = path.dirname(previewAbsolutePath);
      if (!fs.existsSync(previewDirPath)) {
        fs.mkdirSync(previewDirPath, { recursive: true });
      }
      // Write 1KB of dummy data
      fs.writeFileSync(previewAbsolutePath, Buffer.alloc(1024, "0"));

      try {
        // Photos table
        await this.dbManager.run(
          "INSERT INTO photos (id, albumId, title, url, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [
            photoId,
            albumId,
            `Photo ${i}`,
            url,
            "available",
            new Date().toISOString(),
          ],
        );

        // Retention queue
        await this.dbManager.run(
          "INSERT INTO retention_queue (album_id, asset_id, status, created_at) VALUES (?, ?, ?, ?)",
          [albumId, photoId, "pending", new Date().toISOString()],
        );
      } catch (e: any) {
        this.logger.error(
          `[STRESS] ERR: photo ${i} insert failed: ${e.message}`,
        );
        throw e;
      }

      if (i > 0 && i % 100 === 0) {
        this.logger.info(`[STRESS] Injected ${i}/${count}...`);
      }
    }

    return { albumId, count };
  }
}

export default StressTestService;
