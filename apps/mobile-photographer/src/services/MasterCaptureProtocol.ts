import type {
  CaptureAssetRole,
  DeliveryReceiptProof,
} from './CaptureDelivery';

export const MOBILE_CAPTURE_PROTOCOL = 'CF-MOBILE-V1';
export const MOBILE_CAPTURE_RECEIPT_PROTOCOL = 'CF-RECEIPT-V1';
export const EMPTY_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export type MobileCaptureOperation = 'STATUS' | 'CHUNK' | 'COMMIT';

export interface MobileCaptureRequestIdentity {
  operation: MobileCaptureOperation;
  deviceId: string;
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
    identity.deviceId,
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
