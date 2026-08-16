import express, { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { Logger } from '../utils/logger';
import DatabaseManager from '../database/db';
import { EmailService } from "../services/emailService";
import { strictRateLimiter } from '../middleware/rateLimiter';
import { customRoutesSchemas } from '../utils/validation';
import { GalleryConfigService } from '../services/GalleryConfigService';
import { GalleryConfig } from '@clickflash/types';

interface GalleryAuthContext {
  dbManager: DatabaseManager;
  logger: Logger;
  JWT_SECRET: string;
  emailService?: EmailService;
  galleryConfigService: GalleryConfigService;
}

interface GalleryTokenPayload {
  albumId: string;
  customerEmail: string;
  type: "magic-link" | "order";
  orderId?: string;
}

const TOKEN_EXPIRY_DAYS = 30;

export default function galleryAuthRoutes(context: GalleryAuthContext): Router {
  const { dbManager, logger, JWT_SECRET, emailService } = context;
  const router = express.Router();

  /**
   * AUTHENTICATION PATH 1: Order Download Portal
   */
  router.post("/order-login", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.orderLogin.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid order ID or email format" });
      }
      const { orderId, customerEmail } = parsed.data;

      const order = dbManager.get(
        `SELECT o.*, a.id as albumId, a.title as albumName
         FROM orders o
         LEFT JOIN albums a ON a.id = o.albumId
         WHERE o.id = ? AND (LOWER(o.email) = LOWER(?) OR LOWER(o.customerEmail) = LOWER(?))`,
        [orderId, customerEmail, customerEmail],
      );

      if (!order) {
        return res.status(401).json({ error: "Invalid order ID or email" });
      }

      const payload: GalleryTokenPayload = {
        albumId: order.albumId,
        customerEmail,
        type: "order",
        orderId,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      logger.info("[GalleryAuth] Order login successful", {
        orderId,
        customerEmail,
      });

      res.json({
        success: true,
        token,
        access: "order",
        order: {
          id: order.id,
          albumId: order.albumId,
          albumName: order.albumName,
          total: order.total,
          clientName: order.clientName,
          email: order.email,
          status: order.status,
          destinationId: order.destinationId,
          photographerId: order.photographerId,
          items: JSON.parse(order.items || "[]"),
        },
      });
    } catch (error: any) {
      logger.error("[GalleryAuth] Order login failed", {
        error: error.message,
      });
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * AUTHENTICATION PATH 2: Magic Link
   */
  router.post("/generate-magic-link", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.magicLink.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid album ID or email format" });
      }
      const { albumId, customerEmail } = parsed.data;

      const album = dbManager.get("SELECT id FROM albums WHERE id = ?", [
        albumId,
      ]);
      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }

      const payload: GalleryTokenPayload = {
        albumId,
        customerEmail,
        type: "magic-link",
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: `${TOKEN_EXPIRY_DAYS}d`,
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

      dbManager.run(
        `INSERT INTO gallery_tokens (albumId, customerEmail, token, expiresAt)
         VALUES (?, ?, ?, ?)`,
        [albumId, customerEmail, token, expiresAt.toISOString()],
      );

      const galleryUrl = `${process.env.GALLERY_URL || "http://localhost:5177"}/gallery/${token}`;

      logger.info("[GalleryAuth] Generated magic link", {
        albumId,
        customerEmail,
      });

      // Phase 62: Dispatch Gallery Access Link via Email Relay
      if (emailService && emailService.isConfigured()) {
        const accessHtml = `
                <!DOCTYPE html>
                <html>
                <body style="font-family: sans-serif; padding: 20px; background: #f8fafc;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
                        <h2 style="color: #0f172a;">Your ClickFlash Digital Gallery</h2>
                        <p>Your photos from album <strong>${albumId}</strong> are ready to view!</p>
                        <p>Click the secure link below to access your high-resolution photos. This link is unique to you and will expire in ${TOKEN_EXPIRY_DAYS} days.</p>
                        <a href="${galleryUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">View My Gallery</a>
                        <p style="color: #64748b; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:<br>${galleryUrl}</p>
                    </div>
                </body>
                </html>
                `;

        emailService
          .sendTransactional({
            to: customerEmail,
            subject: "Your ClickFlash Digital Gallery is Ready",
            html: accessHtml,
            text: `Your ClickFlash photos from album ${albumId} are ready! View them here: ${galleryUrl}`,
          })
          .then((sent) => {
            if (sent)
              logger.info("[GalleryAuth] Access email queued for delivery", {
                customerEmail,
                albumId,
              });
            else
              logger.warn("[GalleryAuth] Access email failed to send", {
                customerEmail,
                albumId,
              });
          })
          .catch((e) => {
            logger.error("[GalleryAuth] Access email dispatch exception", {
              error: e.message,
            });
          });
      }

      res.json({
        success: true,
        token,
        galleryUrl,
        access: "magic-link",
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error: any) {
      logger.error("[GalleryAuth] Failed to generate magic link", {
        error: error.message,
      });
      res.status(500).json({ error: "Failed to generate magic link" });
    }
  });

  /**
   * AUTHENTICATION PATH 3: Validate Magic Link
   */
  router.post("/magic-validate", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Magic link secret validation
      const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || 'fallback-dev-secret-for-magic-links';
      
      let payload: any;
      try {
        payload = jwt.verify(token, MAGIC_LINK_SECRET);
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired magic link" });
      }

      const { albumId, guestId, orderId } = payload;

      const album = dbManager.get("SELECT id FROM albums WHERE id = ?", [albumId]);
      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }

      const galleryPayload: GalleryTokenPayload = {
        albumId,
        customerEmail: guestId || "magic-link-guest",
        type: "magic-link",
        orderId,
      };

      const galleryToken = jwt.sign(galleryPayload, JWT_SECRET, {
        expiresIn: `${TOKEN_EXPIRY_DAYS}d`,
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

      dbManager.run(
        `INSERT INTO gallery_tokens (albumId, customerEmail, token, expiresAt)
         VALUES (?, ?, ?, ?)`,
        [albumId, galleryPayload.customerEmail, galleryToken, expiresAt.toISOString()],
      );

      res.json({
        success: true,
        token: galleryToken,
        access: "magic-link",
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error: any) {
      logger.error("[GalleryAuth] Failed to validate magic link", {
        error: error.message,
      });
      res.status(500).json({ error: "Failed to validate magic link" });
    }
  });

  router.get("/:token/verify", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      let payload: any;
      try {
        payload = jwt.verify(token as string, JWT_SECRET) as any;
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (payload.type === "magic-link") {
        const tokenRecord = dbManager.get<any>(
          `SELECT * FROM gallery_tokens WHERE token = ? AND expiresAt > datetime('now')`,
          [token as string],
        );

        if (!tokenRecord) {
          return res.status(401).json({ error: "Token not found or expired" });
        }

        dbManager.run(
          `UPDATE gallery_tokens SET lastAccessed = datetime('now') WHERE token = ?`,
          [token as string],
        );
      }

      const album = dbManager.get<any>(
        `SELECT 
          a.id, a.title as name, a.date as eventDate, a.created_at as publishedAt,
          COUNT(p.id) as photoCount
         FROM albums a
         LEFT JOIN photos p ON p.albumId = a.id
         WHERE a.id = ?
         GROUP BY a.id`,
        [payload.albumId],
      );

      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }

      let orderObj = null;
      if (payload.type === "order" && payload.orderId) {
        const orderRecord = dbManager.get<any>("SELECT * FROM orders WHERE id = ?", [payload.orderId]);
        if (orderRecord) {
          orderObj = {
            id: orderRecord.id,
            albumId: orderRecord.albumId,
            albumName: album.name,
            total: orderRecord.total,
            clientName: orderRecord.clientName,
            email: orderRecord.email,
            status: orderRecord.status,
            destinationId: orderRecord.destinationId,
            photographerId: orderRecord.photographerId,
            items: JSON.parse(orderRecord.items || "[]"),
          };
        }
      }

      res.json({
        success: true,
        accessType: payload.type,
        album: {
          id: album.id,
          name: album.name,
          eventDate: album.eventDate,
          publishedAt: album.publishedAt,
          photoCount: album.photoCount,
        },
        customerEmail: payload.customerEmail,
        orderId: payload.orderId,
        order: orderObj,
      });
    } catch (error: any) {
      logger.error("[GalleryAuth] Failed to verify token", {
        error: error.message,
      });
      res.status(500).json({ error: "Failed to verify token" });
    }
  });

  router.get("/:token/photos", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      let payload: any;
      try {
        payload = jwt.verify(token as string, JWT_SECRET) as any;
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      let photos;

      if (payload.type === "order" && payload.orderId) {
        const order = dbManager.get("SELECT items FROM orders WHERE id = ?", [
          payload.orderId,
        ]);
        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        const orderItems = JSON.parse(order.items || "[]");
        const photoIds = orderItems.map((item: any) => item.photoId);

        if (photoIds.length === 0) {
          return res.json({ success: true, photos: [] });
        }

        photos = [];
        const chunkSize = 500;
        for (let i = 0; i < photoIds.length; i += chunkSize) {
          const chunk = photoIds.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => "?").join(",");
          photos.push(
            ...dbManager.query(
              `SELECT 
                id, filename, tinyUrl, thumbnailUrl as thumbUrl, previewUrl, highResUrl as highres_url,
                width, height, created_at
               FROM photos
               WHERE id IN (${placeholders})
               ORDER BY created_at ASC`,
              chunk
            )
          );
        }
      } else {
        photos = dbManager.query(
          `SELECT 
            id, filename, tinyUrl, thumbnailUrl as thumbUrl, previewUrl,
            width, height, created_at
           FROM photos
           WHERE albumId = ?
           ORDER BY created_at ASC`,
          [payload.albumId],
        );
      }

      res.json({
        success: true,
        accessType: payload.type,
        photos,
      });
    } catch (error: any) {
      logger.error("[GalleryAuth] Failed to fetch photos", {
        error: error.message,
      });
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  router.get(
    "/:token/download/:photoId",
    async (req: Request, res: Response) => {
      try {
        const { token, photoId } = req.params;

        let payload: any;
        try {
          payload = jwt.verify(token as string, JWT_SECRET) as any;
        } catch (error) {
          return res.status(401).json({ error: "Invalid or expired token" });
        }

        const photo = dbManager.get<any>(
          `SELECT * FROM photos WHERE id = ? AND albumId = ?`,
          [photoId, payload.albumId],
        );

        if (!photo) {
          return res.status(404).json({ error: "Photo not found" });
        }

        if (payload.type === "order" && payload.orderId) {
          const order = dbManager.get("SELECT items FROM orders WHERE id = ?", [
            payload.orderId,
          ]);
          const orderItems = JSON.parse(order.items || "[]");
          const hasAccess = orderItems.some(
            (item: any) => item.photoId === photoId,
          );

          if (!hasAccess) {
            return res.status(403).json({ error: "Photo not in your order" });
          }

          res.redirect(photo.highres_url || photo.preview_url);
        } else {
          res.redirect(photo.preview_url || photo.thumb_url);
        }
      } catch (error: any) {
        logger.error("[GalleryAuth] Failed to download photo", {
          error: error.message,
        });
        res.status(500).json({ error: "Failed to download photo" });
      }
    },
  );

  /**
   * GALLERY CONFIGURATION API
   */
  router.get("/gallery-config/:destinationId", (req: Request, res: Response) => {
    const destinationId = Array.isArray(req.params.destinationId)
      ? req.params.destinationId[0]
      : (req.params.destinationId as string);
    const config = context.galleryConfigService.getConfig(destinationId as string);
    if (config) {
      res.json({ success: true, data: config });
    } else {
      res.status(404).json({ error: "Gallery config not found for destination" });
    }
  });

  router.put("/gallery-config/:destinationId", (req: Request, res: Response) => {
    const destinationId = Array.isArray(req.params.destinationId)
      ? req.params.destinationId[0]
      : (req.params.destinationId as string);
    const config = req.body as GalleryConfig;
    
    try {
      context.galleryConfigService.updateConfig(destinationId as string, config);
      res.json({ success: true, message: "Gallery config updated successfully" });
    } catch (error: any) {
      context.logger.error("[GalleryConfig] Update failed", { error: error.message });
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  return router;
}
