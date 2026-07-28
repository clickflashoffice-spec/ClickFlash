export type CameraTetherPhase =
  | 'UNAVAILABLE'
  | 'STOPPED'
  | 'WAITING_FOR_CAMERA'
  | 'PERMISSION_REQUIRED'
  | 'CONNECTING'
  | 'BASELINING'
  | 'MONITORING'
  | 'ERROR';

export interface CameraTetherStatus {
  isSupported: boolean;
  phase: CameraTetherPhase;
  sessionId: string | null;
  connected: boolean;
  deviceId: number | null;
  cameraKey: string | null;
  vendorId: number | null;
  productId: number | null;
  manufacturerName: string | null;
  productName: string | null;
  hasPermission: boolean;
  baselineCount: number;
  pollIntervalMs: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}

export interface CameraDevice {
  deviceId: number;
  vendorId: number;
  productId: number;
  manufacturerName: string | null;
  productName: string | null;
  hasPermission: boolean;
  isNikon: boolean;
}

export interface CameraObjectDetectedEvent {
  sessionId: string;
  cameraKey: string;
  deviceId: number;
  storageId: number;
  objectHandle: number;
  objectKey: string;
  filename: string;
  mediaType: 'jpeg' | 'raw';
  byteSize: number;
  cameraCreatedAt: number;
  detectedAt: number;
}

export interface CameraImportCompletedEvent {
  sessionId: string;
  cameraKey: string;
  deviceId: number;
  storageId: number;
  objectHandle: number;
  objectKey: string;
  filename: string;
  mediaType: 'jpeg' | 'raw';
  byteSize: number;
  sha256: string;
  localUri: string;
  importedAt: number;
}

export interface CameraTetherErrorEvent {
  code: string;
  message: string;
  recoverable: boolean;
  occurredAt: number;
}

export type CameraTetherEvents = {
  onCameraState(event: CameraTetherStatus): void;
  onObjectDetected(event: CameraObjectDetectedEvent): void;
  onImportCompleted(event: CameraImportCompletedEvent): void;
  onTetherError(event: CameraTetherErrorEvent): void;
};
