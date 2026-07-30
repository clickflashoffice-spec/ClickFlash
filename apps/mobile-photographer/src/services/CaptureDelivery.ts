export type CaptureAssetRole = 'ORIGINAL' | 'QUICK_EDIT';
export type CaptureDestination = 'MASTER' | 'KIOSK' | 'CLOUD';
export type CaptureDeliveryState =
  | 'PENDING'
  | 'QUEUED'
  | 'TRANSFERRING'
  | 'RECEIVED'
  | 'VERIFIED'
  | 'READY'
  | 'PAUSED'
  | 'RETRYABLE'
  | 'BLOCKED_POLICY'
  | 'FAILED_REVIEW';

export interface DeliveryReceiptExpectation {
  destination: CaptureDestination;
  idempotencyKey: string;
  assetSha256: string;
  assetByteSize: number;
}

export interface DeliveryReceiptProof {
  destination: CaptureDestination;
  remoteReceiptId: string;
  idempotencyKey: string;
  assetSha256: string;
  assetByteSize: number;
  authenticated: boolean;
  persisted: boolean;
  checksumVerified: boolean;
  metadataCommitted: boolean;
  processingQueued?: boolean;
  indexed?: boolean;
  displayable?: boolean;
  published?: boolean;
  signature?: string | null;
}

export type DeliveryReceiptValidation =
  | { valid: true; ready: boolean }
  | { valid: false; reason: string };

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

const ALLOWED_TRANSITIONS: Record<CaptureDeliveryState, ReadonlySet<CaptureDeliveryState>> = {
  PENDING: new Set(['QUEUED', 'PAUSED', 'BLOCKED_POLICY', 'FAILED_REVIEW']),
  QUEUED: new Set(['TRANSFERRING', 'PAUSED', 'RETRYABLE', 'BLOCKED_POLICY', 'FAILED_REVIEW']),
  TRANSFERRING: new Set(['RECEIVED', 'RETRYABLE', 'PAUSED', 'FAILED_REVIEW']),
  RECEIVED: new Set(['VERIFIED', 'RETRYABLE', 'FAILED_REVIEW']),
  VERIFIED: new Set(['READY', 'RETRYABLE', 'FAILED_REVIEW']),
  READY: new Set(),
  PAUSED: new Set(['PENDING', 'QUEUED', 'BLOCKED_POLICY', 'FAILED_REVIEW']),
  RETRYABLE: new Set(['QUEUED', 'PAUSED', 'BLOCKED_POLICY', 'FAILED_REVIEW']),
  BLOCKED_POLICY: new Set(['PENDING', 'QUEUED', 'FAILED_REVIEW']),
  FAILED_REVIEW: new Set(['PENDING', 'BLOCKED_POLICY']),
};

export function canTransitionDelivery(
  current: CaptureDeliveryState,
  next: CaptureDeliveryState
): boolean {
  return current === next || ALLOWED_TRANSITIONS[current].has(next);
}

export function requiresAuthenticatedReceipt(state: CaptureDeliveryState): boolean {
  return state === 'RECEIVED' || state === 'VERIFIED' || state === 'READY';
}

export function validateDeliveryReceipt(
  expectation: DeliveryReceiptExpectation,
  receipt: DeliveryReceiptProof
): DeliveryReceiptValidation {
  if (!receipt.authenticated) {
    return { valid: false, reason: 'Receipt authentication has not been verified.' };
  }
  if (!receipt.remoteReceiptId.trim()) {
    return { valid: false, reason: 'Receipt identity is required.' };
  }
  if (receipt.destination !== expectation.destination) {
    return { valid: false, reason: 'Receipt destination does not match the intent.' };
  }
  if (receipt.idempotencyKey !== expectation.idempotencyKey) {
    return { valid: false, reason: 'Receipt idempotency key does not match the intent.' };
  }
  if (
    !SHA256_PATTERN.test(receipt.assetSha256) ||
    receipt.assetSha256.toLowerCase() !== expectation.assetSha256.toLowerCase()
  ) {
    return { valid: false, reason: 'Receipt SHA-256 does not match the local asset.' };
  }
  if (
    !Number.isSafeInteger(receipt.assetByteSize) ||
    receipt.assetByteSize <= 0 ||
    receipt.assetByteSize !== expectation.assetByteSize
  ) {
    return { valid: false, reason: 'Receipt byte size does not match the local asset.' };
  }

  const commonReady =
    receipt.persisted &&
    receipt.checksumVerified &&
    receipt.metadataCommitted;
  if (!commonReady) return { valid: true, ready: false };

  if (receipt.destination === 'MASTER') {
    return { valid: true, ready: receipt.processingQueued === true };
  }
  if (receipt.destination === 'KIOSK') {
    return {
      valid: true,
      ready: receipt.indexed === true && receipt.displayable === true,
    };
  }
  return { valid: true, ready: receipt.published === true };
}

export function isSha256(value: string): boolean {
  return SHA256_PATTERN.test(value);
}

export function createCaptureAssetId(
  captureObjectId: string,
  role: CaptureAssetRole
): string {
  return `${captureObjectId}:asset:${role.toLowerCase()}`;
}

export function createDeliveryIntentId(
  captureObjectId: string,
  destination: CaptureDestination,
  role: CaptureAssetRole
): string {
  return `${captureObjectId}:delivery:${destination.toLowerCase()}:${role.toLowerCase()}`;
}

export function createDeliveryIdempotencyKey(
  captureObjectId: string,
  destination: CaptureDestination,
  role: CaptureAssetRole,
  sha256: string
): string {
  return `cf2:${captureObjectId}:${destination}:${role}:${sha256.toLowerCase()}`;
}

export default {
  canTransitionDelivery,
  createCaptureAssetId,
  createDeliveryIdempotencyKey,
  createDeliveryIntentId,
  isSha256,
  requiresAuthenticatedReceipt,
  validateDeliveryReceipt,
};
