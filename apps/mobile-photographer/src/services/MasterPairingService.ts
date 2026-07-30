import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

import MasterConnectivity, {
  type MasterDiscoveryResult,
} from '../../modules/master-connectivity';
import {
  MOBILE_CAPTURE_PROTOCOL,
  pairingRequestMessage,
  pairingResponseMessage,
} from './MasterCaptureProtocol';

export interface MasterPairingCredential {
  version: 1;
  deviceId: string;
  displayName: string;
  masterId: string;
  baseUrl: string;
  secretBase64: string;
  pairedAt: number;
}

interface PairingToken {
  codeId: string;
  code: string;
}

interface PairingResponse {
  protocol: string;
  masterId: string;
  serverPublicKey: string;
  proof: string;
  pairedAt: number;
}

interface HealthResponse {
  service: string;
  protocol: string;
  masterId: string;
}

const CREDENTIAL_KEY = 'clickflash.mobile-master.credential.v1';
const DEVICE_ID_KEY = 'clickflash.mobile-master.device-id.v1';
const PAIRING_TOKEN_PATTERN =
  /^CF1\.([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{20,64})$/i;
const DEVICE_ID_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;
const SHA256_HMAC_PATTERN = /^[A-Za-z0-9+/]{43}=$/;
const P256_PUBLIC_KEY_PATTERN = /^[A-Za-z0-9+/]{87}=$/;

class MasterPairingService {
  async pairWithToken(rawToken: string): Promise<MasterPairingCredential> {
    const native = this.requireNativeModule();
    const token = this.parsePairingToken(rawToken);
    const deviceId = await this.getOrCreateDeviceId();
    const displayName = (
      Device.deviceName ||
      Device.modelName ||
      'ClickFlash Android'
    ).slice(0, 100);
    const candidates = await native.discoverMasters(4_000);
    if (candidates.length === 0) {
      throw new Error(
        'No ClickFlash Master was found on this Wi-Fi network. Start Master and keep both devices on the same LAN.'
      );
    }

    let lastError: Error | null = null;
    for (const candidate of candidates) {
      const healthy = await this.readHealth(candidate.baseUrl).catch(() => null);
      if (!healthy || healthy.protocol !== MOBILE_CAPTURE_PROTOCOL) continue;

      const pairingKey = native.generatePairingKey();
      let keyConsumed = false;
      try {
        const requestMessage = pairingRequestMessage(
          token.codeId,
          deviceId,
          pairingKey.publicKey
        );
        const proof = native.hmacSha256Base64WithUtf8Key(
          token.code,
          requestMessage
        );
        const response = await this.fetchWithTimeout(
          `${this.normalizeBaseUrl(candidate.baseUrl)}/api/v1/mobile-capture/pair`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codeId: token.codeId,
              deviceId,
              displayName,
              clientPublicKey: pairingKey.publicKey,
              proof,
            }),
          },
          5_000
        );
        const body = await this.readJson(response);
        if (!response.ok) {
          lastError = new Error(this.errorMessage(body, 'Pairing was rejected.'));
          continue;
        }
        const paired = this.requirePairingResponse(body);
        const responseMessage = pairingResponseMessage(
          token.codeId,
          deviceId,
          pairingKey.publicKey,
          paired.serverPublicKey,
          paired.masterId
        );
        if (
          !native.verifyHmacSha256Base64WithUtf8Key(
            token.code,
            responseMessage,
            paired.proof
          )
        ) {
          throw new Error('Master pairing response authentication failed.');
        }
        const secretBase64 = native.derivePairingSecret(
          pairingKey.keyId,
          paired.serverPublicKey,
          token.code,
          responseMessage
        );
        keyConsumed = true;
        const credential: MasterPairingCredential = {
          version: 1,
          deviceId,
          displayName,
          masterId: paired.masterId,
          baseUrl: this.normalizeBaseUrl(candidate.baseUrl),
          secretBase64,
          pairedAt: paired.pairedAt,
        };
        await SecureStore.setItemAsync(
          CREDENTIAL_KEY,
          JSON.stringify(credential)
        );
        return credential;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      } finally {
        if (!keyConsumed) native.discardPairingKey(pairingKey.keyId);
      }
    }

    throw (
      lastError ??
      new Error(
        'A ClickFlash Master was discovered, but it did not accept this pairing code.'
      )
    );
  }

  async getCredential(): Promise<MasterPairingCredential | null> {
    const encoded = await SecureStore.getItemAsync(CREDENTIAL_KEY);
    if (!encoded) return null;
    try {
      const parsed = JSON.parse(encoded) as Partial<MasterPairingCredential>;
      if (
        parsed.version !== 1 ||
        typeof parsed.deviceId !== 'string' ||
        !DEVICE_ID_PATTERN.test(parsed.deviceId) ||
        typeof parsed.displayName !== 'string' ||
        typeof parsed.masterId !== 'string' ||
        !parsed.masterId ||
        typeof parsed.baseUrl !== 'string' ||
        !/^https?:\/\//.test(parsed.baseUrl) ||
        typeof parsed.secretBase64 !== 'string' ||
        !SHA256_HMAC_PATTERN.test(parsed.secretBase64) ||
        !Number.isSafeInteger(parsed.pairedAt)
      ) {
        throw new Error('Stored pairing credential is invalid.');
      }
      return parsed as MasterPairingCredential;
    } catch {
      await SecureStore.deleteItemAsync(CREDENTIAL_KEY);
      return null;
    }
  }

  async resolveCredential(): Promise<MasterPairingCredential | null> {
    const credential = await this.getCredential();
    if (!credential) return null;
    const currentHealth = await this.readHealth(credential.baseUrl).catch(
      () => null
    );
    if (
      currentHealth?.protocol === MOBILE_CAPTURE_PROTOCOL &&
      currentHealth.masterId === credential.masterId
    ) {
      return credential;
    }

    const native = this.requireNativeModule();
    const candidates = await native.discoverMasters(3_000);
    for (const candidate of candidates) {
      const health = await this.readHealth(candidate.baseUrl).catch(() => null);
      if (
        health?.protocol === MOBILE_CAPTURE_PROTOCOL &&
        health.masterId === credential.masterId
      ) {
        const refreshed = {
          ...credential,
          baseUrl: this.normalizeBaseUrl(candidate.baseUrl),
        };
        await SecureStore.setItemAsync(
          CREDENTIAL_KEY,
          JSON.stringify(refreshed)
        );
        return refreshed;
      }
    }
    throw new Error(
      `Paired Master ${credential.masterId} is not reachable on this LAN.`
    );
  }

  async forgetCredential(): Promise<void> {
    await SecureStore.deleteItemAsync(CREDENTIAL_KEY);
  }

  requireNativeModule() {
    if (!MasterConnectivity) {
      throw new Error(
        'Master connectivity is unavailable. Rebuild the Android development client.'
      );
    }
    return MasterConnectivity;
  }

  private parsePairingToken(rawToken: string): PairingToken {
    const match = PAIRING_TOKEN_PATTERN.exec(rawToken.trim());
    if (!match) {
      throw new Error(
        'Enter the complete one-time code generated by ClickFlash Master.'
      );
    }
    return { codeId: match[1], code: match[2] };
  }

  private async getOrCreateDeviceId(): Promise<string> {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing && DEVICE_ID_PATTERN.test(existing)) return existing;
    const deviceId = `android-${Crypto.randomUUID()}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }

  private async readHealth(baseUrl: string): Promise<HealthResponse> {
    const response = await this.fetchWithTimeout(
      `${this.normalizeBaseUrl(baseUrl)}/api/v1/mobile-capture/health`,
      { method: 'GET' },
      2_500
    );
    const body = await this.readJson(response);
    if (
      !response.ok ||
      typeof body !== 'object' ||
      body === null ||
      (body as HealthResponse).service !== 'clickflash-mobile-capture' ||
      typeof (body as HealthResponse).masterId !== 'string'
    ) {
      throw new Error('Master health response is invalid.');
    }
    return body as HealthResponse;
  }

  private requirePairingResponse(value: unknown): PairingResponse {
    if (
      typeof value !== 'object' ||
      value === null ||
      (value as PairingResponse).protocol !== MOBILE_CAPTURE_PROTOCOL ||
      typeof (value as PairingResponse).masterId !== 'string' ||
      !(value as PairingResponse).masterId ||
      typeof (value as PairingResponse).serverPublicKey !== 'string' ||
      !P256_PUBLIC_KEY_PATTERN.test(
        (value as PairingResponse).serverPublicKey
      ) ||
      typeof (value as PairingResponse).proof !== 'string' ||
      !SHA256_HMAC_PATTERN.test((value as PairingResponse).proof) ||
      !Number.isSafeInteger((value as PairingResponse).pairedAt)
    ) {
      throw new Error('Master pairing response is invalid.');
    }
    return value as PairingResponse;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Master returned a non-JSON response (${response.status}).`);
    }
  }

  private errorMessage(value: unknown, fallback: string): string {
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { error?: unknown }).error === 'string'
    ) {
      return (value as { error: string }).error;
    }
    return fallback;
  }

  private normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, '');
  }
}

export const masterPairingService = new MasterPairingService();
