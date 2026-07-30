import { getDatabase } from '@/backend/database';

import {
  canTransitionDelivery,
  createCaptureAssetId,
  createDeliveryIdempotencyKey,
  createDeliveryIntentId,
  isSha256,
  requiresAuthenticatedReceipt,
  validateDeliveryReceipt,
  type CaptureAssetRole,
  type CaptureDeliveryState,
  type CaptureDestination,
  type DeliveryReceiptProof,
} from './CaptureDelivery';

export interface CaptureDeliveryCounts {
  masterPending: number;
  kioskPending: number;
  cloudPending: number;
  readyDeliveries: number;
  deliveryAttention: number;
}

export interface QuickEditAssetInput {
  captureObjectId: string;
  sourceSha256: string;
  localUri: string;
  byteSize: number;
  sha256: string;
}

export interface MasterTransferCandidate {
  intentId: string;
  idempotencyKey: string;
  state: CaptureDeliveryState;
  attemptCount: number;
  captureObjectId: string;
  role: CaptureAssetRole;
  filename: string;
  localUri: string;
  byteSize: number;
  sha256: string;
}

class CaptureDeliveryLedgerService {
  async ensureOriginal(captureObjectId: string): Promise<void> {
    const database = await getDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const capture = await transaction.getFirstAsync<CaptureObjectRow>(
        `SELECT
           id,
           session_id AS sessionId,
           media_type AS mediaType,
           local_uri AS localUri,
           actual_byte_size AS byteSize,
           sha256,
           imported_at AS importedAt
         FROM capture_objects
         WHERE id = ? AND state = 'LOCAL_VERIFIED'`,
        [captureObjectId]
      );
      if (!capture) {
        throw new Error('Only a locally verified capture can enter the delivery outbox.');
      }
      this.assertAsset(capture, 'verified camera original');

      const asset = await this.ensureAsset(transaction, {
        captureObjectId,
        sessionId: capture.sessionId,
        role: 'ORIGINAL',
        mediaType: capture.mediaType,
        localUri: capture.localUri,
        byteSize: capture.byteSize,
        sha256: capture.sha256,
        createdAt: capture.importedAt,
      });

      await this.ensureIntent(transaction, asset, 'MASTER', true);
    });
  }

  async registerQuickEdit(input: QuickEditAssetInput): Promise<void> {
    this.assertAsset(input, 'quick-edit JPEG');
    const database = await getDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const capture = await transaction.getFirstAsync<{
        sessionId: string;
        importedAt: number;
        sha256: string | null;
      }>(
        `SELECT
           session_id AS sessionId,
           imported_at AS importedAt,
           sha256
         FROM capture_objects
         WHERE id = ? AND state = 'LOCAL_VERIFIED'`,
        [input.captureObjectId]
      );
      if (!capture) {
        throw new Error('Quick edits must reference a locally verified capture.');
      }
      if (
        !capture.sha256 ||
        !isSha256(input.sourceSha256) ||
        capture.sha256.toLowerCase() !== input.sourceSha256.toLowerCase()
      ) {
        throw new Error('Quick-edit source identity does not match the verified capture.');
      }

      await this.ensureAsset(transaction, {
        captureObjectId: input.captureObjectId,
        sessionId: capture.sessionId,
        role: 'QUICK_EDIT',
        mediaType: 'jpeg',
        localUri: input.localUri,
        byteSize: input.byteSize,
        sha256: input.sha256,
        createdAt: Date.now(),
      });
    });
  }

  async createIntent(
    captureObjectId: string,
    destination: CaptureDestination,
    role: CaptureAssetRole,
    required: boolean
  ): Promise<void> {
    const database = await getDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const asset = await transaction.getFirstAsync<CaptureAssetRow>(
        `${ASSET_SELECT}
         WHERE capture_object_id = ? AND role = ?`,
        [captureObjectId, role]
      );
      if (!asset) {
        throw new Error(`${role} is not locally available for ${destination} delivery.`);
      }
      await this.ensureIntent(transaction, asset, destination, required);
    });
  }

  async getNextMasterTransfer(
    now = Date.now()
  ): Promise<MasterTransferCandidate | null> {
    const database = await getDatabase();
    return database.getFirstAsync<MasterTransferCandidate>(
      `SELECT
         intent.id AS intentId,
         intent.idempotency_key AS idempotencyKey,
         intent.state,
         intent.attempt_count AS attemptCount,
         intent.capture_object_id AS captureObjectId,
         intent.asset_role AS role,
         capture.filename,
         asset.local_uri AS localUri,
         asset.byte_size AS byteSize,
         asset.sha256
       FROM capture_delivery_intents AS intent
       JOIN capture_assets AS asset ON asset.id = intent.asset_id
       JOIN capture_objects AS capture ON capture.id = intent.capture_object_id
       WHERE intent.destination = 'MASTER'
         AND intent.state IN ('PENDING', 'QUEUED', 'TRANSFERRING', 'RETRYABLE')
         AND (intent.next_attempt_at IS NULL OR intent.next_attempt_at <= ?)
       ORDER BY intent.required DESC, intent.created_at ASC
       LIMIT 1`,
      [now]
    );
  }

  async transition(
    intentId: string,
    next: CaptureDeliveryState,
    error?: { code: string; message: string; nextAttemptAt?: number | null }
  ): Promise<void> {
    if (requiresAuthenticatedReceipt(next)) {
      throw new Error(`${next} can only be entered through an authenticated receipt.`);
    }
    const database = await getDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const intent = await transaction.getFirstAsync<{ state: CaptureDeliveryState }>(
        `SELECT state FROM capture_delivery_intents WHERE id = ?`,
        [intentId]
      );
      if (!intent) throw new Error('Delivery intent was not found.');
      if (!canTransitionDelivery(intent.state, next)) {
        throw new Error(`Invalid delivery transition ${intent.state} → ${next}.`);
      }

      const isAttempt = next === 'TRANSFERRING';
      await transaction.runAsync(
        `UPDATE capture_delivery_intents
         SET state = ?,
             attempt_count = attempt_count + ?,
             next_attempt_at = ?,
             last_error_code = ?,
             last_error_message = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          next,
          isAttempt ? 1 : 0,
          error?.nextAttemptAt ?? null,
          error?.code ?? null,
          error?.message.slice(0, ERROR_MESSAGE_LIMIT) ?? null,
          Date.now(),
          intentId,
        ]
      );
    });
  }

  async recordAuthenticatedReceipt(
    intentId: string,
    receipt: DeliveryReceiptProof
  ): Promise<CaptureDeliveryState> {
    const database = await getDatabase();
    let nextState: CaptureDeliveryState = 'RECEIVED';

    await database.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<ReceiptExpectationRow>(
        `SELECT
           intent.id,
           intent.state,
           intent.destination,
           intent.idempotency_key AS idempotencyKey,
           asset.sha256 AS assetSha256,
           asset.byte_size AS assetByteSize
         FROM capture_delivery_intents AS intent
         JOIN capture_assets AS asset ON asset.id = intent.asset_id
         WHERE intent.id = ?`,
        [intentId]
      );
      if (!row) throw new Error('Delivery intent was not found.');

      const validation = validateDeliveryReceipt(row, receipt);
      if (!validation.valid) throw new Error(validation.reason);
      nextState = validation.ready
        ? 'READY'
        : row.state === 'VERIFIED'
          ? 'VERIFIED'
          : 'RECEIVED';
      if (!RECEIPT_APPLICABLE_STATES.has(row.state)) {
        throw new Error(`Cannot apply a receipt while delivery is ${row.state}.`);
      }

      const now = Date.now();
      const remoteReceiptId = receipt.remoteReceiptId.trim();
      if (remoteReceiptId.length > RECEIPT_ID_LIMIT) {
        throw new Error('Receipt identity exceeds the supported length.');
      }
      const receiptId = `${intentId}:receipt:${remoteReceiptId}`;
      const signature = receipt.signature?.slice(0, SIGNATURE_LIMIT) ?? null;
      await transaction.runAsync(
        `INSERT INTO capture_delivery_receipts (
           id, intent_id, destination, remote_receipt_id, idempotency_key,
           asset_sha256, asset_byte_size, proof_json, signature,
           authenticated_at, received_at, ready_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(intent_id, remote_receipt_id)
         DO UPDATE SET
           proof_json = excluded.proof_json,
           signature = excluded.signature,
           authenticated_at = excluded.authenticated_at,
           received_at = excluded.received_at,
           ready_at = excluded.ready_at`,
        [
          receiptId,
          intentId,
          receipt.destination,
          remoteReceiptId,
          receipt.idempotencyKey,
          receipt.assetSha256.toLowerCase(),
          receipt.assetByteSize,
          JSON.stringify(receipt),
          signature,
          now,
          now,
          validation.ready ? now : null,
        ]
      );
      await transaction.runAsync(
        `UPDATE capture_delivery_intents
         SET state = ?,
             next_attempt_at = NULL,
             last_error_code = NULL,
             last_error_message = NULL,
             updated_at = ?
         WHERE id = ?`,
        [nextState, now, intentId]
      );
    });

    return nextState;
  }

  async getCounts(sessionId: string): Promise<CaptureDeliveryCounts> {
    const counts: CaptureDeliveryCounts = {
      masterPending: 0,
      kioskPending: 0,
      cloudPending: 0,
      readyDeliveries: 0,
      deliveryAttention: 0,
    };
    const database = await getDatabase();
    const rows = await database.getAllAsync<{
      destination: CaptureDestination;
      state: CaptureDeliveryState;
      count: number;
    }>(
      `SELECT destination, state, COUNT(*) AS count
       FROM capture_delivery_intents
       WHERE session_id = ?
       GROUP BY destination, state`,
      [sessionId]
    );

    rows.forEach((row) => {
      if (row.state === 'READY') {
        counts.readyDeliveries += row.count;
        return;
      }
      if (row.state === 'BLOCKED_POLICY' || row.state === 'FAILED_REVIEW') {
        counts.deliveryAttention += row.count;
        return;
      }
      if (row.destination === 'MASTER') counts.masterPending += row.count;
      if (row.destination === 'KIOSK') counts.kioskPending += row.count;
      if (row.destination === 'CLOUD') counts.cloudPending += row.count;
    });
    return counts;
  }

  private async ensureAsset(
    transaction: DeliveryDatabase,
    input: CaptureAssetInput
  ): Promise<CaptureAssetRow> {
    const existing = await transaction.getFirstAsync<CaptureAssetRow>(
      `${ASSET_SELECT}
       WHERE capture_object_id = ? AND role = ?`,
      [input.captureObjectId, input.role]
    );
    if (existing) {
      if (
        existing.sha256.toLowerCase() !== input.sha256.toLowerCase() ||
        existing.byteSize !== input.byteSize ||
        existing.localUri !== input.localUri
      ) {
        throw new Error(`${input.role} asset identity changed after it was persisted.`);
      }
      return existing;
    }

    const now = Date.now();
    const asset: CaptureAssetRow = {
      id: createCaptureAssetId(input.captureObjectId, input.role),
      captureObjectId: input.captureObjectId,
      sessionId: input.sessionId,
      role: input.role,
      localUri: input.localUri,
      byteSize: input.byteSize,
      sha256: input.sha256.toLowerCase(),
    };
    await transaction.runAsync(
      `INSERT INTO capture_assets (
         id, capture_object_id, session_id, role, media_type,
         local_uri, byte_size, sha256, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asset.id,
        asset.captureObjectId,
        asset.sessionId,
        asset.role,
        input.mediaType,
        asset.localUri,
        asset.byteSize,
        asset.sha256,
        input.createdAt,
        now,
      ]
    );
    return asset;
  }

  private async ensureIntent(
    transaction: DeliveryDatabase,
    asset: CaptureAssetRow,
    destination: CaptureDestination,
    required: boolean
  ): Promise<void> {
    const id = createDeliveryIntentId(
      asset.captureObjectId,
      destination,
      asset.role
    );
    const idempotencyKey = createDeliveryIdempotencyKey(
      asset.captureObjectId,
      destination,
      asset.role,
      asset.sha256
    );
    const existing = await transaction.getFirstAsync<{
      assetId: string;
      idempotencyKey: string;
    }>(
      `SELECT asset_id AS assetId, idempotency_key AS idempotencyKey
       FROM capture_delivery_intents
       WHERE id = ?`,
      [id]
    );
    if (existing) {
      if (
        existing.assetId !== asset.id ||
        existing.idempotencyKey !== idempotencyKey
      ) {
        throw new Error('Delivery intent identity changed after it was persisted.');
      }
      return;
    }

    const now = Date.now();
    await transaction.runAsync(
      `INSERT INTO capture_delivery_intents (
         id, capture_object_id, session_id, asset_id, asset_role,
         destination, required, state, idempotency_key, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
      [
        id,
        asset.captureObjectId,
        asset.sessionId,
        asset.id,
        asset.role,
        destination,
        required ? 1 : 0,
        idempotencyKey,
        now,
        now,
      ]
    );
  }

  private assertAsset<T extends {
    localUri: string | null;
    byteSize: number | null;
    sha256: string | null;
  }>(
    asset: T,
    label: string
  ): asserts asset is T & {
    localUri: string;
    byteSize: number;
    sha256: string;
  } {
    if (!asset.localUri?.startsWith('file://')) {
      throw new Error(`The ${label} is not in app-private file storage.`);
    }
    if (!Number.isSafeInteger(asset.byteSize) || (asset.byteSize ?? 0) <= 0) {
      throw new Error(`The ${label} has an invalid byte size.`);
    }
    if (!asset.sha256 || !isSha256(asset.sha256)) {
      throw new Error(`The ${label} has an invalid SHA-256 identity.`);
    }
  }
}

export const captureDeliveryLedgerService = new CaptureDeliveryLedgerService();

interface CaptureObjectRow {
  id: string;
  sessionId: string;
  mediaType: 'jpeg' | 'raw';
  localUri: string | null;
  byteSize: number | null;
  sha256: string | null;
  importedAt: number;
}

interface CaptureAssetInput {
  captureObjectId: string;
  sessionId: string;
  role: CaptureAssetRole;
  mediaType: 'jpeg' | 'raw';
  localUri: string;
  byteSize: number;
  sha256: string;
  createdAt: number;
}

interface CaptureAssetRow {
  id: string;
  captureObjectId: string;
  sessionId: string;
  role: CaptureAssetRole;
  localUri: string;
  byteSize: number;
  sha256: string;
}

interface ReceiptExpectationRow {
  id: string;
  state: CaptureDeliveryState;
  destination: CaptureDestination;
  idempotencyKey: string;
  assetSha256: string;
  assetByteSize: number;
}

interface DeliveryDatabase {
  runAsync(source: string, params: (string | number | null)[]): Promise<unknown>;
  getFirstAsync<T>(
    source: string,
    params: (string | number | null)[]
  ): Promise<T | null>;
}

const ASSET_SELECT = `
  SELECT
    id,
    capture_object_id AS captureObjectId,
    session_id AS sessionId,
    role,
    local_uri AS localUri,
    byte_size AS byteSize,
    sha256
  FROM capture_assets`;
const ERROR_MESSAGE_LIMIT = 1_000;
const RECEIPT_ID_LIMIT = 200;
const SIGNATURE_LIMIT = 4_096;
const RECEIPT_APPLICABLE_STATES = new Set<CaptureDeliveryState>([
  'TRANSFERRING',
  'RECEIVED',
  'VERIFIED',
]);
