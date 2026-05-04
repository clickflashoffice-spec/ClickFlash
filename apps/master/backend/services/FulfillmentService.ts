import fs from "fs-extra";
import path from "path";
// @ts-ignore — archiver has no @types package; treat as any
import archiver from "archiver";
import { DatabaseManager } from "../shared/db";
import { Logger } from "../shared/logger";
import { PhotoProcessor } from "../shared/photoProcessor";
import { UPLOAD_DIR, DATA_DIR } from "../config/constants";

export class FulfillmentService {
  private db: DatabaseManager;
  private logger: Logger;
  private photoProcessor: PhotoProcessor;
  private tempDir: string;

  constructor(
    db: DatabaseManager,
    logger: Logger,
    photoProcessor: PhotoProcessor,
  ) {
    this.db = db;
    this.logger = logger;
    this.photoProcessor = photoProcessor;
    this.tempDir = path.join(DATA_DIR, "temp_fulfillment");

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Processes a single photo applying all non-destructive edits and scaling them to hi-res.
   * Returns the path to the processed temporary file.
   */
  public async processSinglePhoto(photoId: string): Promise<string> {
    // 1. Fetch photo and its edits
    const photo = this.db.get<any>(
      "SELECT url, originalFilename, manualEdits, width, height FROM photos WHERE id = ?",
      [photoId],
    );

    if (!photo) {
      throw new Error(`Photo ${photoId} not found in database.`);
    }

    const fullPath = path.join(UPLOAD_DIR, photo.url);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing source file: ${fullPath}`);
    }

    // 2. Parse Edits
    let edits: any = {};
    try {
      edits =
        typeof photo.manualEdits === "string"
          ? JSON.parse(photo.manualEdits)
          : photo.manualEdits || {};
    } catch (e) {
      this.logger.warn(
        `[FulfillmentService] Failed to parse edits for photo ${photoId}`,
      );
    }

    // 3. Resolution Independent Scaling
    if (edits.retouchActions && edits.retouchActions.length > 0) {
      const previewLongestSide = 2048;
      const scale = Math.min(
        previewLongestSide / photo.width,
        previewLongestSide / photo.height,
        1,
      );
      const previewW = photo.width * scale;
      const previewH = photo.height * scale;

      const scaleX = photo.width / previewW;
      const scaleY = photo.height / previewH;
      const radiusScale = Math.min(scaleX, scaleY);

      edits.retouchActions = edits.retouchActions.map((action: any) => ({
        ...action,
        x: action.x * scaleX,
        y: action.y * scaleY,
        radius: action.radius * radiusScale,
        sourceX: action.sourceX ? action.sourceX * scaleX : undefined,
        sourceY: action.sourceY ? action.sourceY * scaleY : undefined,
      }));
    }

    // 4. Destination for processed file
    const processedPath = path.join(
      this.tempDir,
      `${photoId}_fulfilled_${Date.now()}.jpg`,
    );

    this.logger.info(
      `[FulfillmentService] Processing ${photoId} with edits...`,
    );

    // 5. Apply all edits via PhotoProcessor (distributed workers)
    await this.photoProcessor.applyEdits(fullPath, processedPath, edits);

    return processedPath;
  }

  /**
   * Bundles all high-res assets for an order into a single ZIP file,
   * applying any non-destructive edits (retouch, crop, filtering) first.
   */
  public async bundleOrder(orderId: string): Promise<string> {
    this.logger.info(`[FulfillmentService] Bundling Order: ${orderId}`);

    // 1. Fetch Order Items
    const order = this.db.get<{ items: string; orderNumber: string }>(
      "SELECT items, orderNumber FROM orders WHERE id = ?",
      [orderId],
    );

    if (!order) {
      throw new Error(`Order ${orderId} not found in database.`);
    }

    let items: any[] = [];
    try {
      items = JSON.parse(order.items);
    } catch (e) {
      throw new Error(`Failed to parse items for order ${orderId}`);
    }

    if (!items || items.length === 0) {
      throw new Error(`Order ${orderId} has no items.`);
    }

    // 2. Prepare ZIP Destination
    const zipFileName = `fulfillment_${orderId}_${Date.now()}.zip`;
    const zipPath = path.join(this.tempDir, zipFileName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    // 3. Process each item and add to ZIP
    const processedFiles: string[] = [];

    try {
      for (const item of items) {
        const assetId = item.photoId || item.id;
        if (!assetId) continue;

        try {
          // Refactored to use processSinglePhoto
          const processedPath = await this.processSinglePhoto(assetId);
          processedFiles.push(processedPath);

          // Original filename for the ZIP entry
          const photo = this.db.get<any>(
            "SELECT originalFilename, url FROM photos WHERE id = ?",
            [assetId],
          );
          const entryName =
            photo?.originalFilename ||
            path.basename(photo?.url || "unknown.jpg");

          archive.file(processedPath, { name: entryName });
        } catch (err: any) {
          this.logger.error(
            `[FulfillmentService] Failed to process ${assetId}: ${err.message}`,
          );
          // Fallback to original for ZIP
          const photo = this.db.get<any>(
            "SELECT url, originalFilename FROM photos WHERE id = ?",
            [assetId],
          );
          if (photo) {
            const fullPath = path.join(UPLOAD_DIR, photo.url);
            const entryName =
              photo.originalFilename || path.basename(photo.url);
            archive.file(fullPath, { name: `ERROR_PROCESSING_${entryName}` });
          }
        }
      }

      return new Promise((resolve, reject) => {
        output.on("close", async () => {
          this.logger.info(
            `[FulfillmentService] Zip created: ${zipPath} (${archive.pointer()} bytes)`,
          );

          // Cleanup processed JPEGs (keep ZIP)
          for (const f of processedFiles) {
            try {
              if (fs.existsSync(f)) await fs.promises.unlink(f);
            } catch (e) {
              this.logger.warn(
                `[FulfillmentService] Failed to cleanup processed file ${f}:`,
                { error: e instanceof Error ? e.message : String(e) },
              );
            }
          }

          resolve(zipPath);
        });

        archive.on("error", (err: any) => {
          this.logger.error(
            `[FulfillmentService] Archiver error: ${err.message}`,
          );
          reject(err);
        });

        archive.pipe(output);
        archive.finalize();
      });
    } catch (err: any) {
      this.logger.error(`[FulfillmentService] Bundling failed: ${err.message}`);
      // Attempt to cleanup partial files
      for (const f of processedFiles) {
        try {
          if (fs.existsSync(f)) await fs.promises.unlink(f);
        } catch (e) {
          this.logger.warn(
            `[FulfillmentService] Failed to cleanup partial file ${f}:`,
            { error: e instanceof Error ? e.message : String(e) },
          );
        }
      }
      throw err;
    }
  }

  /**
   * Cleans up a temporary ZIP file.
   */
  public async cleanup(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.info(
          `[FulfillmentService] Cleaned up temp file: ${filePath}`,
        );
      }
    } catch (e: any) {
      this.logger.warn(
        `[FulfillmentService] Failed to cleanup ${filePath}: ${e.message}`,
      );
    }
  }

  /**
   * Broadcasts order status to all configured Touch kiosks by writing a JSON file
   * to their respective status directories. Adheres to Law 07 (Master Push Logic).
   */
  public async broadcastStatusToKiosks(orderId: string): Promise<boolean> {
    try {
      const order = this.db.get<any>("SELECT * FROM orders WHERE id = ?", [
        orderId,
      ]);
      if (!order) return false;

      const statusPayload = {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        clientName: order.clientName,
        updatedAt: new Date().toISOString(),
      };

      // Fetch all kiosks to push status update
      const kiosks = this.db.query<{ ordersFolderPath: string }>(
        'SELECT ordersFolderPath FROM kiosks WHERE ordersFolderPath IS NOT NULL AND ordersFolderPath != ""',
      );

      let pushedCount = 0;
      for (const kiosk of kiosks) {
        try {
          const statusDir = path.join(kiosk.ordersFolderPath, "status");
          if (!fs.existsSync(statusDir)) {
            fs.mkdirSync(statusDir, { recursive: true });
          }
          const destPath = path.join(statusDir, `${orderId}.json`);
          await fs.writeJSON(destPath, statusPayload, { spaces: 2 });
          pushedCount++;
        } catch (e: any) {
          this.logger.warn(
            `[FulfillmentService] Failed to push status to kiosk path: ${kiosk.ordersFolderPath} - ${e.message}`,
          );
        }
      }

      this.logger.info(
        `[FulfillmentService] Status broadcasted for order ${orderId} to ${pushedCount} kiosks`,
      );
      return pushedCount > 0;
    } catch (error: any) {
      this.logger.error(
        `[FulfillmentService] Global status broadcast failed for ${orderId}: ${error.message}`,
      );
      return false;
    }
  }
}
