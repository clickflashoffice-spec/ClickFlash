import crypto from "crypto";
import express, { NextFunction, Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";

import { DatabaseManager } from "../database/db";
import { IMPORT_DIR, PORT, UPLOAD_DIR } from "../config/constants";
import { strictRateLimiter } from "../middleware/rateLimiter";
import {
  EMPTY_SHA256,
  MOBILE_CAPTURE_MASTER_ID,
  canonicalMobileCaptureRequest,
  hmacBase64,
  safeEqualBase64,
  signMasterCaptureReceipt,
  type MasterCaptureReceipt,
  type MobileCaptureOperation,
  type MobileCaptureRequestIdentity,
} from "../services/mobileCaptureProtocol";
import { isPrivateIp } from "../utils/ipUtils";
import { Logger } from "../utils/logger";

interface MobileCaptureContext {
  dbManager: DatabaseManager;
  logger: Logger;
}

interface PairingCodeEntry {
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
}

interface AuthenticatedMobileRequest {
  secretBase64: string;
  identity: MobileCaptureRequestIdentity;
}

interface MobileUploadRow {
  idempotencyKey: string;
  remoteReceiptId: string;
  deviceId: string;
  assetRole: "ORIGINAL" | "QUICK_EDIT";
  assetSha256: string;
  assetByteSize: number;
  originalFilename: string;
  tempPath: string;
  finalPath: string | null;
  bytesReceived: number;
  state: "RECEIVING" | "VERIFYING" | "READY" | "FAILED_REVIEW";
  receiptJson: string | null;
  receiptSignature: string | null;
  readyAt: number | null;
}

const pairingCodes = new Map<string, PairingCodeEntry>();
const activeUploads = new Set<string>();
const PAIRING_TTL_MS = 5 * 60 * 1000;
const REQUEST_CLOCK_SKEW_MS = 5 * 60 * 1000;
const NONCE_RETENTION_MS = 10 * 60 * 1000;
const MAX_PAIRING_CODES = 20;
const MAX_PAIRING_ATTEMPTS = 5;
const MAX_CHUNK_BYTES = 4 * 1024 * 1024;
const MAX_ASSET_BYTES = 4 * 1024 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const DEVICE_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;
const NONCE_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;
const ROLE_PATTERN = /^(ORIGINAL|QUICK_EDIT)$/;
const P256_PUBLIC_KEY_PATTERN = /^[A-Za-z0-9+/]{87}=$/;

const pairingExchangeSchema = z.object({
    codeId: z.string().uuid(),
  deviceId: z.string().regex(DEVICE_ID_PATTERN),
  displayName: z.string().trim().min(1).max(100),
  clientPublicKey: z.string().min(80).max(200),
  proof: z.string().min(40).max(128),
});

function prunePairingCodes(now = Date.now()): void {
  for (const [codeId, entry] of pairingCodes.entries()) {
    if (entry.expiresAt <= now || entry.attemptsRemaining <= 0) {
      pairingCodes.delete(codeId);
    }
  }
  while (pairingCodes.size > MAX_PAIRING_CODES) {
    const oldest = pairingCodes.keys().next().value as string | undefined;
    if (!oldest) break;
    pairingCodes.delete(oldest);
  }
}

function requirePrivateLan(
  logger: Logger
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const clientIp = req.socket.remoteAddress || "";
    if (!isPrivateIp(clientIp)) {
      logger.warn("[MobileCapture] Rejected non-LAN request", { clientIp });
      res.status(403).json({ error: "Mobile capture is available only on the private LAN." });
      return;
    }
    next();
  };
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req.user as { role?: string } | undefined)?.role;
  if (role !== "Admin") {
    res.status(403).json({ error: "Administrator permission is required." });
    return;
  }
  next();
}

function pairingRequestMessage(
  codeId: string,
  deviceId: string,
  clientPublicKey: string
): string {
  return ["CF-PAIR-V1", codeId, deviceId, clientPublicKey].join("\n");
}

function pairingResponseMessage(
  codeId: string,
  deviceId: string,
  clientPublicKey: string,
  serverPublicKey: string
): string {
  return [
    "CF-PAIR-RESPONSE-V1",
    codeId,
    deviceId,
    clientPublicKey,
    serverPublicKey,
    MOBILE_CAPTURE_MASTER_ID,
  ].join("\n");
}

function hmacWithPairingCode(code: string, message: string): string {
  return crypto.createHmac("sha256", code).update(message, "utf8").digest("base64");
}

