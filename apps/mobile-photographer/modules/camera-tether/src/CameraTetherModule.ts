import { NativeModule, requireOptionalNativeModule } from 'expo';

import type {
  CameraDevice,
  CameraImportCompletedEvent,
  CameraTetherEvents,
  CameraTetherStatus,
} from './CameraTether.types';

export declare class CameraTetherNativeModule extends NativeModule<CameraTetherEvents> {
  getStatus(): CameraTetherStatus;
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
