import nacl from 'tweetnacl';

export interface Ed25519LicenseData {
  plan: 'starter' | 'pro' | 'enterprise' | 'trial';
  maxMasters: number;
  expiresAt: string | null;
  createdAt: string;
  machineId?: string;
  destinationId?: string;
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
  machineId?: string;
}

export interface Ed25519GeneratedLicense {
  key: string;
  plan: string;
  maxMasters: number;
  expiresAt: string | null;
  createdAt: string;
  machineId?: string;
}

export interface Ed25519ValidateOptions {
  expectedMachineId?: string;
}

function base64ToUint8Array(base64: string): Uint8Array {
  // Use global atob which is available in browser and Node 16+
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Use global btoa
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function generateEd25519KeyPair() {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: uint8ArrayToBase64(keyPair.publicKey),
    privateKey: uint8ArrayToBase64(keyPair.secretKey)
  };
}

export function generateEd25519License(
  options: Ed25519GenerateOptions,
  privateKeyB64: string
): Ed25519GeneratedLicense {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + options.expiresDays);
  
  const privateKey = base64ToUint8Array(privateKeyB64);

  const payload: Ed25519LicenseData = {
    plan: options.plan,
    maxMasters: options.maxMasters,
    expiresAt: expiresAt.toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    machineId: options.machineId || undefined,
  };
  
  const payloadStr = JSON.stringify({ ...payload, nonce: Math.random().toString(36).substring(2, 10) });
  const payloadBytes = new TextEncoder().encode(payloadStr);
  
  // Sign the payload
  const signatureBytes = nacl.sign.detached(payloadBytes, privateKey);
  
  const payloadB64 = uint8ArrayToBase64(payloadBytes)
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signatureB64 = uint8ArrayToBase64(signatureBytes)
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
  return {
    key: `CF-LIVE-${payloadB64}.${signatureB64}`,
    plan: payload.plan,
    maxMasters: payload.maxMasters,
    expiresAt: payload.expiresAt,
    createdAt: payload.createdAt,
    machineId: payload.machineId
  };
}

export function verifyEd25519License(
  key: string,
  publicKeyB64: string,
  options?: Ed25519ValidateOptions
): Ed25519LicenseResult {
  if (!key.startsWith('CF-LIVE-') && !key.startsWith('CF-TEST-')) {
    return { valid: false, error: 'Invalid license prefix' };
  }
  
  const parts = key.substring(8).split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid key format' };
  }
  
  try {
    const payloadB64 = parts[0].padEnd(parts[0].length + (4 - parts[0].length % 4) % 4, '=').replace(/-/g, '+').replace(/_/g, '/');
    const signatureB64 = parts[1].padEnd(parts[1].length + (4 - parts[1].length % 4) % 4, '=').replace(/-/g, '+').replace(/_/g, '/');
    
    const payloadBytes = base64ToUint8Array(payloadB64);
    const signatureBytes = base64ToUint8Array(signatureB64);
    const publicKey = base64ToUint8Array(publicKeyB64);
    
    const isValid = nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKey);
    
    if (!isValid) {
      return { valid: false, error: 'Invalid signature - key tampered with' };
    }
    
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Ed25519LicenseData;

    // Expiration check
    if (payload.expiresAt) {
      const expirationDate = new Date(payload.expiresAt);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (expirationDate < now) {
        return { valid: false, error: 'License key has expired' };
      }
    }

    // Hardware machine-binding check
    if (payload.machineId && options?.expectedMachineId && payload.machineId !== options.expectedMachineId) {
      return { valid: false, error: 'Machine ID mismatch - license bound to different hardware' };
    }
    
    return {
      valid: true,
      data: payload
    };
  } catch (e) {
    return { valid: false, error: 'Malformed key data' };
  }
}
