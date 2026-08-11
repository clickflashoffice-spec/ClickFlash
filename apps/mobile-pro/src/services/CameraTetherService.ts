import { PermissionsAndroid, Platform, type EmitterSubscription } from 'react-native';

import { logger } from '@/utils/logger';

import cameraTetherModule, {
  type CameraImportCompletedEvent,
  type CameraObjectDetectedEvent,
  type CameraStorageStatus,
  type CameraTetherErrorEvent,
  type CameraTetherStatus,
} from '../../modules/camera-tether';
import {
  captureLedgerService,
  type CaptureLedgerCounts,
  type CapturePairingResolution,
} from './CaptureLedgerService';
import { PAIR_WAIT_TIMEOUT_MS } from './CapturePairing';
import { masterDeliveryWorker } from './MasterDeliveryWorker';
import { smartCullingService } from './SmartCullingService';
import { appState } from '../store';


const POLL_INTERVAL_MS = 750;
const MAX_IMPORT_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 750;
const MEBIBYTE = 1024 * 1024;

const unavailableStatus: CameraTetherStatus = {
  isSupported: false,
  phase: 'UNAVAILABLE',
  sessionId: null,
  connected: false,
  deviceId: null,
  cameraKey: null,
  vendorId: null,
  productId: null,
  manufacturerName: null,
  productName: null,
  hasPermission: false,
  baselineCount: 0,
  pollIntervalMs: POLL_INTERVAL_MS,
  storage: {
    level: 'BLOCKED',
    availableBytes: 0,
    totalBytes: 0,
    safetyReserveBytes: 0,
    pendingObjectBytes: 0,
    requiredAvailableBytes: 0,
    deficitBytes: 0,
    canImport: false,
    checkedAt: 0,
  },
  lastErrorCode: 'NATIVE_MODULE_UNAVAILABLE',
  lastErrorMessage: 'Install the Android development build to use wired camera tethering.',
};

class CameraTetherService {
  private readonly inFlightObjects = new Set<string>();
  private readonly storageBlockedObjects = new Map<string, CameraObjectDetectedEvent>();
  private readonly nativeSubscriptions: { remove: () => void }[] = [];
  private status: CameraTetherStatus;
  private activeSessionId: string | null = null;
  private startPromise: Promise<CameraTetherStatus> | null = null;
  private notificationPermissionRequested = false;
  private pairingSweepTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.status = cameraTetherModule?.getStatus() ?? unavailableStatus;
    if (!cameraTetherModule) return;

