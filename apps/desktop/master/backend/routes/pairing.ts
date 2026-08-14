// backend/routes/pairing.ts
// Pairing Routes — tokens persisted to SQLite (migration 055)

import express, { Request, Response, NextFunction, Router } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Logger } from '../utils/logger';
import AuditLogger from '../utils/auditLogger';
import { DatabaseManager } from '../database/db';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { customRoutesSchemas } from '../utils/validation';

import { isPrivateIp } from '../utils/ipUtils';

interface PairingContext {
  dbManager: DatabaseManager;
  logger: Logger;
  auditLogger: AuditLogger;
}

// In-memory store of unexpired nonces for Touch challenge-response pairing.
// Nonces die with the process — they are not persisted.
const nonces = new Map<string, { desk_id: string; created_at: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000;

// Cleanup expired nonces every minute
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of nonces.entries()) {
    if (now - v.created_at > NONCE_TTL_MS) nonces.delete(k);
  }
}, 60_000).unref();

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
   * Phase 4: Auto-generates kiosk folder paths and creates directories.
   */
  router.post("/pairing/register", (req: Request, res: Response) => {
    try {
      let { pairingToken, kioskId, kioskName, httpUrl, wsUrl, expiresAt, uploadFolderPath, ordersFolderPath } =
        req.body;

      if (!pairingToken || !expiresAt) {
        res.status(400).json({
          success: false,
          message: "Pairing token and expiration are required",
        });
        return;
      }

      // Auto-generate paths if missing and we have a kioskId
      if (kioskId) {
        const basePath = path.join(require("os").homedir(), "Pictures", "ClickFlash", "Kiosks", kioskId);
        if (!uploadFolderPath) uploadFolderPath = path.join(basePath, "uploads");
        if (!ordersFolderPath) ordersFolderPath = path.join(basePath, "orders");
      }

      // Phase 4: Auto-create kiosk directories if paths provided
      if (uploadFolderPath) {
        try {
          if (!fs.existsSync(uploadFolderPath)) {
            fs.mkdirSync(uploadFolderPath, { recursive: true });
            logger.info("[Pairing] Auto-created upload directory", { path: uploadFolderPath });
          }
        } catch (dirErr: any) {
          logger.warn("[Pairing] Failed to auto-create upload directory", { path: uploadFolderPath, error: dirErr.message });
        }
      }
      if (ordersFolderPath) {
        try {
          if (!fs.existsSync(ordersFolderPath)) {
            fs.mkdirSync(ordersFolderPath, { recursive: true });
            logger.info("[Pairing] Auto-created orders directory", { path: ordersFolderPath });
          }
        } catch (dirErr: any) {
          logger.warn("[Pairing] Failed to auto-create orders directory", { path: ordersFolderPath, error: dirErr.message });
        }
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

      // Phase 4: Pre-populate kiosk record with auto-paths so /pairing/validate can persist them
      if (kioskId && (uploadFolderPath || ordersFolderPath)) {
        try {
          const existing = dbManager.get("SELECT id FROM kiosks WHERE id = ?", [kioskId]);
          if (existing) {
            dbManager.run(
              "UPDATE kiosks SET uploadFolderPath = COALESCE(?, uploadFolderPath), ordersFolderPath = COALESCE(?, ordersFolderPath), updated_at = ? WHERE id = ?",
              [uploadFolderPath || null, ordersFolderPath || null, new Date().toISOString(), kioskId]
            );
          } else {
            dbManager.run(
              "INSERT INTO kiosks (id, name, status, uploadFolderPath, ordersFolderPath, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [kioskId, kioskName || "Auto-Paired Kiosk", "Pending", uploadFolderPath || null, ordersFolderPath || null, new Date().toISOString(), new Date().toISOString()]
            );
          }
          logger.info("[Pairing] Kiosk record pre-populated with auto-paths", { kioskId, uploadFolderPath, ordersFolderPath });
        } catch (kioskErr: any) {
          logger.warn("[Pairing] Failed to pre-populate kiosk paths", { kioskId, error: kioskErr.message });
        }
      }

      logger.info("[Pairing] Token registered", {
        tokenPrefix: pairingToken.substring(0, 8),
        expiresAt,
      });

      res.json({
        success: true,
        message: "Pairing token registered successfully",
        paths: { uploadFolderPath, ordersFolderPath },
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

  // ───────────────────────────────────────────────────────────────
  // Touch Kiosk Challenge-Response Pairing (v1)
  // ───────────────────────────────────────────────────────────────

  /**
   * @route GET /v1/pairing/challenge
   * @description Issue a one-time nonce for Touch kiosk pairing
   */
  router.get("/v1/pairing/challenge", (req: Request, res: Response) => {
    const nonce = crypto.randomBytes(32).toString("base64");
    const deskId = req.header("x-desk-id") || process.env.DESK_ID || "unknown";
    nonces.set(nonce, { desk_id: deskId, created_at: Date.now() });
    res.json({
      nonce,
      desk_id: deskId,
      expires_at: new Date(Date.now() + NONCE_TTL_MS).toISOString(),
      algorithm: "HMAC-SHA256",
    });
  });

  /**
   * @route POST /v1/pairing/exchange
   * @description Exchange a signed challenge for a per-kiosk HMAC secret
   */
  router.post("/v1/pairing/exchange", strictRateLimiter, (req: Request, res: Response) => {
    const parsed = customRoutesSchemas.pairingExchange.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const { kiosk_id, nonce, signature, hardware_fingerprint, tenant_id } = parsed.data;

    // Look up and remove the nonce atomically
    const stored = nonces.get(nonce);
    if (!stored) {
      return res.status(401).json({ error: "Invalid or expired nonce" });
    }
    if (Date.now() - stored.created_at > NONCE_TTL_MS) {
      nonces.delete(nonce);
      return res.status(401).json({ error: "Nonce expired" });
    }
    nonces.delete(nonce);

    // Verify the signature: HMAC-SHA256(kiosk_id + nonce, desk_id + hardware_fingerprint)
    const expectedSig = crypto
      .createHmac("sha256", `${stored.desk_id}|${hardware_fingerprint}`)
      .update(`${kiosk_id}|${nonce}`)
      .digest("base64");

    // Constant-time compare to prevent timing attacks
    const sigBuffer = Buffer.from(signature, "base64");
    const expectedBuffer = Buffer.from(expectedSig, "base64");
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      logger.warn("[Pairing] Invalid signature", { kiosk_id });
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Generate per-kiosk HMAC secret (32 bytes)
    const hmacSecret = crypto.randomBytes(32).toString("base64");
    const nowSec = Math.floor(Date.now() / 1000);

    // Persist the pairing in the pairings table
    const remoteIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    dbManager.run(
      `INSERT INTO pairings (kiosk_id, mac, ip, hmac_secret, paired_at, last_seen, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(kiosk_id) DO UPDATE SET
         hmac_secret = excluded.hmac_secret,
         ip = excluded.ip,
         paired_at = excluded.paired_at,
         last_seen = excluded.last_seen`,
      [kiosk_id, "unknown", remoteIp, hmacSecret, nowSec, nowSec, tenant_id || null],
    );

    logger.info("[Pairing] Touch paired", { kiosk_id, ip: remoteIp });

    res.json({
      hmac_secret: hmacSecret,
      tenant_id: tenant_id || "default",
      desk_id: stored.desk_id,
      master_ip: req.socket.localAddress,
      master_port: parseInt(process.env.BACKEND_PORT || "8090", 10),
      algorithm: "HMAC-SHA256",
    });
  });

  /**
   * @route GET /v1/pairing
   * @description List all paired Touch kiosks
   */
  router.get("/v1/pairing", (_req: Request, res: Response) => {
    try {
      const rows = dbManager.query<{
        kiosk_id: string;
        ip: string;
        paired_at: number;
        last_seen: number;
        tenant_id: string;
      }>(
        `SELECT kiosk_id, ip, paired_at, last_seen, tenant_id
         FROM pairings
         ORDER BY paired_at DESC`,
        [],
      );
      res.json({ pairings: rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
