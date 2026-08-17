// backend/routes/sync.ts
import express, { Request, Response, Router } from "express";
import { SyncManager } from "../services/SyncManager";
import { Logger } from '../utils/logger';
import { sendError, ERROR_CODES } from '../utils/errorHandler';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { DatabaseManager } from '../database/db';
import { isPrivateIp } from '../utils/ipUtils';
import crypto from 'crypto';

interface SyncContext {
  syncManager: SyncManager;
  logger: Logger;
  dbManager: DatabaseManager;
}

export default function syncRoutes(context: SyncContext): Router {
  const { syncManager, logger, dbManager } = context;
  const router = express.Router();

  /**
   * @route POST /sync/mutation
   * @description HTTP Fallback for OfflineQueue mutations (when WebSocket is unstable)
   * Phase 52: AEAD AES-256-GCM encryption
   */
  router.post(
    "/sync/mutation",
    strictRateLimiter,

    async (req: Request, res: Response) => {
      try {
        const clientIp = req.ip || req.get('x-forwarded-for') || '';
        
        if (!isPrivateIp(clientIp)) {
          logger.warn(`[Security] Rejected LAN request from non-private IP: ${clientIp}`);
          return res.status(403).json({
            error: "Forbidden",
            message: "LAN requests are only permitted from the local network."
          });
        }

        const { iv, ciphertext, tag, kioskId } = req.body;

        if (!iv || !ciphertext || !tag || !kioskId) {
          logger.warn(`[Security] Rejected unsigned LAN request from ${clientIp}`);
          return res.status(401).json({
            error: "Unauthorized",
            message: "LAN requests must be encrypted."
          });
        }

        // 1. Fetch Signing Secret for this Kiosk
        const kiosk = dbManager.get<{ signingSecret: string }>(
          "SELECT signingSecret FROM kiosks WHERE id = ?",
          [kioskId]
        );

        if (!kiosk || !kiosk.signingSecret) {
          logger.warn(`[Security] Rejected LAN request from unknown or unconfigured kiosk: ${kioskId}`);
          return res.status(401).json({
            error: "Unauthorized",
            message: "Kiosk not registered or signing secret missing."
          });
        }

        // 2. Decrypt Payload
        const key = crypto.createHash('sha256').update(kiosk.signingSecret).digest();
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(tag, 'hex'));

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        const payload = JSON.parse(decrypted);

        // 2.5. Cryptographic Timestamp Verification (Phase 3 Fraud Monitoring)
        const payloadTimestamp = payload.timestamp;
        if (!payloadTimestamp || typeof payloadTimestamp !== 'number') {
            logger.warn(`[Security] Rejected LAN request from ${kioskId} due to missing or invalid timestamp.`);
            return res.status(401).json({
                error: "Unauthorized",
                message: "Payload timestamp is required to prevent replay attacks."
            });
        }
        
        const now = Date.now();
        const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes
        if (Math.abs(now - payloadTimestamp) > MAX_SKEW_MS) {
            logger.warn(`[Security] Rejected LAN request from ${kioskId} due to expired timestamp (skew: ${Math.abs(now - payloadTimestamp)}ms). Possible replay attack or extreme offline drift.`);
            return res.status(401).json({
                error: "Unauthorized",
                message: "Payload timestamp expired or severely out of sync."
            });
        }

        // 3. Process Payload
        const clientId = payload.clientId || req.headers["x-client-id"] || kioskId;
        await syncManager.handleMutation(payload, clientId);
        
        // 4. Encrypt Response
        const responsePayload = JSON.stringify({ success: true });
        const resIv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, resIv);
        let resCiphertext = cipher.update(responsePayload, 'utf8', 'hex');
        resCiphertext += cipher.final('hex');
        const resTag = cipher.getAuthTag();

        res.json({
          iv: resIv.toString('hex'),
          ciphertext: resCiphertext,
          tag: resTag.toString('hex')
        });
      } catch (error: any) {
        logger.error("[SyncRoute] Mutation failed", { error: error.message });
        sendError(
          res,
          500,
          "Sync Failed",
          error.message,
          ERROR_CODES.INTERNAL_ERROR,
        );
      }
    },
  );

  return router;
}
