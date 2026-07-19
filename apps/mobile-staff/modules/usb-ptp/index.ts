import { requireNativeModule, EventEmitter } from 'expo-modules-core';

// This resolves to the native module named 'UsbPtp'
const UsbPtpModule = requireNativeModule('UsbPtp');

const emitter = new EventEmitter(UsbPtpModule);

export interface Subscription {
  remove(): void;
}

export interface CameraInfo {
  manufacturer: string;
  model: string;
  batteryLevel?: number;
}

export function startConnection(): boolean {
  return UsbPtpModule.startConnection();
}

export function stopConnection(): void {
  UsbPtpModule.stopConnection();
}

export function getCameraInfo(): CameraInfo | null {
  return UsbPtpModule.getCameraInfo();
}

export function addPhotoReceivedListener(listener: (event: { photoId: string, localPath: string }) => void): Subscription {
  return (emitter as any).addListener('onPhotoReceived', listener);
}

export function addConnectionStateListener(listener: (event: { connected: boolean, error?: string }) => void): Subscription {
  return (emitter as any).addListener('onConnectionStateChanged', listener);
}
