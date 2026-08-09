import crypto from "crypto";
import os from "os";

export const MOBILE_CAPTURE_PROTOCOL = "CF-MOBILE-V1";
export const MOBILE_CAPTURE_RECEIPT_PROTOCOL = "CF-RECEIPT-V1";
export const MOBILE_COMMAND_CENTER_REQUEST_PROTOCOL =
  "CF-MOBILE-COMMAND-CENTER-REQUEST-V2";
export const MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL =
  "CF-MOBILE-COMMAND-CENTER-ENCRYPTED-RESPONSE-V1";
export const MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL = "CF-AEAD-V1";
export const MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM = "A256GCM";
export const MOBILE_COMMAND_CENTER_PATH =
  "/api/v1/mobile-capture/photographer/me/command-center";
export const MOBILE_CAPTURE_MASTER_ID =
  process.env.DESK_ID?.trim() || `master-${os.hostname()}`;
export const EMPTY_SHA256 = crypto.createHash("sha256").update("").digest("hex");

export type MobileCaptureOperation = "STATUS" | "CHUNK" | "COMMIT";
export type MobileCommandCenterPeriod = "TODAY" | "7D" | "30D";

export interface MobileCommandCenterRequestIdentity {
  masterId: string;
  deviceId: string;
  encryptionProtocol: string;
  keyEpoch: string;
  timestamp: string;
  nonce: string;
  period: MobileCommandCenterPeriod;
}

export interface MobileCaptureRequestIdentity {
  operation: MobileCaptureOperation;
  deviceId: string;
  encryptionProtocol: string;
  keyEpoch: string;
  timestamp: string;
  nonce: string;
  idempotencyKey: string;
  contentSha256: string;
  assetSha256: string;
  assetByteSize: string;
  offset: string;
  assetRole: string;
}

export interface MasterCaptureReceipt {
  destination: "MASTER";
  remoteReceiptId: string;
  idempotencyKey: string;
  assetSha256: string;
  assetByteSize: number;
  persisted: boolean;
  checksumVerified: boolean;
  metadataCommitted: boolean;
  processingQueued: boolean;
}

export function canonicalMobileCaptureRequest(
  identity: MobileCaptureRequestIdentity
): string {
  return [
    MOBILE_CAPTURE_PROTOCOL,
    identity.operation,
    identity.encryptionProtocol,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
    identity.idempotencyKey,
    identity.contentSha256.toLowerCase(),
    identity.assetSha256.toLowerCase(),
    identity.assetByteSize,
    identity.offset,
    identity.assetRole,
  ].join("\n");
}

export function canonicalMobileCaptureEncryptionKeyInfo(
  identity: MobileCaptureRequestIdentity,
  masterId: string,
  direction: "MOBILE_TO_MASTER" | "MASTER_TO_MOBILE"
): string {
  return [
    "CF-AEAD-HKDF-SHA256-V1",
    `CAPTURE_${identity.operation}`,
    direction,
    masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
  ].join("\n");
}

export function canonicalMobileCaptureAad(
  identity: MobileCaptureRequestIdentity,
  masterId: string,
  direction: "MOBILE_TO_MASTER" | "MASTER_TO_MOBILE"
): string {
  return [
    MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
    MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM,
    `CAPTURE_${identity.operation}`,
    direction,
    masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
    identity.idempotencyKey,
    identity.assetSha256.toLowerCase(),
    identity.assetByteSize,
    identity.offset,
    identity.assetRole,
  ].join("\n");
}

export function canonicalMobileCommandCenterRequest(
  identity: MobileCommandCenterRequestIdentity
): string {
  return [
    MOBILE_COMMAND_CENTER_REQUEST_PROTOCOL,
    "GET",
    MOBILE_COMMAND_CENTER_PATH,
    identity.encryptionProtocol,
    identity.masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
    identity.period,
  ].join("\n");
}

export function canonicalMobileCommandCenterResponse(
  identity: MobileCommandCenterRequestIdentity,
  bodySha256: string
): string {
  return [
    MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL,
    "200",
    identity.encryptionProtocol,
    identity.masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.nonce,
    bodySha256.toLowerCase(),
  ].join("\n");
}

export function canonicalMobileCommandCenterEncryptionKeyInfo(
  identity: MobileCommandCenterRequestIdentity
): string {
  return [
    "CF-AEAD-HKDF-SHA256-V1",
    "COMMAND_CENTER_RESPONSE",
    "MASTER_TO_MOBILE",
    identity.masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
  ].join("\n");
}

export function canonicalMobileCommandCenterResponseAad(
  identity: MobileCommandCenterRequestIdentity
): string {
  return [
    MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
    MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM,
    "COMMAND_CENTER_RESPONSE",
    "MASTER_TO_MOBILE",
    "GET",
    MOBILE_COMMAND_CENTER_PATH,
    "200",
    identity.masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
    identity.period,
  ].join("\n");
}

export function canonicalMasterCaptureReceipt(
  receipt: MasterCaptureReceipt
): string {
  return [
    MOBILE_CAPTURE_RECEIPT_PROTOCOL,
    receipt.destination,
    receipt.remoteReceiptId,
    receipt.idempotencyKey,
    receipt.assetSha256.toLowerCase(),
    String(receipt.assetByteSize),
    receipt.persisted ? "1" : "0",
    receipt.checksumVerified ? "1" : "0",
    receipt.metadataCommitted ? "1" : "0",
    receipt.processingQueued ? "1" : "0",
  ].join("\n");
}

export function hmacBase64(secretBase64: string, message: string): string {
  return crypto
    .createHmac("sha256", Buffer.from(secretBase64, "base64"))
    .update(message, "utf8")
    .digest("base64");
}

export function safeEqualBase64(actual: string, expected: string): boolean {
  const hmacBase64Pattern = /^[A-Za-z0-9+/]{43}=$/;
  if (
    !hmacBase64Pattern.test(actual) ||
    !hmacBase64Pattern.test(expected)
  ) {
    return false;
  }
  try {
    const actualBytes = Buffer.from(actual, "base64");
    const expectedBytes = Buffer.from(expected, "base64");
    return (
      actualBytes.length === expectedBytes.length &&
      crypto.timingSafeEqual(actualBytes, expectedBytes)
    );
  } catch {
    return false;
  }
}

export function signMasterCaptureReceipt(
  secretBase64: string,
  receipt: MasterCaptureReceipt
): string {
  return hmacBase64(secretBase64, canonicalMasterCaptureReceipt(receipt));
}