function header(req: Request, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return typeof value === "string" ? value : "";
}

function readRequestIdentity(
  req: Request,
  operation: MobileCaptureOperation
): MobileCaptureRequestIdentity | null {
  const identity: MobileCaptureRequestIdentity = {
    operation,
    deviceId: header(req, "x-clickflash-device-id"),
    timestamp: header(req, "x-clickflash-timestamp"),
    nonce: header(req, "x-clickflash-nonce"),
    idempotencyKey: header(req, "x-clickflash-idempotency-key"),
    contentSha256: header(req, "x-clickflash-content-sha256"),
    assetSha256: header(req, "x-clickflash-asset-sha256"),
    assetByteSize: header(req, "x-clickflash-asset-size"),
    offset: header(req, "x-clickflash-offset"),
    assetRole: header(req, "x-clickflash-asset-role"),
  };
  const timestamp = Number(identity.timestamp);
  const assetByteSize = Number(identity.assetByteSize);
  const offset = Number(identity.offset);
  if (
    !DEVICE_ID_PATTERN.test(identity.deviceId) ||
    !NONCE_PATTERN.test(identity.nonce) ||
    identity.idempotencyKey.length < 16 ||
    identity.idempotencyKey.length > 512 ||
    !SHA256_PATTERN.test(identity.contentSha256) ||
    !SHA256_PATTERN.test(identity.assetSha256) ||
    !Number.isSafeInteger(timestamp) ||
    !Number.isSafeInteger(assetByteSize) ||
    assetByteSize <= 0 ||
    assetByteSize > MAX_ASSET_BYTES ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !ROLE_PATTERN.test(identity.assetRole)
  ) {
    return null;
  }
  return identity;
}

function authenticateMobileRequest(
  context: MobileCaptureContext,
  operation: MobileCaptureOperation
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const identity = readRequestIdentity(req, operation);
    if (!identity) {
      res.status(400).json({ error: "Invalid mobile capture request headers." });
      return;
    }
    if (Math.abs(Date.now() - Number(identity.timestamp)) > REQUEST_CLOCK_SKEW_MS) {
      res.status(401).json({ error: "Request timestamp is outside the accepted window." });
      return;
    }
    const device = context.dbManager.get<{
      hmac_secret: string;
      revoked_at: number | null;
    }>(
      `SELECT hmac_secret, revoked_at
       FROM mobile_capture_devices
       WHERE device_id = ?`,
      [identity.deviceId]
    );
    if (!device || device.revoked_at) {
      res.status(401).json({ error: "Mobile device is not paired or has been revoked." });
      return;
    }
    const suppliedSignature = header(req, "x-clickflash-signature");
    const expectedSignature = hmacBase64(
      device.hmac_secret,
      canonicalMobileCaptureRequest(identity)
    );
    if (!safeEqualBase64(suppliedSignature, expectedSignature)) {
      res.status(401).json({ error: "Request authentication failed." });
      return;
    }

    try {
      context.dbManager.transaction(() => {
        context.dbManager.run(
          "DELETE FROM mobile_capture_request_nonces WHERE seen_at < ?",
          [Date.now() - NONCE_RETENTION_MS]
        );
        context.dbManager.run(
          `INSERT INTO mobile_capture_request_nonces (device_id, nonce, seen_at)
           VALUES (?, ?, ?)`,
          [identity.deviceId, identity.nonce, Date.now()]
        );
        context.dbManager.run(
          "UPDATE mobile_capture_devices SET last_seen_at = ? WHERE device_id = ?",
          [Date.now(), identity.deviceId]
        );
      });
    } catch {
      res.status(409).json({ error: "Request nonce has already been used." });
      return;
    }

    res.locals.mobileCapture = {
      secretBase64: device.hmac_secret,
      identity,
    } satisfies AuthenticatedMobileRequest;
    next();
  };
}

function uploadSelect(): string {
  return `SELECT
    idempotency_key AS idempotencyKey,
    remote_receipt_id AS remoteReceiptId,
    device_id AS deviceId,
    asset_role AS assetRole,
    asset_sha256 AS assetSha256,
    asset_byte_size AS assetByteSize,
    original_filename AS originalFilename,
    temp_path AS tempPath,
    final_path AS finalPath,
    bytes_received AS bytesReceived,
    state,
    receipt_json AS receiptJson,
    receipt_signature AS receiptSignature,
    ready_at AS readyAt
  FROM mobile_capture_uploads`;
}

