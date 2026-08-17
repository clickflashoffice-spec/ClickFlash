import nacl from 'tweetnacl';
import { ZeroTrustNodeAttestation } from '@clickflash/types';

export interface AttestationSigningKeys {
  publicKeyBase64: string;
  secretKeyBase64: string;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

export class ZeroTrustEnclaveManager {
  /**
   * Generates a new ED25519 keypair for enclave root attestation
   */
  public static generateKeyPair(): AttestationSigningKeys {
    const keyPair = nacl.sign.keyPair();
    return {
      publicKeyBase64: uint8ArrayToBase64(keyPair.publicKey),
      secretKeyBase64: uint8ArrayToBase64(keyPair.secretKey)
    };
  }

  /**
   * Constructs and signs an enclave node attestation
   */
  public static createAttestation(
    nodeId: string,
    hardwareFingerprint: string,
    capabilities: ZeroTrustNodeAttestation['allowedCapabilities'],
    leaseDurationHours: number,
    keys: AttestationSigningKeys
  ): ZeroTrustNodeAttestation {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + leaseDurationHours * 3600 * 1000);
    const nonce = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    const payload = `${nodeId}:${hardwareFingerprint}:${capabilities.sort().join(',')}:${now.toISOString()}:${expiresAt.toISOString()}:${nonce}`;
    const payloadBytes = new TextEncoder().encode(payload);
    const secretKeyBytes = base64ToUint8Array(keys.secretKeyBase64);
    const signature = nacl.sign.detached(payloadBytes, secretKeyBytes);

    return {
      nodeId,
      hardwareFingerprintDigest: hardwareFingerprint,
      tpmEnclavePublicKey: keys.publicKeyBase64,
      leaseGrantedAt: now.toISOString(),
      leaseExpiresAt: expiresAt.toISOString(),
      allowedCapabilities: capabilities,
      signatureEd25519: uint8ArrayToBase64(signature),
      nonce
    };
  }

  /**
   * Verifies an enclave node attestation against cryptographic signature and lease duration
   */
  public static verifyAttestation(
    attestation: ZeroTrustNodeAttestation,
    expectedHardwareFingerprint?: string
  ): { valid: boolean; error?: string } {
    try {
      const now = new Date();
      const expiresAt = new Date(attestation.leaseExpiresAt);

      if (now > expiresAt) {
        return { valid: false, error: 'Attestation lease expired' };
      }

      if (expectedHardwareFingerprint && attestation.hardwareFingerprintDigest !== expectedHardwareFingerprint) {
        return { valid: false, error: 'Hardware fingerprint mismatch' };
      }

      const payload = `${attestation.nodeId}:${attestation.hardwareFingerprintDigest}:${attestation.allowedCapabilities.sort().join(',')}:${attestation.leaseGrantedAt}:${attestation.leaseExpiresAt}:${attestation.nonce}`;
      const payloadBytes = new TextEncoder().encode(payload);
      const signatureBytes = base64ToUint8Array(attestation.signatureEd25519);
      const publicKeyBytes = base64ToUint8Array(attestation.tpmEnclavePublicKey);

      const isValidSignature = nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKeyBytes);
      if (!isValidSignature) {
        return { valid: false, error: 'Invalid ED25519 cryptographic signature' };
      }

      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: `Attestation verification exception: ${err.message}` };
    }
  }
}
