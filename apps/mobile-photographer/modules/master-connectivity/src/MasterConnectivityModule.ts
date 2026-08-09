import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface MasterDiscoveryResult {
  serviceName: string;
  host: string;
  port: number;
  baseUrl: string;
  masterId: string | null;
  protocol: string | null;
  transport: 'http' | 'https';
}

export interface PairingKey {
  keyId: string;
  publicKey: string;
}

export declare class MasterConnectivityNativeModule extends NativeModule {
  discoverMasters(timeoutMs: number): Promise<MasterDiscoveryResult[]>;
  setPinnedFingerprint(fingerprint: string | null): void;
  generatePairingKey(): PairingKey;
  derivePairingSecret(
    keyId: string,
    serverPublicKeyBase64: string,
    salt: string,
    info: string
  ): string;
  discardPairingKey(keyId: string): void;
  hmacSha256Base64WithUtf8Key(key: string, message: string): string;
  hmacSha256Base64(secretBase64: string, message: string): string;
  hkdfSha256Base64(secretBase64: string, info: string): string;
  verifyHmacSha256Base64(
    secretBase64: string,
    message: string,
    signatureBase64: string
  ): boolean;
  verifyHmacSha256Base64WithUtf8Key(
    key: string,
    message: string,
    signatureBase64: string
  ): boolean;
  randomNonce(byteCount: number): string;
}

export default requireOptionalNativeModule<MasterConnectivityNativeModule>(
  'MasterConnectivity'
);
