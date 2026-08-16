import { createCanvas, loadImage } from "@napi-rs/canvas";

import fs from "fs-extra";
import path from "path";
import { Logger } from '../utils/logger';
import DatabaseManager from '../database/db';

export class FulfillmentSlipService {
  private logger: Logger;
  private db: DatabaseManager;
  private tempDir: string;

  constructor(logger: Logger, db: DatabaseManager, tempDir: string) {
    this.logger = logger;
    this.db = db;
    this.tempDir = path.join(tempDir, "production_slips");
    fs.ensureDirSync(this.tempDir);
  }

  /**
   * Generate a professional branded production slip for an order
   * Layout: A6 or 4x6" (typical photo size)
   */
  public async generateSlip(
    orderId: string,
    options?: { galleryUrl?: string; pin?: string; email?: string },
  ): Promise<string> {
    try {
      const order = this.db.get<any>(
        `
                SELECT o.*, k.name as kioskName 
                FROM orders o 
                LEFT JOIN kiosks k ON o.kioskId = k.id 
                WHERE o.id = ?
            `,
        [orderId],
      );

      if (!order) throw new Error("Order not found");

      // 1. Create Canvas (4x6 inches at 300 DPI = 1200x1800 px)
      // For a production slip, we can use a smaller 800x1200 for speed
      const width = 800;
      const height = 1200;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // 2. Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // 3. Branded Header
      ctx.fillStyle = "#1e293b"; // slate-800
      ctx.fillRect(0, 0, width, 180);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px sans-serif";
      ctx.fillText("CLICK & FLASH", 40, 80);

      ctx.font = "24px sans-serif";
      ctx.fillText("PRODUCTION SLIP", 40, 125);

      // 4. Order Meta
      ctx.fillStyle = "#f1f5f9"; // slate-100
      ctx.fillRect(580, 40, 180, 100);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("ORDER#", 600, 75);
      ctx.font = "32px sans-serif";
      ctx.fillText(order.orderNumber || orderId.substring(0, 6), 600, 115);

      // 5. Customer Details
      ctx.fillStyle = "#334155";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("CUSTOMER", 40, 260);
      ctx.font = "regular 36px sans-serif";
      ctx.fillText(order.clientName || "GUEST", 40, 310);

      if (order.email) {
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText(order.email, 40, 345);
      }

      // 6. Production Details
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 400);
      ctx.lineTo(width - 40, 400);
      ctx.stroke();

      ctx.fillStyle = "#334155";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("REQUIREMENTS", 40, 450);

      const items =
        typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      let y = 500;
      items.slice(0, 8).forEach((item: any, index: number) => {
        ctx.fillStyle = "#1e293b";
        ctx.font = "22px sans-serif";
        ctx.fillText(`${index + 1}. ${item.name || "Photo"} x1`, 60, y);
        y += 40;
      });

      if (items.length > 8) {
        ctx.fillStyle = "#64748b";
        ctx.fillText(`+ ${items.length - 8} more items...`, 60, y);
      }

      // 7. Kiosk Source
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(40, y + 40, width - 80, 80);
      ctx.fillStyle = "#475569";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`SOURCE: ${order.kioskName || "MANUAL"}`, 60, y + 90);

      // 8. Gallery Link
      ctx.fillStyle = "#64748b";
      ctx.font = "18px sans-serif";
      const footerText = options?.galleryUrl
        ? "Visit link to view your digital gallery:"
        : "Visit link to verify or update status:";
      const textWidth = ctx.measureText(footerText).width;
      ctx.fillText(footerText, (width - textWidth) / 2, height - 200);

      const qrData = options?.galleryUrl || `clickflash://order/${orderId}`;
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 22px sans-serif";
      const linkWidthUrl = ctx.measureText(qrData).width;
      ctx.fillText(qrData, (width - linkWidthUrl) / 2, height - 160);

      if (options?.galleryUrl) {
        ctx.font = "bold 20px sans-serif";
        ctx.fillStyle = "#1d4ed8"; // blue-700
        const linkText = "Your Photos are Ready!";
        const linkWidth = ctx.measureText(linkText).width;
        ctx.fillText(linkText, (width - linkWidth) / 2, height - 120);

        if (options.pin) {
          ctx.font = "bold 24px sans-serif";
          ctx.fillStyle = "#1e293b";
          const pinText = `PIN: ${options.pin}`;
          const pinWidth = ctx.measureText(pinText).width;
          ctx.fillText(pinText, (width - pinWidth) / 2, height - 90);
        }
      }

      // 9. Save to Disk
      const fileName = `slip_${orderId}_${Date.now()}.jpg`;
      const filePath = path.join(this.tempDir, fileName);
      const buffer = canvas.toBuffer("image/jpeg");
      await fs.writeFile(filePath, buffer);

      this.logger.info(`[FulfillmentSlip] Generated slip for ${orderId}`, {
        path: filePath,
        withGallery: !!options?.galleryUrl,
      });
      return filePath;
    } catch (error: any) {
      this.logger.error("[FulfillmentSlip] Generation failed", {
        orderId,
        error: error.message,
      });
      throw error;
    }
  }

  public async cleanup(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (e) {
      this.logger.error("[FulfillmentSlip] Cleanup failed", { path: filePath });
    }
  }
}
