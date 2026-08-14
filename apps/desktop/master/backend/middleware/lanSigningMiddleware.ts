import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

import { isPrivateIp } from '../utils/ipUtils';
import DatabaseManager from '../database/db';
import { Logger } from '../utils/logger';

export const lanSigningMiddleware = (

  dbManager: DatabaseManager,
  logger: Logger,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET requests to non-sensitive endpoints if needed,
    // but for bridge/orders everything should be signed.

    const clientIp = req.ip || req.get('x-forwarded-for') || '';
    
    if (!isPrivateIp(clientIp)) {

      logger.warn(`[Security] Rejected LAN request from non-private IP: ${clientIp}`, {
        url: req.originalUrl
      });
      return res.status(403).json({
        error: "Forbidden",
        message: "LAN requests are only permitted from the local network."
      });
    }

    const kioskId = req.headers["x-kiosk-id"] as string;
    const timestamp = req.headers["x-timestamp"] as string;
    const signature = req.headers["x-signature"] as string;


    if (!kioskId || !timestamp || !signature) {
      logger.warn(`[Security] Rejected unsigned LAN request from ${req.ip}`, {
        url: req.originalUrl,
        missing: {
          kioskId: !kioskId,
          timestamp: !timestamp,
          signature: !signature,
        },
      });
      return res.status(401).json({
        error: "Unauthorized",
        message:
          "LAN requests must be signed with a valid Kiosk ID and signature.",
      });
    }

    // 1. Prevent Replay Attacks (Max 5 minute clock skew)
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
      logger.warn(
        `[Security] Rejected LAN request with invalid timestamp from ${kioskId}`,
        { timestamp },
      );
      return res
        .status(401)
        .json({
          error: "Unauthorized",
          message: "Request timestamp is invalid or too old.",
        });
    }

    // 2. Fetch Signing Secret for this Kiosk
    try {
      const kiosk = dbManager.get<{ signingSecret: string }>(
        "SELECT signingSecret FROM kiosks WHERE id = ?",
        [kioskId],
      );

      if (!kiosk || !kiosk.signingSecret) {
        logger.warn(
          `[Security] Rejected LAN request from unknown or unconfigured kiosk: ${kioskId}`,
        );
        return res
          .status(401)
          .json({
            error: "Unauthorized",
            message: "Kiosk not registered or signing secret missing.",
          });
      }

      // 3. Verify Signature (HMAC-SHA256)
      // Law 16: Ensure stable payload canonicalization
      const canonicalJson = (obj: any): string => {
        if (!obj || typeof obj !== "object") return String(obj);
        const keys = Object.keys(obj).sort();
        return `{${keys.map((k) => `"${k}":${typeof obj[k] === "object" ? canonicalJson(obj[k]) : JSON.stringify(obj[k])}`).join(",")}}`;
      };

      const bodyStr =
        req.body && Object.keys(req.body).length > 0
          ? canonicalJson(req.body)
          : "";
      const payload = `${kioskId}:${timestamp}:${req.method}:${req.path}:${bodyStr}`;

      const expectedSignature = crypto
        .createHmac("sha256", kiosk.signingSecret)
        .update(payload)
        .digest("hex");

      if (signature !== expectedSignature) {
        logger.warn(`[Security] Invalid signature from kiosk ${kioskId}`, {
          expected: expectedSignature.substring(0, 8) + "...",
          received: signature.substring(0, 8) + "...",
        });
        return res
          .status(401)
          .json({
            error: "Unauthorized",
            message: "Invalid request signature.",
          });
      }

      // Success!
      next();
    } catch (error: any) {
      logger.error(
        `[Security] LAN signing verification failed for ${kioskId}:`,
        error.message,
      );
      res
        .status(500)
        .json({
          error: "Internal Server Error",
          message: "Failed to verify request signature.",
        });
    }
  };
};
