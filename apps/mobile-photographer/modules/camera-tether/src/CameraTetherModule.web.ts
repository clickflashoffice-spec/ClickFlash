import { NativeModule, registerWebModule } from 'expo';

import type {
  CameraDevice,
  CameraImportCompletedEvent,
  CameraTetherEvents,
  CameraTetherStatus,
} from './CameraTether.types';

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
  lastErrorCode: 'PLATFORM_UNSUPPORTED',
  lastErrorMessage: 'Wired camera tethering is available in the Android field app.',
};

class CameraTetherWebModule extends NativeModule<CameraTetherEvents> {
  getStatus(): CameraTetherStatus {
    return unsupportedStatus;
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
