import { logger } from '@/utils/logger';

import cameraTetherModule, {
  type CameraImportCompletedEvent,
  type CameraObjectDetectedEvent,
  type CameraTetherErrorEvent,
  type CameraTetherStatus,
} from '../../modules/camera-tether';
import {
  captureLedgerService,
  type CaptureLedgerCounts,
} from './CaptureLedgerService';

type RemovableSubscription = { remove(): void };
type StatusListener = (status: CameraTetherStatus) => void;
type ImportListener = (capture: CameraImportCompletedEvent) => void;
type ErrorListener = (error: CameraTetherErrorEvent) => void;

const POLL_INTERVAL_MS = 750;
const MAX_IMPORT_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 750;

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
  lastErrorCode: 'NATIVE_MODULE_UNAVAILABLE',
  lastErrorMessage: 'Install the Android development build to use wired camera tethering.',
};

class CameraTetherService {
  private readonly statusListeners = new Set<StatusListener>();
  private readonly importListeners = new Set<ImportListener>();
  private readonly errorListeners = new Set<ErrorListener>();
  private readonly inFlightObjects = new Set<string>();
  private readonly nativeSubscriptions: RemovableSubscription[] = [];
  private status: CameraTetherStatus;
  private activeSessionId: string | null = null;

  constructor() {
    this.status = cameraTetherModule?.getStatus() ?? unavailableStatus;
    if (!cameraTetherModule) return;

    this.nativeSubscriptions.push(
      cameraTetherModule.addListener('onCameraState', (status) => {
        this.publishStatus(status);
      }),
      cameraTetherModule.addListener('onObjectDetected', (event) => {
        void this.handleDetectedObject(event);
      }),
      cameraTetherModule.addListener('onTetherError', (error) => {
        this.publishError(error);
      })
    );
  }

  getStatus(): CameraTetherStatus {
    return this.status;
  }

  async start(): Promise<CameraTetherStatus> {
    if (!cameraTetherModule || !this.status.isSupported) return this.status;

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
    return this.start();
  }

  async stopAndCloseSession(): Promise<CameraTetherStatus> {
    if (!cameraTetherModule) return this.status;
    const stopped = await cameraTetherModule.stopSession();
    await captureLedgerService.closeActiveSession();
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

  addStatusListener(listener: StatusListener): RemovableSubscription {
    this.statusListeners.add(listener);
    listener(this.status);
    return { remove: () => this.statusListeners.delete(listener) };
  }

  addImportListener(listener: ImportListener): RemovableSubscription {
    this.importListeners.add(listener);
    return { remove: () => this.importListeners.delete(listener) };
  }

  addErrorListener(listener: ErrorListener): RemovableSubscription {
    this.errorListeners.add(listener);
    return { remove: () => this.errorListeners.delete(listener) };
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
      if (ledgerEntry.state === 'LOCAL_VERIFIED') return;

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
          this.importListeners.forEach((listener) => listener(imported));
          logger.info('[CameraTetherService] Camera capture verified locally.', {
            filename: imported.filename,
            byteSize: imported.byteSize,
            sha256: imported.sha256,
          });
          return;
        } catch (error) {
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
    this.statusListeners.forEach((listener) => listener(status));
  }

  private publishError(error: CameraTetherErrorEvent): void {
    logger.error(`[CameraTetherService] ${error.code}`, error);
    this.errorListeners.forEach((listener) => listener(error));
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}

export const cameraTetherService = new CameraTetherService();
