import type {
  CaptureAssetRole,
  DeliveryReceiptProof,
} from './CaptureDelivery';

export const MOBILE_CAPTURE_PROTOCOL = 'CF-MOBILE-V1';
export const MOBILE_CAPTURE_RECEIPT_PROTOCOL = 'CF-RECEIPT-V1';
export const MOBILE_COMMAND_CENTER_REQUEST_PROTOCOL =
  'CF-MOBILE-COMMAND-CENTER-REQUEST-V2';
export const MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL =
  'CF-MOBILE-COMMAND-CENTER-ENCRYPTED-RESPONSE-V1';
export const MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL = 'CF-AEAD-V1';
export const MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM = 'A256GCM';
export const MOBILE_COMMAND_CENTER_PATH =
  '/api/v1/mobile-capture/photographer/me/command-center';
export const MOBILE_CAPTURE_MASTER_ID = 'MASTER';
export const EMPTY_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export type MobileCaptureOperation = 'STATUS' | 'CHUNK' | 'COMMIT';
export type MobileCommandCenterPeriod = 'TODAY' | '7D' | '30D';

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
  assetRole: CaptureAssetRole;
}

export interface MasterCaptureReceipt
  extends Omit<
    DeliveryReceiptProof,
    'authenticated' | 'indexed' | 'displayable' | 'published' | 'signature'
  > {
  destination: 'MASTER';
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
  ].join('\n');
}

export function canonicalMobileCaptureEncryptionKeyInfo(
  identity: MobileCaptureRequestIdentity,
  masterId: string,
  direction: 'MOBILE_TO_MASTER' | 'MASTER_TO_MOBILE'
): string {
  return [
    'CF-AEAD-HKDF-SHA256-V1',
    `CAPTURE_${identity.operation}`,
    direction,
    masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
  ].join('\n');
}

export function canonicalMobileCaptureAad(
  identity: MobileCaptureRequestIdentity,
  masterId: string,
  direction: 'MOBILE_TO_MASTER' | 'MASTER_TO_MOBILE'
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
  ].join('\n');
}

export function canonicalMobileCommandCenterRequest(
  identity: MobileCommandCenterRequestIdentity
): string {
  return [
    MOBILE_COMMAND_CENTER_REQUEST_PROTOCOL,
    'GET',
    MOBILE_COMMAND_CENTER_PATH,
    identity.encryptionProtocol,
    identity.masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
    identity.period,
  ].join('\n');
}

export function canonicalMobileCommandCenterResponse(
  identity: MobileCommandCenterRequestIdentity,
  bodySha256: string
): string {
  return [
    MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL,
    '200',
    identity.encryptionProtocol,
    identity.masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.nonce,
    bodySha256.toLowerCase(),
  ].join('\n');
}

export function canonicalMobileCommandCenterEncryptionKeyInfo(
  identity: MobileCommandCenterRequestIdentity
): string {
  return [
    'CF-AEAD-HKDF-SHA256-V1',
    'COMMAND_CENTER_RESPONSE',
    'MASTER_TO_MOBILE',
    identity.masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
  ].join('\n');
}

export function canonicalMobileCommandCenterResponseAad(
  identity: MobileCommandCenterRequestIdentity
): string {
  return [
    MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
    MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM,
    'COMMAND_CENTER_RESPONSE',
    'MASTER_TO_MOBILE',
    'GET',
    MOBILE_COMMAND_CENTER_PATH,
    '200',
    identity.masterId,
    identity.deviceId,
    identity.keyEpoch,
    identity.timestamp,
    identity.nonce,
    identity.period,
  ].join('\n');
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
    receipt.persisted ? '1' : '0',
    receipt.checksumVerified ? '1' : '0',
    receipt.metadataCommitted ? '1' : '0',
    receipt.processingQueued ? '1' : '0',
  ].join('\n');
}

export function pairingRequestMessage(
  codeId: string,
  deviceId: string,
  clientPublicKey: string
): string {
  return ['CF-PAIR-V1', codeId, deviceId, clientPublicKey].join('\n');
}

export function pairingResponseMessage(
  codeId: string,
  deviceId: string,
  clientPublicKey: string,
  serverPublicKey: string,
  masterId: string
): string {
  return [
    'CF-PAIR-RESPONSE-V1',
    codeId,
    deviceId,
    clientPublicKey,
    serverPublicKey,
    masterId,
  ].join('\n');
}

export function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export default {
  MOBILE_CAPTURE_PROTOCOL,
  MOBILE_CAPTURE_RECEIPT_PROTOCOL,
  MOBILE_COMMAND_CENTER_PATH,
  MOBILE_COMMAND_CENTER_REQUEST_PROTOCOL,
  MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL,
  MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM,
  MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
  EMPTY_SHA256,
  bytesToHex,
  canonicalMasterCaptureReceipt,
  canonicalMobileCaptureRequest,
  canonicalMobileCommandCenterRequest,
  canonicalMobileCommandCenterResponse,
  canonicalMobileCommandCenterEncryptionKeyInfo,
  canonicalMobileCommandCenterResponseAad,
  pairingRequestMessage,
  pairingResponseMessage,
};