function getUpload(
  dbManager: DatabaseManager,
  idempotencyKey: string
): MobileUploadRow | undefined {
  return dbManager.get<MobileUploadRow>(
    `${uploadSelect()} WHERE idempotency_key = ?`,
    [idempotencyKey]
  );
}

function uploadMatchesIdentity(
  upload: MobileUploadRow,
  identity: MobileCaptureRequestIdentity
): boolean {
  return (
    upload.deviceId === identity.deviceId &&
    upload.idempotencyKey === identity.idempotencyKey &&
    upload.assetSha256 === identity.assetSha256.toLowerCase() &&
    upload.assetByteSize === Number(identity.assetByteSize) &&
    upload.assetRole === identity.assetRole
  );
}

function decodeFilename(value: string): string {
  let decoded = "";
  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw new Error("Filename encoding is invalid.");
  }
  const filename = path.basename(decoded).replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!filename || filename.length > 180) {
    throw new Error("Filename is invalid.");
  }
  return filename;
}

async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

async function verifyExistingFinal(
  filePath: string,
  expectedSize: number,
  expectedSha256: string
): Promise<boolean> {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  return (
    stat.isFile() &&
    stat.size === expectedSize &&
    (await sha256File(filePath)) === expectedSha256
  );
}

function receiptResponse(upload: MobileUploadRow): {
  receipt: MasterCaptureReceipt;
  signature: string;
} | null {
  if (!upload.receiptJson || !upload.receiptSignature) return null;
  return {
    receipt: JSON.parse(upload.receiptJson) as MasterCaptureReceipt,
    signature: upload.receiptSignature,
  };
}

export function mobileCaptureAdminRoutes(context: MobileCaptureContext): Router {
  const router = express.Router();
  router.use(requireAdmin);

  router.post("/pairing-codes", strictRateLimiter, (req, res) => {
    prunePairingCodes();
    const codeId = crypto.randomUUID();
    const code = crypto.randomBytes(18).toString("base64url");
    const expiresAt = Date.now() + PAIRING_TTL_MS;
    pairingCodes.set(codeId, {
      code,
      expiresAt,
      attemptsRemaining: MAX_PAIRING_ATTEMPTS,
    });
    res.status(201).json({
      token: `CF1.${codeId}.${code}`,
      expiresAt,
      masterId: MOBILE_CAPTURE_MASTER_ID,
      protocol: "CF-PAIR-V1",
    });
  });

  router.get("/devices", (_req, res) => {
    const devices = context.dbManager.query(
      `SELECT
         device_id AS deviceId,
         display_name AS displayName,
         master_id AS masterId,
         paired_at AS pairedAt,
         last_seen_at AS lastSeenAt,
         revoked_at AS revokedAt
       FROM mobile_capture_devices
       ORDER BY paired_at DESC`
    );
    res.json({ devices });
  });

  router.delete("/devices/:deviceId", strictRateLimiter, (req, res) => {
    const result = context.dbManager.run(
      "UPDATE mobile_capture_devices SET revoked_at = ? WHERE device_id = ?",
      [Date.now(), req.params.deviceId]
    );
    if (result.changes === 0) {
      res.status(404).json({ error: "Mobile device was not found." });
      return;
    }
    res.status(204).end();
  });

  return router;
}

