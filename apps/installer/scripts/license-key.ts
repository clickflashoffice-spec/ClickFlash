import {
  createPublicKey,
  verify as verifySignature,
} from 'node:crypto';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const VALID_PLANS = new Set(['starter', 'pro', 'enterprise', 'trial']);

export interface LicenseData {
  plan: 'starter' | 'pro' | 'enterprise' | 'trial';
  maxMasters: number;
  expiresAt: string | null;
  createdAt: string;
  machineId?: string;
  destinationId?: string;
}

export interface LicenseResult {
  valid: boolean;
  data?: LicenseData;
  error?: string;
}

export function isValidLicensePublicKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value.trim())) return false;
  return Buffer.from(value.trim(), 'base64').length === 32;
}

function decodeBase64Url(value: string): Buffer {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid base64url value');
  }
  return Buffer.from(value, 'base64url');
}

function isLicenseData(value: unknown): value is LicenseData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Record<string, unknown>;
  return (
    typeof data.plan === 'string'
    && VALID_PLANS.has(data.plan)
    && Number.isInteger(data.maxMasters)
    && Number(data.maxMasters) > 0
    && typeof data.createdAt === 'string'
    && Number.isFinite(Date.parse(data.createdAt))
    && (data.expiresAt === null
      || (typeof data.expiresAt === 'string'
        && Number.isFinite(Date.parse(data.expiresAt))))
    && (data.machineId === undefined || typeof data.machineId === 'string')
    && (data.destinationId === undefined || typeof data.destinationId === 'string')
  );
}

export function verifyEd25519License(
  key: string,
  publicKeyB64: string,
  expectedMachineId?: string,
): LicenseResult {
  if (!key.startsWith('CF-LIVE-') && !key.startsWith('CF-TEST-')) {
    return { valid: false, error: 'Invalid license prefix' };
  }

  const parts = key.substring(8).split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid key format' };
  }

  try {
    const payloadBytes = decodeBase64Url(parts[0]);
    const signatureBytes = decodeBase64Url(parts[1]);
    const rawPublicKey = Buffer.from(publicKeyB64, 'base64');

    if (rawPublicKey.length !== 32 || signatureBytes.length !== 64) {
      return { valid: false, error: 'Malformed key data' };
    }

    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, rawPublicKey]),
      format: 'der',
      type: 'spki',
    });
    if (!verifySignature(null, payloadBytes, publicKey, signatureBytes)) {
      return { valid: false, error: 'Invalid signature - key tampered with' };
    }

    const payload: unknown = JSON.parse(payloadBytes.toString('utf8'));
    if (!isLicenseData(payload)) {
      return { valid: false, error: 'Malformed key data' };
    }

    if (payload.expiresAt) {
      const expirationDate = new Date(payload.expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expirationDate < today) {
        return { valid: false, error: 'License key has expired' };
      }
    }

    if (
      payload.machineId
      && expectedMachineId
      && payload.machineId !== expectedMachineId
    ) {
      return {
        valid: false,
        error: 'Machine ID mismatch - license bound to different hardware',
      };
    }

    return { valid: true, data: payload };
  } catch {
    return { valid: false, error: 'Malformed key data' };
  }
}

export async function validateLicenseKey(
  key: string,
  currentMachineId: string,
  publicKeyB64: string,
): Promise<LicenseResult> {
  if (!isValidLicensePublicKey(publicKeyB64)) {
    return { valid: false, error: 'License public key is not configured' };
  }
  const result = verifyEd25519License(key, publicKeyB64, currentMachineId);
  if (result.valid && result.data?.machineId !== currentMachineId) {
    return { valid: false, error: 'License is not bound to this machine' };
  }
  return result;
}
