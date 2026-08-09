import * as Crypto from 'expo-crypto';
import { File, FileMode, Paths, UploadType } from 'expo-file-system';

import { logger } from '@/utils/logger';

import {
  captureDeliveryLedgerService,
  type MasterTransferCandidate,
} from './CaptureDeliveryLedgerService';
import {
  bytesToHex,
  canonicalMasterCaptureReceipt,
  canonicalMobileCaptureRequest,
  canonicalMobileCaptureEncryptionKeyInfo,
  canonicalMobileCaptureAad,
  MOBILE_CAPTURE_MASTER_ID,
  EMPTY_SHA256,
  type MasterCaptureReceipt,
  type MobileCaptureOperation,
  type MobileCaptureRequestIdentity,
} from './MasterCaptureProtocol';
import {
  masterPairingService,
  type MasterPairingCredential,
} from './MasterPairingService';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export type MasterDeliveryPhase =
  | 'UNPAIRED'
  | 'IDLE'
  | 'DISCOVERING'
  | 'TRANSFERRING'
  | 'RETRY_WAIT'
  | 'ERROR';

export interface MasterDeliveryStatus {
  phase: MasterDeliveryPhase;
  message: string;
  filename: string | null;
  bytesSent: number;
  totalBytes: number;
}

interface UploadStatusResponse {
  state: 'MISSING' | 'RECEIVING' | 'VERIFYING' | 'READY' | 'FAILED_REVIEW';
  expectedOffset: number;
  receipt?: MasterCaptureReceipt;
  signature?: string;
}

interface ChunkResponse {
  state: 'RECEIVING';
  expectedOffset: number;
  complete: boolean;
}

interface ReceiptResponse {
  receipt: MasterCaptureReceipt;
  signature: string;
}

type StatusListener = (status: MasterDeliveryStatus) => void;

const CHUNK_BYTES = 4 * 1024 * 1024;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 5 * 60 * 1_000;

class DeliveryIntegrityError extends Error {}

class MasterDeliveryWorker {
  private activeDrain: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<StatusListener>();
  private status: MasterDeliveryStatus = {
    phase: 'IDLE',
    message: 'Master delivery is ready.',
    filename: null,
    bytesSent: 0,
    totalBytes: 0,
  };

  getStatus(): MasterDeliveryStatus {
    return this.status;
  }

  addStatusListener(listener: StatusListener): { remove: () => void } {
    this.listeners.add(listener);
    listener(this.status);
    return { remove: () => this.listeners.delete(listener) };
  }

  drain(): Promise<void> {
    if (this.activeDrain) return this.activeDrain;
    this.activeDrain = this.runDrain().finally(() => {
      this.activeDrain = null;
    });
    return this.activeDrain;
  }

  pairingForgotten(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.publish({
      phase: 'UNPAIRED',
      message: 'Pair this Android device with Master to deliver captures.',
      filename: null,
      bytesSent: 0,
      totalBytes: 0,
    });
  }

  private async runDrain(): Promise<void> {
    const storedCredential = await masterPairingService.getCredential();
    if (!storedCredential) {
      this.pairingForgotten();
      return;
    }

    this.publish({
      phase: 'DISCOVERING',
      message: `Locating ${storedCredential.masterId} on the LAN…`,
      filename: null,
      bytesSent: 0,
      totalBytes: 0,
    });

    let credential: MasterPairingCredential;
    try {
      const resolved = await masterPairingService.resolveCredential();
      if (!resolved) {
        this.pairingForgotten();
        return;
      }
      credential = resolved;
    } catch (error) {
      this.publishRetry(
        error instanceof Error ? error.message : String(error),
        BASE_RETRY_MS
      );
      return;
    }

    while (true) {
      const candidate =
        await captureDeliveryLedgerService.getNextMasterTransfer();
      if (!candidate) {
        const retryAt =
          await captureDeliveryLedgerService.getNextMasterRetryAt();
        if (retryAt) {
          this.publishRetry(
            'A Master delivery is waiting for its retry window.',
            Math.max(250, retryAt - Date.now())
          );
          return;
        }
        this.publish({
          phase: 'IDLE',
          message: `All captures delivered to ${credential.masterId}.`,
          filename: null,
          bytesSent: 0,
          totalBytes: 0,
        });
        return;
      }

      try {
        await this.prepareIntent(candidate);
        await this.transferCandidate(credential, candidate);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const terminal = error instanceof DeliveryIntegrityError;
        try {
          await captureDeliveryLedgerService.transition(
            candidate.intentId,
            terminal ? 'FAILED_REVIEW' : 'RETRYABLE',
            {
              code: terminal
                ? 'MASTER_DELIVERY_INTEGRITY'
                : 'MASTER_DELIVERY_RETRY',
              message,
              nextAttemptAt: terminal
                ? null
                : Date.now() + this.retryDelay(candidate.attemptCount),
            }
          );
        } catch (transitionError) {
          logger.error(
            '[MasterDeliveryWorker] Failed to persist delivery failure state.',
            transitionError
          );
        }
        if (terminal) {
          this.publish({
            phase: 'ERROR',
            message,
            filename: candidate.filename,
            bytesSent: 0,
            totalBytes: candidate.byteSize,
          });
          return;
        }
        this.publishRetry(message, this.retryDelay(candidate.attemptCount));
        return;
      }
    }
  }