    this.nativeSubscriptions.push(
      cameraTetherModule.addListener('onCameraState', (status: CameraTetherStatus) => {
        this.publishStatus(status);
      }),
      cameraTetherModule.addListener('onObjectDetected', (event: CameraObjectDetectedEvent) => {
        void this.handleDetectedObject(event);
      }),
      cameraTetherModule.addListener('onTetherError', (error: CameraTetherErrorEvent) => {
        this.publishError(error);
      })
    );
  }

  getStatus(): CameraTetherStatus {
    return this.status;
  }

  async start(): Promise<CameraTetherStatus> {
    if (!cameraTetherModule || !this.status.isSupported) return this.status;
    if (this.startPromise) return this.startPromise;

    const pendingStart = this.startNativeSession();
    this.startPromise = pendingStart;
    try {
      return await pendingStart;
    } finally {
      if (this.startPromise === pendingStart) this.startPromise = null;
    }
  }

  private async startNativeSession(): Promise<CameraTetherStatus> {
    if (!cameraTetherModule) return this.status;
    await this.requestForegroundNotificationPermission();
    this.activeSessionId =
      this.activeSessionId ?? (await captureLedgerService.getOrCreateActiveSession());
    const nextStatus = await cameraTetherModule.startSession(
      this.activeSessionId,
      POLL_INTERVAL_MS
    );
    this.publishStatus(nextStatus);
    return nextStatus;
  }

  async retryConnection(): Promise<CameraTetherStatus> {
    if (
      cameraTetherModule &&
      (this.status.phase === 'STORAGE_BLOCKED' || this.storageBlockedObjects.size > 0)
    ) {
      const blockedObjects = [...this.storageBlockedObjects.values()];
      const pendingBytes = blockedObjects.reduce(
        (largest, event) => Math.max(largest, event.byteSize),
        this.status.storage.pendingObjectBytes
      );
      const storage = cameraTetherModule.getStorageStatus(pendingBytes);
      if (!storage.canImport) {
        cameraTetherModule.openStorageSettings(storage.deficitBytes);
        return this.status;
      }

      for (const event of blockedObjects) {
        await this.handleDetectedObject(event);
      }
      return this.start();
    }
    return this.start();
  }

  async stopAndCloseSession(): Promise<CameraTetherStatus> {
    if (!cameraTetherModule) return this.status;
    const stopped = await cameraTetherModule.stopSession();
    await captureLedgerService.closeActiveSession();
    if (this.pairingSweepTimer) clearTimeout(this.pairingSweepTimer);
    this.pairingSweepTimer = null;
    this.activeSessionId = null;
    this.publishStatus(stopped);
    return stopped;
  }

  async getLedgerCounts(): Promise<CaptureLedgerCounts> {
    const sessionId =
      this.activeSessionId ?? this.status.sessionId ?? await captureLedgerService.getOrCreateActiveSession();
    this.activeSessionId = sessionId;
    return captureLedgerService.getCounts(sessionId);
  }


  private async handleDetectedObject(event: CameraObjectDetectedEvent): Promise<void> {
    const objectKey = [
      event.sessionId,
      event.cameraKey,
      event.objectKey,
    ].join(':');
    if (this.inFlightObjects.has(objectKey) || !cameraTetherModule) return;

    this.inFlightObjects.add(objectKey);
    let ledgerId: string | null = null;
    try {
      const ledgerEntry = await captureLedgerService.recordDetected(event);
      ledgerId = ledgerEntry.id;
      if (ledgerEntry.state === 'LOCAL_VERIFIED') {
        this.storageBlockedObjects.delete(objectKey);
        await this.ensureOriginalDeliverySafely(ledgerEntry.id);
        await this.reconcilePairingSafely(ledgerEntry.id, event);
        await this.publishLedgerCounts();
        return;
      }

      const storage = cameraTetherModule.getStorageStatus(event.byteSize);
      if (!storage.canImport) {
        await this.blockForStorage(objectKey, event, ledgerEntry.id, storage);
        return;
      }

      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_IMPORT_ATTEMPTS; attempt += 1) {
        try {
          await captureLedgerService.markImporting(ledgerEntry.id);
          const imported = await cameraTetherModule.importObject(
            event.sessionId,
            event.storageId,
            event.objectHandle
          );
          await captureLedgerService.markVerified(ledgerEntry.id, imported);
          
          const cullingResult = await smartCullingService.evaluatePhoto(imported.localUri);
          
          await this.ensureOriginalDeliverySafely(ledgerEntry.id);
          const pairing = await this.reconcilePairingSafely(ledgerEntry.id, event);
          this.storageBlockedObjects.delete(objectKey);
          await this.publishLedgerCounts();
          appState.tether.lastVerifiedPreview = {
            captureObjectId: event.objectKey,
            filename: imported.filename,
            localUri: imported.localUri,
            sha256: imported.sha256
          };
          logger.info('[CameraTetherService] Camera capture verified locally.', {
            filename: imported.filename,
            byteSize: imported.byteSize,
            sha256: imported.sha256,
            pairingState: pairing?.state ?? 'UNAVAILABLE',
            pairId: pairing?.pairId ?? null,
            culling: cullingResult,
          });
          return;
        } catch (error) {
          if (this.isStorageBackpressure(error)) {
            await this.blockForStorage(
              objectKey,
              event,
              ledgerEntry.id,
              cameraTetherModule.getStorageStatus(event.byteSize),
              error instanceof Error ? error.message : undefined
            );
            return;
          }
          lastError = error;
          if (attempt < MAX_IMPORT_ATTEMPTS) {
            await this.delay(BASE_RETRY_DELAY_MS * attempt);
          }
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error('Camera import failed after retrying.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (ledgerId) {
        await captureLedgerService.markFailed(
          ledgerId,
          'CAMERA_IMPORT_FAILED',
          message
        );
      }
      this.publishError({
        code: 'CAMERA_IMPORT_FAILED',
        message,
        recoverable: true,
        occurredAt: Date.now(),
      });
    } finally {
      this.inFlightObjects.delete(objectKey);
    }
  }

  private publishStatus(status: CameraTetherStatus): void {
    this.status = status;
    if (status.sessionId) this.activeSessionId = status.sessionId;
    appState.tether.status = status;
  }

  private async blockForStorage(
    objectKey: string,
    event: CameraObjectDetectedEvent,
    ledgerId: string,
    storage: CameraStorageStatus,
    nativeMessage?: string
  ): Promise<void> {
    const deficitMebibytes = Math.max(1, Math.ceil(storage.deficitBytes / MEBIBYTE));
    const message =
      nativeMessage ??
      `Free at least ${deficitMebibytes} MiB on this phone, then retry. ` +
        `${event.filename} remains safe on the camera card.`;
    this.storageBlockedObjects.set(objectKey, event);
    await captureLedgerService.markStorageBlocked(ledgerId, message);
    await this.publishLedgerCounts();
    logger.warn('[CameraTetherService] Camera import paused for storage backpressure.', {
      filename: event.filename,
      availableBytes: storage.availableBytes,
      requiredAvailableBytes: storage.requiredAvailableBytes,
      deficitBytes: storage.deficitBytes,
    });
  }

  private isStorageBackpressure(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = 'code' in error ? String(error.code) : '';
    return code === 'ERR_STORAGE_BACKPRESSURE' || code === 'STORAGE_BACKPRESSURE';
  }

  private async publishLedgerCounts(): Promise<void> {
    try {
      const counts = await this.getLedgerCounts();
      appState.ledger = counts;
    } catch (error) {
      logger.warn('[CameraTetherService] Could not publish camera ledger counts.', error);
    }
  }

  private async reconcilePairingSafely(
    ledgerId: string,
    event: CameraObjectDetectedEvent
  ): Promise<CapturePairingResolution | null> {
    try {
      const resolution = await captureLedgerService.reconcilePairing(ledgerId, event);
      if (resolution.state === 'AMBIGUOUS') {
        this.publishError({
          code: 'CAPTURE_PAIR_AMBIGUOUS',
          message:
            `${event.filename} is locally safe, but has more than one possible ` +
            'RAW+JPEG companion. Keep all originals for Master review.',
          recoverable: true,
          occurredAt: Date.now(),
        });
      }
      if (resolution.state === 'WAITING') this.schedulePairingSweep();
      return resolution;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.publishError({
        code: 'CAPTURE_PAIRING_FAILED',
        message: `The photo is locally safe, but RAW+JPEG pairing needs attention: ${message}`,
        recoverable: true,
        occurredAt: Date.now(),
      });
      return null;
    }
  }

  private async ensureOriginalDeliverySafely(ledgerId: string): Promise<void> {
    try {
      await captureLedgerService.ensureOriginalDelivery(ledgerId);
      void masterDeliveryWorker.drain();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.publishError({
        code: 'CAPTURE_DELIVERY_OUTBOX_FAILED',
        message:
          `The photo is locally safe, but its Master delivery intent needs attention: ${message}`,
        recoverable: true,
        occurredAt: Date.now(),
      });
    }
  }

  private schedulePairingSweep(delayMs = PAIR_WAIT_TIMEOUT_MS + 250): void {
    if (this.pairingSweepTimer) return;
    this.pairingSweepTimer = setTimeout(() => {
      this.pairingSweepTimer = null;
      void this.getLedgerCounts()
        .then((counts) => {
          appState.ledger = counts;
          if (counts.awaitingCompanion > 0) {
            this.schedulePairingSweep(5_000);
          }
        })
        .catch((error) => {
          logger.warn('[CameraTetherService] Pairing timeout sweep failed.', error);
        });
    }, delayMs);
  }

  private publishError(error: CameraTetherErrorEvent): void {
    logger.error(`[CameraTetherService] ${error.code}`, error);
    appState.tether.error = error.message;
  }

  private async requestForegroundNotificationPermission(): Promise<void> {
    if (
      Platform.OS !== 'android' ||
      Number(Platform.Version) < 33 ||
      this.notificationPermissionRequested
    ) {
      return;
    }

    this.notificationPermissionRequested = true;
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    try {
      if (await PermissionsAndroid.check(permission)) return;
      const result = await PermissionsAndroid.request(permission, {
        title: 'Keep camera tether visible',
        message:
          'Allow notifications so Android can show when ClickFlash is monitoring your connected Nikon camera.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      });
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        logger.warn(
          '[CameraTetherService] Notification permission was not granted; Android may hide the tether notification from the notification drawer.',
          { result }
        );
      }
    } catch (error) {
      logger.warn(
        '[CameraTetherService] Could not request the Android notification permission.',
        error
      );
    }
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}

export const cameraTetherService = new CameraTetherService();
