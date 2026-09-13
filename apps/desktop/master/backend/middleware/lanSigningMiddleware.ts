import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import type { FastifyRequest, FastifyReply } from "fastify";
import { isPrivateIp } from "../utils/ipUtils";
import DatabaseManager from "../database/db";
import { Logger } from "../utils/logger";

export interface LanSignatureVerificationOptions {
  clientIp: string;
  kioskId?: string;
  timestamp?: string;
  signature?: string;
  method: string;
  path: string;
  body?: any;
  getSigningSecret: (kioskId: string) => string | null | undefined;
  maxSkewMs?: number;
}

export interface VerificationResult {
  valid: boolean;
  statusCode?: number;
  error?: string;
  message?: string;
}

/**
 * Stable canonicalization of JSON objects for HMAC hashing.
 */
export const canonicalJson = (obj: any): string => {
  if (obj === null || obj === undefined) return "";
  if (typeof obj !== "object") return String(obj);
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => (typeof item === "object" ? canonicalJson(item) : JSON.stringify(item))).join(",")}]`;
  }
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `"${k}":${typeof obj[k] === "object" ? canonicalJson(obj[k]) : JSON.stringify(obj[k])}`).join(",")}}`;
};

/**
 * Pure verification logic for LAN request signatures.
 */
export function verifyLanSignatureCore(options: LanSignatureVerificationOptions): VerificationResult {
  const {
    clientIp,
    kioskId,
    timestamp,
    signature,
    method,
    path,
    body,
    getSigningSecret,
    maxSkewMs = 5 * 60 * 1000,
  } = options;

  if (!isPrivateIp(clientIp)) {
    return {
      valid: false,
      statusCode: 403,
      error: "Forbidden",
      message: "LAN requests are only permitted from the local network.",
    };
  }

  if (!kioskId || !timestamp || !signature) {
    return {
      valid: false,
      statusCode: 401,
      error: "Unauthorized",
      message: "LAN requests must be signed with a valid Kiosk ID and signature.",
    };
  }

  // 1. Replay Prevention (±5 minute clock skew)
  const requestTime = parseInt(timestamp, 10);
  const now = Date.now();
  if (isNaN(requestTime) || Math.abs(now - requestTime) > maxSkewMs) {
    return {
      valid: false,
      statusCode: 401,
      error: "Unauthorized",
      message: "Request timestamp is invalid or too old.",
    };
  }

  // 2. Fetch Signing Secret for this Kiosk
  const signingSecret = getSigningSecret(kioskId);
  if (!signingSecret) {
    return {
      valid: false,
      statusCode: 401,
      error: "Unauthorized",
      message: "Kiosk not registered or signing secret missing.",
    };
  }

  // 3. Verify Signature (HMAC-SHA256)
  const bodyStr = body && Object.keys(body).length > 0 ? canonicalJson(body) : "";
  const cleanPath = path.split("?")[0];
  const payload = `${kioskId}:${timestamp}:${method.toUpperCase()}:${cleanPath}:${bodyStr}`;

  const expectedSignature = crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison to prevent side-channel timing attacks
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (
    signatureBuffer.length === 0 ||
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return {
      valid: false,
      statusCode: 401,
      error: "Unauthorized",
      message: "Invalid request signature.",
    };
  }

  return { valid: true };
}

/**
 * Express middleware for LAN request signing.
 */
export const lanSigningMiddleware = (
  dbManager: DatabaseManager,
  logger: Logger,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIp = req.ip || (req.headers["x-forwarded-for"] as string) || "";
      const kioskId = req.headers["x-kiosk-id"] as string;
      const timestamp = req.headers["x-timestamp"] as string;
      const signature = req.headers["x-signature"] as string;

      const result = verifyLanSignatureCore({
        clientIp,
        kioskId,
        timestamp,
        signature,
        method: req.method,
        path: req.originalUrl || req.path,
        body: req.body,
        getSigningSecret: (id) => {
          const kiosk = dbManager.get<{ signingSecret: string }>(
            "SELECT signingSecret FROM kiosks WHERE id = ?",
            [id],
          );
          return kiosk?.signingSecret;
        },
      });

      if (!result.valid) {
        logger.warn(`[Security] Express LAN signing rejected: ${result.message}`, {
          clientIp,
          kioskId,
          url: req.originalUrl,
        });
        return res.status(result.statusCode || 401).json({
          error: result.error,
          message: result.message,
        });
      }

      next();
    } catch (error: any) {
      logger.error(`[Security] LAN signing verification error:`, error?.message);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to verify request signature.",
      });
    }
  };
};

/**
 * Fastify preHandler hook for LAN request signing.
 */
export const createFastifyLanSigningHook = (
  dbManager: DatabaseManager,
  logger: Logger,
) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const clientIp = request.ip || (request.headers["x-forwarded-for"] as string) || "";
      const kioskId = request.headers["x-kiosk-id"] as string;
      const timestamp = request.headers["x-timestamp"] as string;
      const signature = request.headers["x-signature"] as string;

      const result = verifyLanSignatureCore({
        clientIp,
        kioskId,
        timestamp,
        signature,
        method: request.method,
        path: request.url,
        body: request.body,
        getSigningSecret: (id) => {
          const kiosk = dbManager.get<{ signingSecret: string }>(
            "SELECT signingSecret FROM kiosks WHERE id = ?",
            [id],
          );
          return kiosk?.signingSecret;
        },
      });

      if (!result.valid) {
        logger.warn(`[Security] Fastify LAN signing rejected: ${result.message}`, {
          clientIp,
          kioskId,
          url: request.url,
        });
        return reply.status(result.statusCode || 401).send({
          error: result.error,
          message: result.message,
        });
      }
    } catch (error: any) {
      logger.error(`[Security] Fastify LAN signing hook error:`, error?.message);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to verify request signature.",
      });
    }
  };
};

