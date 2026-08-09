import {
  AESEncryptionKey,
  AESSealedData,
  CryptoDigestAlgorithm,
  aesDecryptAsync,
  digestStringAsync,
} from 'expo-crypto';
import type { PhotographerCommandCenterV1 } from '@clickflash/types';

import {
  MOBILE_COMMAND_CENTER_PATH,
  MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
  canonicalMobileCommandCenterRequest,
  type MobileCommandCenterPeriod,
  type MobileCommandCenterRequestIdentity,
} from './MasterCaptureProtocol';
import { masterPairingService } from './MasterPairingService';
import { parseVerifiedCommandCenterResponse } from './PhotographerCommandCenterResponse';

export interface VerifiedCommandCenterSnapshot {
  snapshot: PhotographerCommandCenterV1;
  masterId: string;
  verifiedAt: string;
  payloadProtection: 'AEAD_AES_256_GCM';
}

class PhotographerCommandCenterClient {
  async fetchSnapshot(
    period: MobileCommandCenterPeriod
  ): Promise<VerifiedCommandCenterSnapshot> {
    const credential = await masterPairingService.resolveCredential();
    if (!credential) {
      throw new Error('Pair this Android device with ClickFlash Master first.');
    }
    const native = masterPairingService.requireNativeModule();
    const identity: MobileCommandCenterRequestIdentity = {
      masterId: credential.masterId,
      deviceId: credential.deviceId,
      encryptionProtocol: MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
      keyEpoch: String(credential.pairedAt),
      timestamp: String(Date.now()),
      nonce: native.randomNonce(24),
      period,
    };
    const signature = native.hmacSha256Base64(
      credential.secretBase64,
      canonicalMobileCommandCenterRequest(identity)
    );
    const response = await this.fetchWithTimeout(
      `${credential.baseUrl}${MOBILE_COMMAND_CENTER_PATH}?period=${encodeURIComponent(period)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-ClickFlash-Device-Id': identity.deviceId,
          'X-ClickFlash-Encryption': identity.encryptionProtocol,
          'X-ClickFlash-Key-Epoch': identity.keyEpoch,
          'X-ClickFlash-Timestamp': identity.timestamp,
          'X-ClickFlash-Nonce': identity.nonce,
          'X-ClickFlash-Signature': signature,
        },
      },
      8_000
    );
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(this.errorMessage(responseText, response.status));
    }

    const computedHash = (
      await digestStringAsync(
        CryptoDigestAlgorithm.SHA256,
        responseText
      )
    ).toLowerCase();
    const snapshot = await parseVerifiedCommandCenterResponse({
      responseText,
      responseProtocol: response.headers.get('x-clickflash-response-protocol'),
      encryptionProtocol: response.headers.get('x-clickflash-encryption'),
      keyEpoch: response.headers.get('x-clickflash-key-epoch'),
      declaredSha256: response.headers.get('x-clickflash-content-sha256'),
      computedSha256: computedHash,
      signature: response.headers.get('x-clickflash-signature'),
      identity,
      verifySignature: (message, candidateSignature) =>
        native.verifyHmacSha256Base64(
          credential.secretBase64,
          message,
          candidateSignature
        ),
      decryptEnvelope: async (envelope, keyInfo, aad) => {
        const keyBase64 = native.hkdfSha256Base64(
          credential.secretBase64,
          keyInfo
        );
        const key = await AESEncryptionKey.import(keyBase64, 'base64');
        const sealed = AESSealedData.fromParts(
          envelope.iv,
          envelope.ciphertext,
          envelope.tag
        );
        const plaintext = await aesDecryptAsync(sealed, key, {
          additionalData: new TextEncoder().encode(aad),
          output: 'bytes',
        });
        return new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
      },
    });
    return {
      snapshot,
      masterId: credential.masterId,
      verifiedAt: new Date().toISOString(),
      payloadProtection: 'AEAD_AES_256_GCM',
    };
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Master command-center request timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private errorMessage(responseText: string, status: number): string {
    try {
      const body = JSON.parse(responseText) as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) return body.error;
    } catch {
      // Use a bounded generic error without reflecting untrusted response text.
    }
    return `Master command-center request failed (${status}).`;
  }
}

export const photographerCommandCenterClient =
  new PhotographerCommandCenterClient();