export function mobileCapturePublicRoutes(context: MobileCaptureContext): Router {
  const router = express.Router();
  router.use(requirePrivateLan(context.logger));

  router.get("/health", (req, res) => {
    res.json({
      service: "clickflash-mobile-capture",
      protocol: "CF-MOBILE-V1",
      masterId: MOBILE_CAPTURE_MASTER_ID,
      transport: req.secure ? "https" : "http",
      port: PORT,
    });
  });

  router.post("/pair", strictRateLimiter, (req, res) => {
    prunePairingCodes();
    const parsed = pairingExchangeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Pairing request is invalid." });
      return;
    }
    const { codeId, deviceId, displayName, clientPublicKey, proof } = parsed.data;
    const entry = pairingCodes.get(codeId);
    if (!entry || entry.expiresAt <= Date.now()) {
      res.status(404).json({ error: "Pairing code is invalid or expired." });
      return;
    }
    entry.attemptsRemaining -= 1;
    const expectedProof = hmacWithPairingCode(
      entry.code,
      pairingRequestMessage(codeId, deviceId, clientPublicKey)
    );
    if (!safeEqualBase64(proof, expectedProof)) {
      if (entry.attemptsRemaining <= 0) pairingCodes.delete(codeId);
      res.status(401).json({ error: "Pairing proof is invalid." });
      return;
    }

    let clientPublicBytes: Buffer;
    try {
      if (!P256_PUBLIC_KEY_PATTERN.test(clientPublicKey)) {
        throw new Error("Invalid public key encoding.");
      }
      clientPublicBytes = Buffer.from(clientPublicKey, "base64");
      if (clientPublicBytes.length !== 65 || clientPublicBytes[0] !== 4) {
        throw new Error("Invalid public key.");
      }
    } catch {
      res.status(400).json({ error: "Client public key is invalid." });
      return;
    }

    try {
      const serverEcdh = crypto.createECDH("prime256v1");
      serverEcdh.generateKeys();
      const serverPublicKey = serverEcdh.getPublicKey("base64", "uncompressed");
      const sharedSecret = serverEcdh.computeSecret(clientPublicBytes);
      const transcript = pairingResponseMessage(
        codeId,
        deviceId,
        clientPublicKey,
        serverPublicKey
      );
      const pairSecret = Buffer.from(
        crypto.hkdfSync(
          "sha256",
          sharedSecret,
          Buffer.from(entry.code, "utf8"),
          Buffer.from(transcript, "utf8"),
          32
        )
      ).toString("base64");
      const responseProof = hmacWithPairingCode(entry.code, transcript);
      const now = Date.now();
      context.dbManager.run(
        `INSERT INTO mobile_capture_devices (
           device_id, display_name, hmac_secret, master_id,
           paired_at, last_seen_at, revoked_at
         )
         VALUES (?, ?, ?, ?, ?, ?, NULL)
         ON CONFLICT(device_id) DO UPDATE SET
           display_name = excluded.display_name,
           hmac_secret = excluded.hmac_secret,
           master_id = excluded.master_id,
           paired_at = excluded.paired_at,
           last_seen_at = excluded.last_seen_at,
           revoked_at = NULL`,
        [
          deviceId,
          displayName,
          pairSecret,
          MOBILE_CAPTURE_MASTER_ID,
          now,
          now,
        ]
      );
      pairingCodes.delete(codeId);
      context.logger.info("[MobileCapture] Android photographer paired", {
        deviceId,
        masterId: MOBILE_CAPTURE_MASTER_ID,
      });
      res.json({
        protocol: "CF-MOBILE-V1",
        masterId: MOBILE_CAPTURE_MASTER_ID,
        serverPublicKey,
        proof: responseProof,
        transport: req.secure ? "https" : "http",
        port: PORT,
        pairedAt: now,
      });
    } catch (error) {
      context.logger.error("[MobileCapture] Pairing key exchange failed", {
        deviceId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(400).json({ error: "Pairing key exchange failed." });
    }
  });

  router.get(
    "/uploads/:idempotencyKey/status",
    authenticateMobileRequest(context, "STATUS"),
    (req, res) => {
      const auth = res.locals.mobileCapture as AuthenticatedMobileRequest;
      if (auth.identity.contentSha256.toLowerCase() !== EMPTY_SHA256) {
        res.status(400).json({ error: "Status request body identity is invalid." });
        return;
      }
      if (auth.identity.idempotencyKey !== req.params.idempotencyKey) {
        res.status(400).json({ error: "Idempotency identity is inconsistent." });
        return;
      }
      const upload = getUpload(context.dbManager, auth.identity.idempotencyKey);
      if (!upload) {
        res.json({ state: "MISSING", expectedOffset: 0 });
        return;
      }
      if (
        !uploadMatchesIdentity(upload, auth.identity)
      ) {
        res.status(409).json({ error: "Upload identity does not match the existing record." });
        return;
      }
      res.json({
        state: upload.state,
        expectedOffset: upload.bytesReceived,
        ...(upload.state === "READY" ? receiptResponse(upload) : {}),
      });
    }
  );

  router.put(
    "/uploads/:idempotencyKey/chunks",
    express.raw({ type: "application/octet-stream", limit: `${MAX_CHUNK_BYTES}b` }),
    authenticateMobileRequest(context, "CHUNK"),
    (req, res) => {
      const auth = res.locals.mobileCapture as AuthenticatedMobileRequest;
      const identity = auth.identity;
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (
        body.length === 0 ||
        body.length > MAX_CHUNK_BYTES ||
        crypto.createHash("sha256").update(body).digest("hex") !==
          identity.contentSha256.toLowerCase()
      ) {
        res.status(400).json({ error: "Chunk content identity is invalid." });
        return;
      }
      if (identity.idempotencyKey !== req.params.idempotencyKey) {
        res.status(400).json({ error: "Idempotency identity is inconsistent." });
        return;
      }
      if (activeUploads.has(identity.idempotencyKey)) {
        res.status(409).json({ error: "Upload is already being updated." });
        return;
      }

      activeUploads.add(identity.idempotencyKey);
      try {
        const assetByteSize = Number(identity.assetByteSize);
        const offset = Number(identity.offset);
        if (offset + body.length > assetByteSize) {
          res.status(400).json({ error: "Chunk exceeds the declared asset size." });
          return;
        }
        const filename = decodeFilename(header(req, "x-clickflash-filename"));
        const safeDevice = identity.deviceId.replace(/[^a-zA-Z0-9._-]/g, "_");
        const tempDirectory = path.join(IMPORT_DIR, "mobile-capture", safeDevice);
        fs.mkdirSync(tempDirectory, { recursive: true });
        const remoteReceiptId = `master-${crypto
          .createHash("sha256")
          .update(identity.idempotencyKey)
          .digest("hex")
          .slice(0, 32)}`;
        const tempPath = path.join(tempDirectory, `${remoteReceiptId}.part`);
        const existing = getUpload(context.dbManager, identity.idempotencyKey);
        if (
          existing &&
          (!uploadMatchesIdentity(existing, identity) ||
            existing.originalFilename !== filename)
        ) {
          res.status(409).json({ error: "Upload identity changed after creation." });
          return;
        }
        if (existing?.state === "READY") {
          res.status(409).json({
            error: "Upload is already complete.",
            expectedOffset: existing.bytesReceived,
          });
          return;
        }
        const expectedOffset = existing?.bytesReceived ?? 0;
        if (offset !== expectedOffset) {
          res.status(409).json({
            error: "Chunk offset does not match the durable server offset.",
            expectedOffset,
          });
          return;
        }

        const handle = fs.openSync(tempPath, offset === 0 ? "w" : "r+");
        try {
          fs.writeSync(handle, body, 0, body.length, offset);
          fs.fsyncSync(handle);
        } finally {
          fs.closeSync(handle);
        }
        const now = Date.now();
        const bytesReceived = offset + body.length;
        context.dbManager.run(
          `INSERT INTO mobile_capture_uploads (
             idempotency_key, remote_receipt_id, device_id, asset_role,
             asset_sha256, asset_byte_size, original_filename, temp_path,
             bytes_received, state, created_at, updated_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVING', ?, ?)
           ON CONFLICT(idempotency_key) DO UPDATE SET
             bytes_received = excluded.bytes_received,
             state = 'RECEIVING',
             updated_at = excluded.updated_at`,
          [
            identity.idempotencyKey,
            remoteReceiptId,
            identity.deviceId,
            identity.assetRole,
            identity.assetSha256.toLowerCase(),
            assetByteSize,
            filename,
            tempPath,
            bytesReceived,
            now,
            now,
          ]
        );
        res.json({
          state: "RECEIVING",
          expectedOffset: bytesReceived,
          complete: bytesReceived === assetByteSize,
        });
      } catch (error) {
        context.logger.error("[MobileCapture] Chunk persistence failed", {
          deviceId: identity.deviceId,
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Chunk could not be persisted." });
      } finally {
        activeUploads.delete(identity.idempotencyKey);
      }
    }
  );

  router.post(
    "/uploads/:idempotencyKey/commit",
    authenticateMobileRequest(context, "COMMIT"),
    async (req, res) => {
      const auth = res.locals.mobileCapture as AuthenticatedMobileRequest;
      const identity = auth.identity;
      if (
        identity.contentSha256.toLowerCase() !== EMPTY_SHA256 ||
        identity.idempotencyKey !== req.params.idempotencyKey
      ) {
        res.status(400).json({ error: "Commit identity is invalid." });
        return;
      }
      if (activeUploads.has(identity.idempotencyKey)) {
        res.status(409).json({ error: "Upload is already being updated." });
        return;
      }
      activeUploads.add(identity.idempotencyKey);
      try {
        const upload = getUpload(context.dbManager, identity.idempotencyKey);
        if (!upload) {
          res.status(404).json({ error: "Upload has not started." });
          return;
        }
        if (!uploadMatchesIdentity(upload, identity)) {
          res.status(409).json({
            error: "Upload identity does not match the authenticated request.",
          });
          return;
        }
        if (upload.state === "READY") {
          res.json(receiptResponse(upload));
          return;
        }
        if (
          upload.bytesReceived !== upload.assetByteSize ||
          !fs.existsSync(upload.tempPath)
        ) {
          res.status(409).json({
            error: "Upload is incomplete.",
            expectedOffset: upload.bytesReceived,
          });
          return;
        }
        context.dbManager.run(
          "UPDATE mobile_capture_uploads SET state = 'VERIFYING', updated_at = ? WHERE idempotency_key = ?",
          [Date.now(), upload.idempotencyKey]
        );
        const actualSha256 = await sha256File(upload.tempPath);
        if (actualSha256 !== upload.assetSha256) {
          context.dbManager.run(
            `UPDATE mobile_capture_uploads
             SET state = 'FAILED_REVIEW', updated_at = ?
             WHERE idempotency_key = ?`,
            [Date.now(), upload.idempotencyKey]
          );
          res.status(422).json({ error: "Completed upload checksum does not match." });
          return;
        }

        const extension = path.extname(upload.originalFilename).toLowerCase();
        const safeExtension = [".jpg", ".jpeg", ".nef"].includes(extension)
          ? extension
          : upload.assetRole === "ORIGINAL"
            ? ".bin"
            : ".jpg";
        const finalDirectory = path.join(
          UPLOAD_DIR,
          "mobile-capture",
          upload.assetSha256.slice(0, 2)
        );
        const finalPath = path.join(
          finalDirectory,
          `${upload.assetSha256}${safeExtension}`
        );
        fs.mkdirSync(finalDirectory, { recursive: true });
        if (
          !(await verifyExistingFinal(
            finalPath,
            upload.assetByteSize,
            upload.assetSha256
          ))
        ) {
          fs.copyFileSync(upload.tempPath, finalPath);
          const finalHandle = fs.openSync(finalPath, "r");
          try {
            fs.fsyncSync(finalHandle);
          } finally {
            fs.closeSync(finalHandle);
          }
          if (
            !(await verifyExistingFinal(
              finalPath,
              upload.assetByteSize,
              upload.assetSha256
            ))
          ) {
            throw new Error("Final durable copy verification failed.");
          }
        }

        const receipt: MasterCaptureReceipt = {
          destination: "MASTER",
          remoteReceiptId: upload.remoteReceiptId,
          idempotencyKey: upload.idempotencyKey,
          assetSha256: upload.assetSha256,
          assetByteSize: upload.assetByteSize,
          persisted: true,
          checksumVerified: true,
          metadataCommitted: true,
          processingQueued: true,
        };
        const signature = signMasterCaptureReceipt(auth.secretBase64, receipt);
        const now = Date.now();
        context.dbManager.transaction(() => {
          context.dbManager.run(
            `UPDATE mobile_capture_uploads
             SET final_path = ?,
                 state = 'READY',
                 receipt_json = ?,
                 receipt_signature = ?,
                 updated_at = ?,
                 ready_at = ?
             WHERE idempotency_key = ?`,
            [
              finalPath,
              JSON.stringify(receipt),
              signature,
              now,
              now,
              upload.idempotencyKey,
            ]
          );
          context.dbManager.run(
            `INSERT INTO mobile_capture_processing_queue (
               id, idempotency_key, asset_sha256, local_path,
               state, created_at, updated_at
             )
             VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
             ON CONFLICT(idempotency_key) DO NOTHING`,
            [
              `${upload.remoteReceiptId}:processing`,
              upload.idempotencyKey,
              upload.assetSha256,
              finalPath,
              now,
              now,
            ]
          );
        });
        fs.rmSync(upload.tempPath, { force: true });
        context.logger.info("[MobileCapture] Capture committed", {
          deviceId: upload.deviceId,
          receiptId: upload.remoteReceiptId,
          assetSha256: upload.assetSha256,
        });
        res.json({ receipt, signature });
      } catch (error) {
        context.logger.error("[MobileCapture] Commit failed", {
          deviceId: identity.deviceId,
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Upload commit failed." });
      } finally {
        activeUploads.delete(identity.idempotencyKey);
      }
    }
  );

  return router;
}

export function resetMobileCapturePairingCodesForTest(): void {
  pairingCodes.clear();
}
