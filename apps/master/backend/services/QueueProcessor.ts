import { DatabaseManager } from "../shared/db";
import { Logger } from "../shared/logger";
import { CloudSyncService } from "./cloudSyncService";
import { FulfillmentService } from "./FulfillmentService";
import { UPLOAD_DIR } from "../config/constants";
import path from "path";
import fs from "fs";
import { PhotoProcessor } from "../shared/photoProcessor";
import { TransferService } from "./TransferService";

export class QueueProcessor {
  private db: DatabaseManager;
  private logger: Logger;
  private cloudService: CloudSyncService;
  private photoProcessor: PhotoProcessor;
  private fulfillmentService: FulfillmentService;

  private fulfillmentTimer: NodeJS.Timeout | null = null;
  private watermarkTimer: NodeJS.Timeout | null = null;
  private retentionTimer: NodeJS.Timeout | null = null;
  private transferTimer: NodeJS.Timeout | null = null;

  private isProcessingFulfillment = false;
  private isProcessingWatermark = false;
  private isProcessingRetention = false;
  private isProcessingTransfer = false;

  private transferService: TransferService;

  constructor(
    db: DatabaseManager,
    logger: Logger,
    cloudService: CloudSyncService,
    photoProcessor: PhotoProcessor,
    fulfillmentService: FulfillmentService,
  ) {
    this.db = db;
    this.logger = logger;
    this.cloudService = cloudService;
    this.photoProcessor = photoProcessor;
    this.fulfillmentService = fulfillmentService;
    this.transferService = new TransferService({
      dbManager: this.db,
      logger: this.logger,
    });
  }

  public start() {
    this.logger.info("[QueueProcessor] Starting Parallel Queues...");

    // P2-B Audit Guard: Verify fulfillment_queue schema before starting loops.
    // Prevents "no such column: priority" crash on startup if migration hasn't run.
    try {
      this.db.query("SELECT priority FROM fulfillment_queue LIMIT 1");
    } catch (err: any) {
      this.logger.error(
        "[QueueProcessor] STARTUP BLOCKED: fulfillment_queue.priority column missing. " +
        "Ensure migrations 050_decoupled_fulfillment_queues.sql and 052_add_missing_priorities.sql have been applied. " +
        err.message
      );
      return; // Do not start loops if schema is broken
    }

    // Fulfillment Loop (Aggressive)
    this.fulfillmentTimer = setInterval(() => this.runFulfillment(), 10000);
    this.runFulfillment();

    // Watermark Loop
    this.watermarkTimer = setInterval(() => this.runWatermark(), 30000);
    this.runWatermark();

    // Retention/Sync Loop
    this.retentionTimer = setInterval(() => this.runRetention(), 30000);
    this.runRetention();

    // Kiosk Transfer Loop (Aggressive)
    this.transferTimer = setInterval(() => this.runKioskTransfer(), 5000);
    this.runKioskTransfer();
  }

  public stop() {
    if (this.fulfillmentTimer) clearInterval(this.fulfillmentTimer);
    if (this.watermarkTimer) clearInterval(this.watermarkTimer);
    if (this.retentionTimer) clearInterval(this.retentionTimer);
    if (this.transferTimer) clearInterval(this.transferTimer);
    this.fulfillmentTimer = null;
    this.watermarkTimer = null;
    this.retentionTimer = null;
    this.transferTimer = null;
  }

  private async runFulfillment() {
    if (this.isProcessingFulfillment) return;
    this.isProcessingFulfillment = true;
    try {
      await this.processFulfillment();
    } catch (e: any) {
      this.logger.error("[QueueProcessor] Fulfillment Error: " + e.message);
    } finally {
      this.isProcessingFulfillment = false;
    }
  }

  private async runWatermark() {
    if (this.isProcessingWatermark) return;
    this.isProcessingWatermark = true;
    try {
      await this.processWatermark();
    } catch (e: any) {
      this.logger.error("[QueueProcessor] Watermark Error: " + e.message);
    } finally {
      this.isProcessingWatermark = false;
    }
  }

  private async runRetention() {
    if (this.isProcessingRetention) return;
    this.isProcessingRetention = true;
    try {
      await this.processRetention();
    } catch (e: any) {
      this.logger.error("[QueueProcessor] Retention Error: " + e.message);
    } finally {
      this.isProcessingRetention = false;
    }
  }

  private async runKioskTransfer() {
    if (this.isProcessingTransfer) return;
    this.isProcessingTransfer = true;
    try {
      await this.processKioskTransfer();
    } catch (e: any) {
      this.logger.error("[QueueProcessor] Transfer Error: " + e.message);
    } finally {
      this.isProcessingTransfer = false;
    }
  }

  private async processKioskTransfer() {
    const items = this.db.query<{ id: string }>(
      "SELECT id FROM kiosk_transfer_queue WHERE status = 'pending' OR (status = 'failed' AND retry_count < 3) ORDER BY created_at ASC LIMIT 1",
    );

    for (const item of items) {
      this.logger.info(`[Transfer] Processing Job ${item.id}`);
      try {
        await this.transferService.processTransferJob(item.id);
      } catch (err: any) {
        this.logger.error(`[Transfer] Failed Job ${item.id}: ${err.message}`);
      }
    }
  }

