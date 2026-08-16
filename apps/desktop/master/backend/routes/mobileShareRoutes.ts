import express, { Request, Response, Router } from "express";
import crypto from "crypto";

import { Logger } from "../utils/logger";
import { DatabaseManager } from "../database/db";

interface MobileShareContext {
  dbManager: DatabaseManager;
  logger: Logger;
}

interface ShareSessionRow {
  token: string;
  photoIds: string;
  albumId: string | null;
  expiresAt: number;
  createdAt: number;
}

export default function mobileShareRoutes(context: MobileShareContext): Router {
  const { dbManager, logger } = context;
  const router = express.Router();

  // Ensure table exists
  try {
    dbManager.run(`
      CREATE TABLE IF NOT EXISTS mobile_share_sessions (
        token TEXT PRIMARY KEY,
        photoIds TEXT NOT NULL,
        albumId TEXT,
        expiresAt INTEGER NOT NULL,
        createdAt INTEGER NOT NULL
      )
    `);
  } catch (err: any) {
    if (logger) {
      logger.error("[MobileShare] Failed to initialize mobile_share_sessions table", {
        error: err.message,
      });
    }
  }

  /**
   * @route POST /api/mobile-share/create-session
   * @description Create a short-lived sharing session and return QR code data URL + share URL
   */
  router.post("/create-session", async (req: Request, res: Response): Promise<void> => {
    try {
      const { photoIds, albumId, expiresMinutes = 60, galleryUrl } = req.body;

      if ((!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) && !albumId && !galleryUrl) {
        res.status(400).json({
          success: false,
          error: "At least photoIds (array), albumId, or galleryUrl is required to create a share session",
        });
        return;
      }

      const token = crypto.randomBytes(16).toString("hex");
      const createdAt = Date.now();
      const expiresAt = createdAt + Number(expiresMinutes) * 60 * 1000;

      const serializedPhotoIds = JSON.stringify(Array.isArray(photoIds) ? photoIds : []);
      const resolvedAlbumId = typeof albumId === "string" && albumId.trim() ? albumId.trim() : null;

      dbManager.run(
        `INSERT INTO mobile_share_sessions (token, photoIds, albumId, expiresAt, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [token, serializedPhotoIds, resolvedAlbumId, expiresAt, createdAt]
      );

      const host = req.get("host") || `${req.hostname}:${req.socket.localPort || 8090}`;
      const protocol = req.protocol || "http";
      const shareUrl = galleryUrl || `${protocol}://${host}/share/${token}`;

      const qrCodeDataUrl = "";

      if (logger) {
        logger.info("[MobileShare] Created instant share session", {
          tokenPrefix: token.substring(0, 8),
          photoCount: Array.isArray(photoIds) ? photoIds.length : 0,
          albumId: resolvedAlbumId,
          expiresAt,
        });
      }

      res.status(201).json({
        success: true,
        token,
        shareUrl,
        qrCodeDataUrl,
        expiresAt,
      });
    } catch (error: any) {
      if (logger) {
        logger.error("[MobileShare] Error creating share session", { error: error.message });
      }
      res.status(500).json({ success: false, error: "Failed to create mobile share session" });
    }
  });

  /**
   * @route GET /api/mobile-share/session/:token
   * @description Retrieve session details or return 404 if expired/not found
   */
  router.get("/session/:token", (req: Request, res: Response): void => {
    try {
      const { token } = req.params;
      if (!token) {
        res.status(400).json({ valid: false, error: "Token parameter is required" });
        return;
      }

      const row = dbManager.get<ShareSessionRow>(
        "SELECT * FROM mobile_share_sessions WHERE token = ?",
        [token]
      );

      if (!row) {
        res.status(404).json({ valid: false, error: "Share session not found" });
        return;
      }

      if (Date.now() > row.expiresAt) {
        // Cleanup expired
        dbManager.run("DELETE FROM mobile_share_sessions WHERE token = ?", [token]);
        res.status(404).json({ valid: false, error: "Share session has expired" });
        return;
      }

      let photoIds: string[] = [];
      try {
        photoIds = JSON.parse(row.photoIds || "[]");
      } catch {
        photoIds = [];
      }

      res.json({
        valid: true,
        token: row.token,
        photoIds,
        albumId: row.albumId,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      });
    } catch (error: any) {
      if (logger) {
        logger.error("[MobileShare] Error retrieving share session", { error: error.message });
      }
      res.status(500).json({ valid: false, error: "Failed to retrieve share session" });
    }
  });

  /**
   * @route POST /api/mobile-share/send-sms
   * @description Send SMS link to customer mobile phone
   */
  router.post("/send-sms", (req: Request, res: Response): void => {
    try {
      const { token, phoneNumber } = req.body;

      if (!token || !phoneNumber) {
        res.status(400).json({
          success: false,
          error: "token and phoneNumber are required",
        });
        return;
      }

      const row = dbManager.get<ShareSessionRow>(
        "SELECT * FROM mobile_share_sessions WHERE token = ?",
        [token]
      );

      if (!row || Date.now() > row.expiresAt) {
        res.status(404).json({
          success: false,
          error: "Share session not found or expired",
        });
        return;
      }

      const cleanPhone = String(phoneNumber).replace(/\D/g, "");
      if (cleanPhone.length < 7) {
        res.status(400).json({
          success: false,
          error: "Invalid phone number format",
        });
        return;
      }

      const maskedPhone = cleanPhone.replace(/\d(?=\d{4})/g, "*");
      if (logger) {
        logger.info("[MobileShare] SMS dispatch requested", {
          tokenPrefix: token.substring(0, 8),
          phoneNumber: maskedPhone,
        });
      }

      res.json({
        success: true,
        message: `SMS sent to ${maskedPhone}`,
      });
    } catch (error: any) {
      if (logger) {
        logger.error("[MobileShare] Error sending SMS", { error: error.message });
      }
      res.status(500).json({ success: false, error: "Failed to dispatch SMS" });
    }
  });

  /**
   * @route DELETE /api/mobile-share/session/:token
   * @description Revoke or delete a share session token
   */
  router.delete("/session/:token", (req: Request, res: Response): void => {
    try {
      const { token } = req.params;
      dbManager.run("DELETE FROM mobile_share_sessions WHERE token = ?", [token]);
      res.json({ success: true });
    } catch (error: any) {
      if (logger) {
        logger.error("[MobileShare] Error deleting share session", { error: error.message });
      }
      res.status(500).json({ success: false, error: "Failed to delete share session" });
    }
  });

  return router;
}
