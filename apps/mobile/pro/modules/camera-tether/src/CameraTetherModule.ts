import { NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  CameraDevice,
  CameraImportCompletedEvent,
  CameraStorageStatus,
  CameraTetherEvents,
  CameraTetherStatus,
} from './CameraTether.types';

export declare class CameraTetherNativeModule extends NativeModule<CameraTetherEvents> {
  getStatus(): CameraTetherStatus;
  getStorageStatus(requiredBytes: number): CameraStorageStatus;
  openStorageSettings(requestedBytes: number): void;
  listDevices(): CameraDevice[];
  startSession(sessionId: string, pollIntervalMs: number): Promise<CameraTetherStatus>;
  stopSession(): Promise<CameraTetherStatus>;
  importObject(
    sessionId: string,
    storageId: number,
    objectHandle: number
  ): Promise<CameraImportCompletedEvent>;
}

export default requireOptionalNativeModule<CameraTetherNativeModule>('CameraTether');