  private async prepareIntent(candidate: MasterTransferCandidate): Promise<void> {
    if (candidate.state === 'PENDING' || candidate.state === 'RETRYABLE') {
      await captureDeliveryLedgerService.transition(candidate.intentId, 'QUEUED');
      candidate.state = 'QUEUED';
    }
    if (candidate.state === 'QUEUED') {
      await captureDeliveryLedgerService.transition(
        candidate.intentId,
        'TRANSFERRING'
      );
      candidate.state = 'TRANSFERRING';
    }
    if (candidate.state !== 'TRANSFERRING') {
      throw new DeliveryIntegrityError(
        `Master delivery cannot resume from ${candidate.state}.`
      );
    }
  }

  private async transferCandidate(
    credential: MasterPairingCredential,
    candidate: MasterTransferCandidate
  ): Promise<void> {
    const source = new File(candidate.localUri);
    if (!source.exists || source.size !== candidate.byteSize) {
      throw new DeliveryIntegrityError(
        `Local asset ${candidate.filename} no longer matches its durable ledger size.`
      );
    }

    const status = await this.requestStatus(credential, candidate);
    if (status.state === 'FAILED_REVIEW') {
      throw new DeliveryIntegrityError(
        `Master rejected ${candidate.filename} for checksum review.`
      );
    }
    if (status.state === 'READY') {
      await this.acceptReceipt(credential, candidate, status);
      return;
    }
    if (
      !Number.isSafeInteger(status.expectedOffset) ||
      status.expectedOffset < 0 ||
      status.expectedOffset > candidate.byteSize
    ) {
      throw new DeliveryIntegrityError('Master returned an invalid durable offset.');
    }

    let offset = status.expectedOffset;
    const handle = source.open(FileMode.ReadOnly);
    try {
      handle.offset = offset;
      while (offset < candidate.byteSize) {
        const requested = Math.min(CHUNK_BYTES, candidate.byteSize - offset);
        const bytes = handle.readBytes(requested);
        if (bytes.length !== requested) {
          throw new DeliveryIntegrityError(
            `Local read ended early at ${offset} of ${candidate.byteSize} bytes.`
          );
        }
        this.publish({
          phase: 'TRANSFERRING',
          message: `Sending ${candidate.filename} to ${credential.masterId}…`,
          filename: candidate.filename,
          bytesSent: offset,
          totalBytes: candidate.byteSize,
        });
        const expectedOffset = await this.uploadChunk(
          credential,
          candidate,
          offset,
          bytes
        );
        if (expectedOffset !== offset + bytes.length) {
          throw new DeliveryIntegrityError(
            'Master acknowledged an impossible chunk offset.'
          );
        }
        offset = expectedOffset;
        handle.offset = offset;
      }
    } finally {
      handle.close();
    }

    this.publish({
      phase: 'TRANSFERRING',
      message: `Verifying ${candidate.filename} on Master…`,
      filename: candidate.filename,
      bytesSent: candidate.byteSize,
      totalBytes: candidate.byteSize,
    });
    const committed = await this.requestCommit(credential, candidate);
    await this.acceptReceipt(credential, candidate, committed);
  }

  private async requestStatus(
    credential: MasterPairingCredential,
    candidate: MasterTransferCandidate
  ): Promise<UploadStatusResponse> {
    const identity = this.requestIdentity(
      credential,
      candidate,
      'STATUS',
      EMPTY_SHA256,
      0
    );
    const response = await fetch(
      this.uploadUrl(credential, candidate, 'status'),
      { method: 'GET', headers: this.headers(credential, identity) }
    );
    const body = await this.decryptResponseJson(credential, response, identity);
    if (!response.ok) {
      throw new Error(this.responseError(body, response.status));
    }
    return this.requireStatus(body);
  }

