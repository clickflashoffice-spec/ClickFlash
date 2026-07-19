import nacl from 'tweetnacl';

export interface Ed25519LicenseData {
  plan: 'starter' | 'pro' | 'enterprise' | 'trial';
  maxMasters: number;
  expiresAt: string | null;
  createdAt: string;
  machineId: string;
  destinationId?: string;
  nonce: string;
}

export interface Ed25519LicenseResult {
  valid: boolean;
  data?: Ed25519LicenseData;
  error?: string;
}

export interface Ed25519GenerateOptions {
  plan: 'starter' | 'pro' | 'enterprise' | 'trial';
  maxMasters: number;
  expiresDays: number;
  machineId: string;
}

export interface Ed25519GeneratedLicense {
  key: string;
  plan: string;
  maxMasters: number;
  expiresAt: string | null;
  createdAt: string;
  machineId: string;
}

export interface Ed25519ValidateOptions {
  expectedMachineId?: string;
  crl?: string[] | Set<string>; // Certificate Revocation List (array or set of revoked nonces or signatures)
}

const PLANS = new Set(['starter', 'pro', 'enterprise', 'trial']);
const PAYLOAD_KEYS = new Set([
  'plan',
  'maxMasters',
  'expiresAt',
  'createdAt',
  'machineId',
  'destinationId',
  'nonce',
]);

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
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
  return btoa(binary);
}

function toBase64Url(bytes: Uint8Array): string {
  return uint8ArrayToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function isLicenseData(value: unknown): value is Ed25519LicenseData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return Object.keys(data).every((key) => PAYLOAD_KEYS.has(key))
    && typeof data.plan === 'string'
    && PLANS.has(data.plan)
    && Number.isInteger(data.maxMasters)
    && Number(data.maxMasters) >= 1
    && Number(data.maxMasters) <= 10_000
    && (data.expiresAt === null
      || (typeof data.expiresAt === 'string' && Number.isFinite(Date.parse(data.expiresAt))))
    && typeof data.createdAt === 'string'
    && Number.isFinite(Date.parse(data.createdAt))
    && typeof data.machineId === 'string'
    && data.machineId.trim().length >= 1
    && data.machineId.length <= 256
    && (data.destinationId === undefined
      || (typeof data.destinationId === 'string'
        && data.destinationId.trim().length >= 1
        && data.destinationId.length <= 256))
    && typeof data.nonce === 'string'
    && data.nonce.length >= 8
    && data.nonce.length <= 128;
}

export function generateEd25519KeyPair() {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: uint8ArrayToBase64(keyPair.publicKey),
    privateKey: uint8ArrayToBase64(keyPair.secretKey),
  };
}

export function generateEd25519License(
  options: Ed25519GenerateOptions,
  privateKeyB64: string,
): Ed25519GeneratedLicense {
  const machineId = options.machineId.trim();
  if (!machineId || machineId.length > 256) {
    throw new Error('A valid machine ID is required');
  }
  if (!PLANS.has(options.plan) || !Number.isInteger(options.maxMasters)
    || options.maxMasters < 1 || options.maxMasters > 10_000) {
    throw new Error('License options are invalid');
  }

  const privateKey = base64ToUint8Array(privateKeyB64);
  if (privateKey.length !== nacl.sign.secretKeyLength) {
    throw new Error('Ed25519 private key length is invalid');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + options.expiresDays);
  const payload: Ed25519LicenseData = {
    plan: options.plan,
    maxMasters: options.maxMasters,
    expiresAt: expiresAt.toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    machineId,
    nonce: toBase64Url(nacl.randomBytes(12)),
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signatureBytes = nacl.sign.detached(payloadBytes, privateKey);

  return {
    key: `CF-LIVE-${toBase64Url(payloadBytes)}.${toBase64Url(signatureBytes)}`,
    plan: payload.plan,
    maxMasters: payload.maxMasters,
    expiresAt: payload.expiresAt,
    createdAt: payload.createdAt,
    machineId: payload.machineId,
  };
}

export function bulkGenerateLicenses(
  optionsList: Ed25519GenerateOptions[],
  privateKeyB64: string,
): Ed25519GeneratedLicense[] {
  return optionsList.map(options => generateEd25519License(options, privateKeyB64));
}

export function exportLicensesToCSV(licenses: Ed25519GeneratedLicense[]): string {
  const header = ['key', 'plan', 'maxMasters', 'expiresAt', 'createdAt', 'machineId'].join(',');
  const rows = licenses.map(l => 
    [l.key, l.plan, l.maxMasters, l.expiresAt || '', l.createdAt, l.machineId].join(',')
  );
  return [header, ...rows].join('\n');
}

export function verifyEd25519License(
  key: string,
  publicKeyB64: string,
  options?: Ed25519ValidateOptions,
): Ed25519LicenseResult {
  if (!key.startsWith('CF-LIVE-') && !key.startsWith('CF-TEST-')) {
    return { valid: false, error: 'Invalid license prefix' };
  }

  const parts = key.substring(8).split('.');
  if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    return { valid: false, error: 'Invalid key format' };
  }

  try {
    const decode = (value: string) => base64ToUint8Array(
      value.padEnd(value.length + (4 - value.length % 4) % 4, '=')
        .replace(/-/g, '+')
        .replace(/_/g, '/'),
    );
    const payloadBytes = decode(parts[0]);
    const signatureBytes = decode(parts[1]);
    const publicKey = base64ToUint8Array(publicKeyB64);
    if (signatureBytes.length !== nacl.sign.signatureLength
      || publicKey.length !== nacl.sign.publicKeyLength) {
      return { valid: false, error: 'Malformed key data' };
    }
    if (!nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKey)) {
      return { valid: false, error: 'Invalid signature - key tampered with' };
    }

    const payload: unknown = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (!isLicenseData(payload)) {
      return { valid: false, error: 'Malformed key data' };
    }

    // CRL check
    if (options?.crl) {
      const crlSet = options.crl instanceof Set ? options.crl : new Set(options.crl);
      if (crlSet.has(payload.nonce) || crlSet.has(parts[1])) {
        return { valid: false, error: 'License has been revoked' };
      }
    }

    if (payload.expiresAt) {
      const expirationDate = new Date(payload.expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expirationDate < today) {
        return { valid: false, error: 'License key has expired' };
      }
    }

    if (options?.expectedMachineId && payload.machineId !== options.expectedMachineId) {
      return { valid: false, error: 'Machine ID mismatch - license bound to different hardware' };
    }

    return { valid: true, data: payload };
  } catch {
    return { valid: false, error: 'Malformed key data' };
  }
}

