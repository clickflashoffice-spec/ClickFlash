import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import { EmailService } from "./emailService";
import { HardwareService } from "./HardwareService";
import { FulfillmentSlipService } from "./FulfillmentSlipService";
import jwt from "jsonwebtoken";

export class OrderValidationService {
  private db: DatabaseManager;
  private logger: Logger;
  private emailService: EmailService;
  private hardwareService: HardwareService;
  private fulfillmentSlipService: FulfillmentSlipService;
  private jwtSecret: string;

  constructor(
    db: DatabaseManager,
    logger: Logger,
    emailService: EmailService,
    hardwareService: HardwareService,
    fulfillmentSlipService: FulfillmentSlipService,
    jwtSecret: string,
  ) {
    this.db = db;
    this.logger = logger;
    this.emailService = emailService;
    this.hardwareService = hardwareService;
    this.fulfillmentSlipService = fulfillmentSlipService;
    this.jwtSecret = jwtSecret;
  }

  /**
   * Main Entry Point: Triggered when Order Status becomes 'Verified' (Paid)
   */
  public validateOrder(
    orderId: string,
    albumId: string,
    selectedAssetIds: string[],
  ) {
    this.logger.info(
      `[OrderValidation] Validating Order ${orderId} for Album ${albumId}`,
    );

    try {
      const now = new Date().toISOString();
      const result = this.db.run(
        `UPDATE orders SET status = 'validating', updated_at = ? WHERE id = ? AND (status = 'paid' OR status = 'pending')`,
        [now, orderId]
      );

      if (result.changes === 0) {
        const currentOrder = this.db.get<{ status: string }>(
          "SELECT status FROM orders WHERE id = ?",
          [orderId]
        );
        if (!currentOrder) {
          throw new Error("Order not found");
        }
        if (currentOrder.status !== 'paid' && currentOrder.status !== 'pending') {
          throw new Error(`Order ${orderId} is not in a valid state for validation (current: ${currentOrder.status})`);
        }
      }

      this.db.transaction(() => {
        const { sold, moneytrash } = this.splitAssets(
          albumId,
          selectedAssetIds,
        );

        this.queueFulfillment(orderId, sold);

        this.queueRetention(albumId, moneytrash);

        this.logger.info(
          `[OrderValidation] Split Complete. Sold: ${sold.length}, Moneytrash: ${moneytrash.length}`,
        );
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[OrderValidation] Failed to validate order ${orderId}: ${message}`,
      );
      throw err;
    }
  }

  /**
   * NEW: Handle automation after order is completed (Paid & Processing started)
   */
  public async handlePostValidationActions(orderId: string) {
    this.logger.info(
      `[OrderValidation] Processing Post-Validation Actions for ${orderId}`,
    );

    try {
      const order = this.db.get("SELECT * FROM orders WHERE id = ?", [orderId]);
      if (!order) throw new Error("Order not found");

      // 1. Generate Gallery Credentials
      const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
      const token = this.generateGalleryToken(
        order.albumId,
        order.email,
        orderId,
      );

      // 2. Persist Credentials to Order Record (for Hub sync)
      this.db.run(
        "UPDATE orders SET access_pin = ?, magic_link_token = ?, updated_at = ? WHERE id = ?",
        [pin, token, new Date().toISOString(), orderId],
      );

      const galleryBaseUrl =
        process.env.GALLERY_URL || "https://gallery.clickflash.photo";
      const galleryUrl = `${galleryBaseUrl}/access?token=${token}`;

      // 3. Print Branded Receipt with credentials
      // FulfillmentSlipService will handle the layout using these details
      const slipPath = await this.fulfillmentSlipService.generateSlip(orderId, {
        galleryUrl,
        pin,
        email: order.email,
      });
      await this.hardwareService.enqueuePrint(slipPath);

      // 4. Send Automated Email
      if (order.email) {
        const subject = `Your Photos are Ready! - Order #${order.orderNumber || orderId.substring(0, 6)}`;
        const html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="color: #1e293b; margin: 0;">Click & Flash</h1>
                            <p style="color: #64748b; font-size: 14px;">Your Premium Photography Experience</p>
                        </div>
                        
                        <div style="background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h2 style="color: #1e293b; margin-top: 0;">Hi ${order.clientName || "valued customer"},</h2>
                            <p>Your photos are now ready for viewing and download in your private digital gallery.</p>
                            
                            <div style="margin: 32px 0; text-align: center;">
                                <a href="${galleryUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Access Your Gallery</a>
                            </div>

                            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 24px;">
                                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Manual Login Details</p>
                                <p style="margin: 4px 0; font-size: 14px;"><b>URL:</b> ${galleryBaseUrl}</p>
                                <p style="margin: 4px 0; font-size: 14px;"><b>Email:</b> ${order.email}</p>
                                <p style="margin: 4px 0; font-size: 14px;"><b>Access PIN:</b> <span style="font-size: 18px; color: #2563eb; font-family: monospace; letter-spacing: 2px;">${pin}</span></p>
                            </div>
                        </div>

                        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px;">
                            &copy; ${new Date().getFullYear()} Click & Flash Photography. All rights reserved.<br>
                            For support, please reply to this email.
                        </p>
                    </div>
                `;
        const text = `Your photos are ready! Access your gallery at: ${galleryUrl} or use PIN: ${pin}`;

        await this.emailService.sendTransactional({
          to: order.email,
          subject,
          html,
          text,
        });
        this.logger.info(
          `[OrderValidation] Fulfillment email sent to ${order.email} (PIN: ${pin})`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[OrderValidation] Post-validation actions failed for ${orderId}`,
        { error: error.message },
      );
    }
  }

  private generateGalleryToken(
    albumId: string,
    customerEmail: string,
    orderId: string,
  ): string {
    const payload = {
      albumId,
      customerEmail,
      type: "magic-link",
      orderId,
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: "30d" });
    return token;
  }

  /**
   * Logic: Unselected = All Album Photos - Selected Photos
   */
  private splitAssets(
    albumId: string,
    selectedIds: string[],
  ): { sold: string[]; moneytrash: string[] } {
    // Fetch ALL photos in the album
    // Note: photos table stores 'id'.
    const allPhotos = this.db.query<{ id: string }>(
      `SELECT id FROM photos WHERE albumId = ?`,
      [albumId],
    );
    const allIds = new Set(allPhotos.map((p) => p.id));
    const selectedSet = new Set(selectedIds);

    const moneytrash: string[] = [];
    const sold: string[] = [];

    for (const photoId of allIds) {
      if (selectedSet.has(photoId)) {
        sold.push(photoId);
      } else {
        moneytrash.push(photoId);
      }
    }

    return { sold, moneytrash };
  }

  private queueFulfillment(orderId: string, assetIds: string[]) {
    if (assetIds.length === 0) return;

    const stmt = this.db.prepare(`
            INSERT INTO fulfillment_queue (order_id, asset_id, status) VALUES (?, ?, 'pending')
        `);

    for (const assetId of assetIds) {
      stmt.run(orderId, assetId);
    }
  }

  private queueRetention(albumId: string, assetIds: string[]) {
    if (assetIds.length === 0) return;

    const stmt = this.db.prepare(`
            INSERT INTO retention_queue (album_id, asset_id, status) VALUES (?, ?, 'pending')
        `);

    for (const assetId of assetIds) {
      stmt.run(albumId, assetId);
    }
  }
}