  private async uploadChunk(
    credential: MasterPairingCredential,
    candidate: MasterTransferCandidate,
    offset: number,
    bytes: Uint8Array<ArrayBuffer>
  ): Promise<number> {
    const digest = bytesToHex(
      await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)
    );
    const identity = this.requestIdentity(
      credential,
      candidate,
      'CHUNK',
      digest,
      offset
    );
    const native = masterPairingService.requireNativeModule();
    const keyInfo = canonicalMobileCaptureEncryptionKeyInfo(identity, MOBILE_CAPTURE_MASTER_ID, "MOBILE_TO_MASTER");
    const aad = canonicalMobileCaptureAad(identity, MOBILE_CAPTURE_MASTER_ID, "MOBILE_TO_MASTER");
    const keyBase64 = native.hkdfSha256Base64(credential.secretBase64, keyInfo);
    const key = await Crypto.AESEncryptionKey.import(keyBase64, 'base64');
    const sealed = await Crypto.aesEncryptAsync(bytes, key, {
      additionalData: new TextEncoder().encode(aad),
    });
    
    const ciphertextResult = typeof sealed.ciphertext === 'function'
      ? await sealed.ciphertext({ encoding: 'base64' as const })
      : sealed.ciphertext;
    const cipherBytes = typeof ciphertextResult === 'string' ? base64ToBytes(ciphertextResult) : (ciphertextResult as unknown as Uint8Array);
      
    const ivResult = typeof sealed.iv === 'function' ? await sealed.iv('base64') : sealed.iv;
    const ivBase64 = typeof ivResult === 'string' ? ivResult : bytesToBase64(ivResult as unknown as Uint8Array);
    
    const tagResult = typeof sealed.tag === 'function' ? await sealed.tag('base64') : sealed.tag;
    const tagBase64 = typeof tagResult === 'string' ? tagResult : bytesToBase64(tagResult as unknown as Uint8Array);

