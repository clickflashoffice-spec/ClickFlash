// backend/routes/pairing.ts
// Pairing Routes — tokens persisted to SQLite (migration 055)

import express, { Request, Response, NextFunction, Router } from "express";

import crypto from "crypto";
import { Logger } from "../shared/logger";
import AuditLogger from "../shared/auditLogger";
import { DatabaseManager } from "../shared/db";

import { isPrivateIp } from "../shared/ipUtils";

interface PairingContext {
  dbManager: DatabaseManager;
  logger: Logger;
  auditLogger: AuditLogger;
}

export default function pairingRoutes(context: PairingContext): Router {
  const { dbManager, logger } = context;
  const router = express.Router();

  // LAN Whitelist Middleware for pairing
  router.use((req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.get('x-forwarded-for') || '';
    if (!isPrivateIp(clientIp)) {
      logger.warn(`[Security] Rejected Pairing attempt from non-private IP: ${clientIp}`);
      return res.status(403).json({ error: "Forbidden", message: "Pairing only allowed over local network." });
    }
    next();
  });

  // Cleanup expired tokens on startup (non-blocking)

  setImmediate(() => {
    try {
      dbManager.run("DELETE FROM pairing_tokens WHERE expires_at < ?", [
        new Date().toISOString(),
      ]);
    } catch (e) {
      // Non-fatal — table may not exist yet if migration hasn't run
    }
  });

  /**
   * @route POST /pairing/validate
   * @description Validate a pairing token from a kiosk
   */
  router.post("/pairing/validate", (req: Request, res: Response) => {
    try {
      const { kioskId, pairingToken, timestamp } = req.body;

      if (!pairingToken) {
        res.status(400).json({
          valid: false,
          message: "Pairing token is required",
        });
        return;
      }

      // Fetch token from DB
      const tokenData = dbManager.get<{
        token: string;
        kiosk_id: string;
        kiosk_name: string;
        http_url: string;
        ws_url: string;
        expires_at: string;
        used: number;
      }>("SELECT * FROM pairing_tokens WHERE token = ?", [pairingToken]);

      if (!tokenData) {
        res.status(404).json({
          valid: false,
          message: "Invalid or expired pairing token",
        });
        return;
      }

      // Check expiration
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);

      if (now > expiresAt) {
        dbManager.run("DELETE FROM pairing_tokens WHERE token = ?", [
          pairingToken,
        ]);
        res.status(410).json({
          valid: false,
          message: "Pairing token has expired",
        });
        return;
      }

      // Check if already used
      if (tokenData.used) {
        res.status(409).json({
          valid: false,
          message: "Pairing token has already been used",
        });
        return;
      }

      // Mark token as used
      const resolvedKioskId = kioskId || tokenData.kiosk_id;
      dbManager.run(
        "UPDATE pairing_tokens SET used = 1, used_at = ?, used_by = ? WHERE token = ?",
        [now.toISOString(), resolvedKioskId, pairingToken],
      );

      // Generate and persist a signing secret for this kiosk
      const signingSecret = crypto.randomBytes(32).toString("hex");

      try {
        const existingKiosk = dbManager.get(
          "SELECT id FROM kiosks WHERE id = ?",
          [resolvedKioskId],
        );
        if (existingKiosk) {
          dbManager.run(
            "UPDATE kiosks SET signingSecret = ?, updated_at = ? WHERE id = ?",
            [signingSecret, now.toISOString(), resolvedKioskId],
          );
        } else {
          dbManager.run(
            "INSERT INTO kiosks (id, name, status, signingSecret, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            [
              resolvedKioskId,
              tokenData.kiosk_name || "Unnamed Kiosk",
              "Connected",
              signingSecret,
              now.toISOString(),
              now.toISOString(),
            ],
          );
        }
        logger.info("[Pairing] Signing secret generated and persisted", {
          kioskId: resolvedKioskId,
        });
      } catch (dbErr: any) {
        logger.error("[Pairing] Failed to persist signing secret", {
          error: dbErr.message,
          kioskId: resolvedKioskId,
        });
        // Non-fatal: continue pairing even if DB write fails
      }

      logger.info("[Pairing] Token validated successfully", {
        tokenPrefix: pairingToken.substring(0, 8),
        kioskId: resolvedKioskId,
        timestamp,
      });

      res.json({
        valid: true,
        message: "Pairing token validated successfully",
        signingSecret,
        kioskInfo: {
          id: resolvedKioskId,
          name: tokenData.kiosk_name,
          httpUrl: tokenData.http_url,
          wsUrl: tokenData.ws_url,
        },
      });
    } catch (error: any) {
      logger.error("[Pairing] Validation error", { error: error.message });
      res.status(500).json({
        valid: false,
        error: error.message,
      });
    }
  });

  /**
   * @route POST /pairing/register
   * @description Register a new pairing token (called by Master when generating QR)
   */
  router.post("/pairing/register", (req: Request, res: Response) => {
    try {
      const { pairingToken, kioskId, kioskName, httpUrl, wsUrl, expiresAt } =
        req.body;

      if (!pairingToken || !expiresAt) {
        res.status(400).json({
          success: false,
          message: "Pairing token and expiration are required",
        });
        return;
      }

      // Upsert token into DB
      dbManager.run(
        `INSERT OR REPLACE INTO pairing_tokens
                    (token, kiosk_id, kiosk_name, http_url, ws_url, created_at, expires_at, used)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          pairingToken,
          kioskId || null,
          kioskName || null,
          httpUrl || null,
          wsUrl || null,
          new Date().toISOString(),
          expiresAt,
        ],
      );

      logger.info("[Pairing] Token registered", {
        tokenPrefix: pairingToken.substring(0, 8),
        expiresAt,
      });

      res.json({
        success: true,
        message: "Pairing token registered successfully",
      });
    } catch (error: any) {
      logger.error("[Pairing] Registration error", { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * @route GET /pairing/active
   * @description Get active pairing tokens (debug/monitoring)
   */
  router.get("/pairing/active", (_req: Request, res: Response) => {
    try {
      const now = new Date().toISOString();
      const activeTokens = dbManager.query<{
        token: string;
        kiosk_id: string;
        expires_at: string;
      }>(
        "SELECT token, kiosk_id, expires_at FROM pairing_tokens WHERE expires_at > ? AND used = 0",
        [now],
      );

      res.json({
        count: activeTokens.length,
        tokens: activeTokens.map((t) => ({
          tokenPrefix: t.token.substring(0, 8),
          kioskId: t.kiosk_id,
          expiresAt: t.expires_at,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
