import { NativeModule, registerWebModule } from 'expo';

import type {
  MasterConnectivityNativeModule,
  MasterDiscoveryResult,
  PairingKey,
} from './MasterConnectivityModule';

class MasterConnectivityWebModule
  extends NativeModule
  implements MasterConnectivityNativeModule
{
  async discoverMasters(): Promise<MasterDiscoveryResult[]> {
    return [];
  }

  setPinnedFingerprint(_fingerprint: string | null): void {
    // No-op on web
  }

  generatePairingKey(): PairingKey {
    throw new Error('Master pairing is available only in the Android field app.');
  }

  derivePairingSecret(): string {
    throw new Error('Master pairing is available only in the Android field app.');
  }

  discardPairingKey(): void {}

  hmacSha256Base64WithUtf8Key(): string {
    throw new Error('Native HMAC is unavailable on this platform.');
  }

  hmacSha256Base64(): string {
    throw new Error('Native HMAC is unavailable on this platform.');
  }

  hkdfSha256Base64(): string {
    throw new Error('Native HKDF is unavailable on this platform.');
  }

  verifyHmacSha256Base64(): boolean {
    return false;
  }

  verifyHmacSha256Base64WithUtf8Key(): boolean {
    return false;
  }

  randomNonce(): string {
    throw new Error('Native secure random is unavailable on this platform.');
  }
}

export default registerWebModule(
  MasterConnectivityWebModule,
  'MasterConnectivity'
);