  private async processFulfillment() {
    const items = this.db.query<{
      id: number;
      order_id: string;
      asset_id: string;
      type: string;
      retry_count: number;
    }>(
      "SELECT * FROM fulfillment_queue WHERE (status = 'pending') OR (status = 'failed' AND retry_count < 6 AND updated_at < datetime('now', '-' || (1 << retry_count) || ' minute')) ORDER BY priority DESC LIMIT 5",
    );

    await Promise.allSettled(
      items.map(async (item) => {
        this.logger.info(
          `[Fulfillment] Processing ${item.type} Job ${item.id} for Order ${item.order_id}`,
        );
        try {
          this.db.run(
            "UPDATE fulfillment_queue SET status = 'processing', progress = 10, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [item.id],
          );

          if (item.type === "BUNDLE") {
            this.db.run(
              "UPDATE fulfillment_queue SET progress = 20 WHERE id = ?",
              [item.id],
            );
            const zipPath = await this.fulfillmentService.bundleOrder(
              item.order_id,
            );
            this.db.run(
              "UPDATE fulfillment_queue SET progress = 60 WHERE id = ?",
              [item.id],
            );

            await this.cloudService.uploadHighRes(
              item.order_id,
              `bundle_${item.order_id}`,
              zipPath,
            );
            await this.fulfillmentService.cleanup(zipPath);

            this.db.run(
              "UPDATE fulfillment_queue SET progress = 100, status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [item.id],
            );
          } else {
            const asset = this.db.get<{
              url: string;
              originalFilename: string;
            }>("SELECT url, originalFilename FROM photos WHERE id = ?", [
              item.asset_id,
            ]);
            if (!asset) throw new Error("Asset not found in photos table");

            this.db.run(
              "UPDATE fulfillment_queue SET progress = 50 WHERE id = ?",
              [item.id],
            );
            await this.cloudService.uploadHighRes(
              item.order_id,
              item.asset_id,
              asset.url,
            );
            this.db.run(
              "UPDATE fulfillment_queue SET progress = 100, status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
              [item.id],
            );
          }
        } catch (err: any) {
          this.logger.error(
            `[Fulfillment] Failed Item ${item.id}: ${err.message}`,
          );
          this.db.run(
            "UPDATE fulfillment_queue SET status = 'failed', error_log = ?, retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [err.message, item.id],
          );
        }
      }),
    );
  }

  private async processWatermark() {
    const items = this.db.query<{
      id: number;
      album_id: string;
      asset_id: string;
    }>(
      "SELECT * FROM retention_queue WHERE (status = 'pending') OR (status = 'failed' AND retry_count < 6 AND updated_at < datetime('now', '-' || (1 << retry_count) || ' minute')) LIMIT 5",
    );

    await Promise.allSettled(
      items.map(async (item) => {
        try {
          this.db.run(
            "UPDATE retention_queue SET status = 'watermarking', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [item.id],
          );
          const photo = this.db.get<{ url: string }>(
            "SELECT url FROM photos WHERE id = ?",
            [item.asset_id],
          );
          if (!photo) throw new Error("Photo not found");

          const fullPath = path.join(UPLOAD_DIR, photo.url);
          if (!fs.existsSync(fullPath))
            throw new Error("File not found: " + fullPath);

          const outputDir = path.dirname(fullPath).replace("highres", "thumbs");
          await this.photoProcessor.generateWatermark(fullPath, outputDir);
          this.db.run(
            "UPDATE retention_queue SET status = 'watermarked', progress = 100, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [item.id],
          );
        } catch (err: any) {
          this.logger.error(`[Watermark] Failed ${item.id}: ${err.message}`);
          this.db.run(
            "UPDATE retention_queue SET status = 'failed', error_log = ?, retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [err.message, item.id],
          );
        }
      }),
    );
  }

  private async processRetention() {
    const items = this.db.query<{
      id: number;
      album_id: string;
      asset_id: string;
    }>(
      "SELECT * FROM retention_queue WHERE (status = 'watermarked') OR (status = 'failed' AND retry_count < 6 AND updated_at < datetime('now', '-' || (1 << retry_count) || ' minute')) LIMIT 5",
    );

    await Promise.allSettled(
      items.map(async (item) => {
        try {
          this.db.run(
            "UPDATE retention_queue SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [item.id],
          );
          const asset = this.db.get<{ url: string; originalFilename: string }>(
            "SELECT url, originalFilename FROM photos WHERE id = ?",
            [item.asset_id],
          );
          if (!asset) throw new Error("Asset not found");

          await this.cloudService.uploadRetentionAsset(
            item.asset_id,
            asset.url,
            item.album_id,
          );

          try {
            await this.photoProcessor.archivePhoto(item.album_id, asset.url);
          } catch (archiveErr: any) {
            this.logger.warn(
              `[Retention] Failed to archive ${item.asset_id}: ${archiveErr.message}`,
            );
          }

          this.db.run(
            "UPDATE retention_queue SET status = 'completed', progress = 100, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [item.id],
          );
          this.db.run("UPDATE photos SET status = 'archived' WHERE id = ?", [
            item.asset_id,
          ]);
        } catch (err: any) {
          this.logger.error(
            `[Retention] Failed Item ${item.id}: ${err.message}`,
          );
          this.db.run(
            "UPDATE retention_queue SET status = 'failed', error_log = ?, retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [err.message, item.id],
          );
        }
      }),
    );
  }
}