    const staging = new File(
      Paths.cache,
      `master-upload-${credential.deviceId}-${Date.now()}-${offset}.chunk`
    );
    staging.create({ overwrite: true });
    staging.write(cipherBytes);
    try {
      const result = await staging.upload(
        this.uploadUrl(credential, candidate, 'chunks'),
        {
          httpMethod: 'PUT',
          uploadType: UploadType.BINARY_CONTENT,
          mimeType: 'application/octet-stream',
          headers: this.headers(credential, identity, candidate.filename, ivBase64, tagBase64),
        }
      );
      
      let body: unknown = {};
      if (result.status >= 200 && result.status < 300) {
        body = await this.decryptResponseString(credential, result.body, result.status, identity);
      } else {
        body = this.parseJson(result.body, result.status);
      }
      if (result.status === 409) {
        const serverOffset = this.readExpectedOffset(body);
        if (
          serverOffset !== null &&
          serverOffset === offset + bytes.length
        ) {
          return serverOffset;
        }
      }
      if (result.status < 200 || result.status >= 300) {
        throw new Error(this.responseError(body, result.status));
      }
      const parsed = this.requireChunkResponse(body);
      return parsed.expectedOffset;
    } finally {
      if (staging.exists) staging.delete();
    }
  }

  private async requestCommit(
    credential: MasterPairingCredential,
    candidate: MasterTransferCandidate
  ): Promise<ReceiptResponse> {
    const identity = this.requestIdentity(
      credential,
      candidate,
      'COMMIT',
      EMPTY_SHA256,
      0
    );
    const response = await fetch(
      this.uploadUrl(credential, candidate, 'commit'),
      {
        method: 'POST',
        headers: this.headers(credential, identity),
      }
    );
    const body = await this.decryptResponseJson(credential, response, identity);
    if (!response.ok) {
      throw new Error(this.responseError(body, response.status));
    }
    return this.requireReceiptResponse(body);
  }

  private async acceptReceipt(
    credential: MasterPairingCredential,
    candidate: MasterTransferCandidate,
    value: {
      receipt?: MasterCaptureReceipt;
      signature?: string;
    }
  ): Promise<void> {
    const receiptResponse = this.requireReceiptResponse(value);
    const receipt = receiptResponse.receipt;
    if (
      receipt.destination !== 'MASTER' ||
      receipt.idempotencyKey !== candidate.idempotencyKey ||
      receipt.assetSha256.toLowerCase() !== candidate.sha256.toLowerCase() ||
      receipt.assetByteSize !== candidate.byteSize
    ) {
      throw new DeliveryIntegrityError(
        'Master receipt does not match the local delivery intent.'
      );
    }
    const native = masterPairingService.requireNativeModule();
    if (
      !native.verifyHmacSha256Base64(
        credential.secretBase64,
        canonicalMasterCaptureReceipt(receipt),
        receiptResponse.signature
      )
    ) {
      throw new DeliveryIntegrityError(
        'Master receipt signature authentication failed.'
      );
    }
    await captureDeliveryLedgerService.recordAuthenticatedReceipt(
      candidate.intentId,
      {
        ...receipt,
        authenticated: true,
        signature: receiptResponse.signature,
      }
    );
  }

  private requestIdentity(
    credential: MasterPairingCredential,
    candidate: MasterTransferCandidate,
    operation: MobileCaptureOperation,
    contentSha256: string,
    offset: number
  ): MobileCaptureRequestIdentity {
    return {
      operation,
      deviceId: credential.deviceId,
      timestamp: String(Date.now()),
      nonce: masterPairingService.requireNativeModule().randomNonce(24),
      idempotencyKey: candidate.idempotencyKey,
      contentSha256,
      assetSha256: candidate.sha256,
      assetByteSize: String(candidate.byteSize),
      offset: String(offset),
      assetRole: candidate.role,
      encryptionProtocol: "CF-AEAD-V1",
      keyEpoch: String(credential.pairedAt),
    };
  }

  private headers(
    credential: MasterPairingCredential,
    identity: MobileCaptureRequestIdentity,
    filename?: string,
    ivBase64?: string,
    tagBase64?: string
  ): Record<string, string> {
    const native = masterPairingService.requireNativeModule();
    const headers: Record<string, string> = {
      'Content-Type':
        identity.operation === 'CHUNK'
          ? 'application/octet-stream'
          : 'application/json',
      'X-ClickFlash-Device-Id': identity.deviceId,
      'X-ClickFlash-Encryption': 'CF-AEAD-V1',
      'X-ClickFlash-Key-Epoch': String(credential.pairedAt),
      'X-ClickFlash-Timestamp': identity.timestamp,
      'X-ClickFlash-Nonce': identity.nonce,
      'X-ClickFlash-Idempotency-Key': identity.idempotencyKey,
      'X-ClickFlash-Content-Sha256': identity.contentSha256,
      'X-ClickFlash-Asset-Sha256': identity.assetSha256,
      'X-ClickFlash-Asset-Size': identity.assetByteSize,
      'X-ClickFlash-Offset': identity.offset,
      'X-ClickFlash-Asset-Role': identity.assetRole,
      'X-ClickFlash-Signature': native.hmacSha256Base64(
        credential.secretBase64,
        canonicalMobileCaptureRequest(identity)
      ),
    };
    if (filename) headers['X-ClickFlash-Filename'] = encodeURIComponent(filename);
    if (ivBase64) headers['X-ClickFlash-Aead-Iv'] = ivBase64;
    if (tagBase64) headers['X-ClickFlash-Aead-Tag'] = tagBase64;
    return headers;
  }

  private uploadUrl(
    credential: MasterPairingCredential,
    candidate: MasterTransferCandidate,
    suffix: 'status' | 'chunks' | 'commit'
  ): string {
    return `${credential.baseUrl}/api/v1/mobile-capture/uploads/${encodeURIComponent(
      candidate.idempotencyKey
    )}/${suffix}`;
  }

  private requireStatus(value: unknown): UploadStatusResponse {
    if (
      typeof value !== 'object' ||
      value === null ||
      !['MISSING', 'RECEIVING', 'VERIFYING', 'READY', 'FAILED_REVIEW'].includes(
        String((value as UploadStatusResponse).state)
      ) ||
      !Number.isSafeInteger((value as UploadStatusResponse).expectedOffset)
    ) {
      throw new DeliveryIntegrityError('Master upload status is invalid.');
    }
    return value as UploadStatusResponse;
  }

  private requireChunkResponse(value: unknown): ChunkResponse {
    if (
      typeof value !== 'object' ||
      value === null ||
      (value as ChunkResponse).state !== 'RECEIVING' ||
      !Number.isSafeInteger((value as ChunkResponse).expectedOffset) ||
      typeof (value as ChunkResponse).complete !== 'boolean'
    ) {
      throw new DeliveryIntegrityError('Master chunk acknowledgement is invalid.');
    }
    return value as ChunkResponse;
  }

  private requireReceiptResponse(value: unknown): ReceiptResponse {
    if (
      typeof value !== 'object' ||
      value === null ||
      typeof (value as ReceiptResponse).receipt !== 'object' ||
      (value as ReceiptResponse).receipt === null ||
      typeof (value as ReceiptResponse).signature !== 'string'
    ) {
      throw new DeliveryIntegrityError('Master receipt response is invalid.');
    }
    const receipt = (value as ReceiptResponse).receipt;
    if (
      receipt.destination !== 'MASTER' ||
      typeof receipt.remoteReceiptId !== 'string' ||
      !receipt.remoteReceiptId ||
      typeof receipt.idempotencyKey !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(receipt.assetSha256) ||
      !Number.isSafeInteger(receipt.assetByteSize) ||
      typeof receipt.persisted !== 'boolean' ||
      typeof receipt.checksumVerified !== 'boolean' ||
      typeof receipt.metadataCommitted !== 'boolean' ||
      typeof receipt.processingQueued !== 'boolean'
    ) {
      throw new DeliveryIntegrityError('Master receipt proof is invalid.');
    }
    return value as ReceiptResponse;
  }

  private async responseJson(response: Response): Promise<unknown> {
    return this.parseJson(await response.text(), response.status);
  }

  private async decryptResponseJson(
    credential: MasterPairingCredential,
    response: Response,
    identity: MobileCaptureRequestIdentity
  ): Promise<unknown> {
    const text = await response.text();
    if (!response.ok) return this.parseJson(text, response.status);
    return this.decryptResponseString(credential, text, response.status, identity);
  }

  private async decryptResponseString(
    credential: MasterPairingCredential,
    text: string,
    status: number,
    identity: MobileCaptureRequestIdentity
  ): Promise<unknown> {
    const envelope = this.parseJson(text, status) as { iv?: string; ciphertext?: string; tag?: string };
    if (!envelope || !envelope.iv || !envelope.ciphertext || !envelope.tag) {
      throw new DeliveryIntegrityError('Master returned invalid AEAD envelope.');
    }
    const native = masterPairingService.requireNativeModule();
    const keyInfo = canonicalMobileCaptureEncryptionKeyInfo(identity, MOBILE_CAPTURE_MASTER_ID, "MASTER_TO_MOBILE");
    const aad = canonicalMobileCaptureAad(identity, MOBILE_CAPTURE_MASTER_ID, "MASTER_TO_MOBILE");
    const keyBase64 = native.hkdfSha256Base64(credential.secretBase64, keyInfo);
    
    const key = await Crypto.AESEncryptionKey.import(keyBase64, 'base64');
    const sealed = Crypto.AESSealedData.fromParts(envelope.iv, envelope.ciphertext, envelope.tag);
    const plaintextBytes = await Crypto.aesDecryptAsync(sealed, key, {
      additionalData: new TextEncoder().encode(aad),
      output: 'bytes',
    });
    const plaintext = new TextDecoder('utf-8', { fatal: true }).decode(plaintextBytes);
    return this.parseJson(plaintext, status);
  }

  private parseJson(body: string, status: number): unknown {
    if (!body) return {};
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new Error(`Master returned a non-JSON response (${status}).`);
    }
  }

  private responseError(value: unknown, status: number): string {
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { error?: unknown }).error === 'string'
    ) {
      return (value as { error: string }).error;
    }
    return `Master delivery request failed (${status}).`;
  }

  private readExpectedOffset(value: unknown): number | null {
    if (
      typeof value === 'object' &&
      value !== null &&
      Number.isSafeInteger((value as { expectedOffset?: unknown }).expectedOffset)
    ) {
      return (value as { expectedOffset: number }).expectedOffset;
    }
    return null;
  }

  private retryDelay(attemptCount: number): number {
    return Math.min(
      MAX_RETRY_MS,
      BASE_RETRY_MS * 2 ** Math.min(Math.max(attemptCount, 0), 6)
    );
  }

  private publishRetry(message: string, delayMs: number): void {
    this.publish({
      phase: 'RETRY_WAIT',
      message: `${message} Retrying automatically.`,
      filename: null,
      bytesSent: 0,
      totalBytes: 0,
    });
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.drain();
    }, delayMs);
  }

  private publish(status: MasterDeliveryStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }
}

export const masterDeliveryWorker = new MasterDeliveryWorker();
