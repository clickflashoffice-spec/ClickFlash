import { NativeModule, requireNativeModule, EventEmitter } from 'expo';

export type PhotoReceivedEvent = {
  uri: string;
};

export type DeviceConnectedEvent = {
  name: string;
};

export declare class ExpoDslrUsbModule extends NativeModule {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  pollPhotos(): Promise<string[]>;
}

const module = requireNativeModule<ExpoDslrUsbModule>('ExpoDslrUsb');

export const emitter = new EventEmitter(module ?? {} as any);

export default module;
