import { NativeModule, registerWebModule } from 'expo';

import type {
  CameraDevice,
  CameraImportCompletedEvent,
  CameraStorageStatus,
  CameraTetherEvents,
  CameraTetherStatus,
} from './CameraTether.types';

const unsupportedStorage: CameraStorageStatus = {
  level: 'BLOCKED',
  availableBytes: 0,
  totalBytes: 0,
  safetyReserveBytes: 0,
  pendingObjectBytes: 0,
  requiredAvailableBytes: 0,
  deficitBytes: 0,
  canImport: false,
  checkedAt: 0,
};

const unsupportedStatus: CameraTetherStatus = {
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
  pollIntervalMs: 750,
  storage: unsupportedStorage,
  lastErrorCode: 'PLATFORM_UNSUPPORTED',
  lastErrorMessage: 'Wired camera tethering is available in the Android field app.',
};

class CameraTetherWebModule extends NativeModule<CameraTetherEvents> {
  getStatus(): CameraTetherStatus {
    return unsupportedStatus;
  }

  getStorageStatus(): CameraStorageStatus {
    return unsupportedStorage;
  }

  openStorageSettings(): void {
    throw new Error('Storage settings are unavailable on this platform.');
  }

  listDevices(): CameraDevice[] {
    return [];
  }

  async startSession(): Promise<CameraTetherStatus> {
    return unsupportedStatus;
  }

  async stopSession(): Promise<CameraTetherStatus> {
    return unsupportedStatus;
  }

  async importObject(): Promise<CameraImportCompletedEvent> {
    throw new Error('Wired camera tethering is unavailable on this platform.');
  }
}

export default registerWebModule(CameraTetherWebModule, 'CameraTether');
