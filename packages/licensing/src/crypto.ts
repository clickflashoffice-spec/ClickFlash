import { generateKeyPairSync, sign, verify, constants } from 'node:crypto';

export interface LicensePayload {
  machineFingerprint: string;
  issuedAt: number;
  expiresAt?: number;
  features: string[];
}

export interface LicenseData {
  payload: LicensePayload;
  signature: string; // Base64 encoded signature
}

/**
 * Generates an RSA-4096 key pair.
 * In production, the private key should be kept strictly on the license server.
 */
export function generateKeyPair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
}

/**
 * Signs a license payload using the private key.
 */
export function signLicense(payload: LicensePayload, privateKeyPem: string): LicenseData {
  const dataString = JSON.stringify(payload);
  
  const signature = sign(
    'sha256',
    Buffer.from(dataString),
    {
      key: privateKeyPem,
      padding: constants.RSA_PKCS1_PSS_PADDING,
    }
  );

  return {
    payload,
    signature: signature.toString('base64')
  };
}

/**
 * Verifies a signed license using the public key and expected machine fingerprint.
 */
export function verifyLicense(license: LicenseData, publicKeyPem: string, expectedFingerprint: string): boolean {
  if (!license || !license.payload || !license.signature) {
    return false;
  }

  // 1. Verify cryptographic signature
  const dataString = JSON.stringify(license.payload);
  const signatureBuffer = Buffer.from(license.signature, 'base64');

  const isVerified = verify(
    'sha256',
    Buffer.from(dataString),
    {
      key: publicKeyPem,
      padding: constants.RSA_PKCS1_PSS_PADDING,
    },
    signatureBuffer
  );

  if (!isVerified) {
    return false;
  }

  // 2. Verify hardware binding
  if (license.payload.machineFingerprint !== expectedFingerprint) {
    return false;
  }

  // 3. Verify expiration if present
  if (license.payload.expiresAt && Date.now() > license.payload.expiresAt) {
    return false;
  }

  return true;
}
