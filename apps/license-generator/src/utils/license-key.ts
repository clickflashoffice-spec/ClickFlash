import nacl from 'tweetnacl';

const PRIVATE_KEY_B64 = "EQdSP71FUDU55wNFrjIfVQUpYBme6kBsYhD1ecjmvAg9TlyEi1GiO7PcemwH8fQttWH/4Fh4EUzizyC/GYS+pQ==";
const PUBLIC_KEY_B64 = "PU5chItRojuz3HpsB/H0LbVh/+BYeBFM4s8gvxmEvqU=";

interface LicenseKeyData {
  key: string;
  plan: string;
  maxMasters: number;
  expiresAt: string;
  createdAt: string;
  machineId?: string;
}

interface GenerateOptions {
  plan: 'trial' | 'starter' | 'pro' | 'enterprise';
  maxMasters: number;
  expiresDays: number;
  count: number;
  machineId?: string;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
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

export async function generateLicenseKeys(options: GenerateOptions): Promise<LicenseKeyData[]> {
  const keys: LicenseKeyData[] = [];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + options.expiresDays);
  
  const privateKey = base64ToUint8Array(PRIVATE_KEY_B64);

  for (let i = 0; i < options.count; i++) {
    const payload = {
      plan: options.plan,
      maxMasters: options.maxMasters,
      expiresAt: expiresAt.toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      machineId: options.machineId || null,
      nonce: Math.random().toString(36).substring(2, 10)
    };
    
    const payloadStr = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadStr);
    
    // Sign the payload
    const signatureBytes = nacl.sign.detached(payloadBytes, privateKey);
    
    const payloadB64 = uint8ArrayToBase64(payloadBytes)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const signatureB64 = uint8ArrayToBase64(signatureBytes)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
    keys.push({
      key: `CF-LIVE-${payloadB64}.${signatureB64}`,
      plan: payload.plan,
      maxMasters: payload.maxMasters,
      expiresAt: payload.expiresAt,
      createdAt: payload.createdAt,
      machineId: payload.machineId || undefined
    });
  }

  return keys;
}

export async function validateLicenseKey(key: string): Promise<{ valid: boolean; plan?: string; maxMasters?: number; expiresAt?: string; machineId?: string; error?: string }> {
  if (!key.startsWith('CF-LIVE-')) {
    return { valid: false, error: 'Invalid key prefix' };
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
    const publicKey = base64ToUint8Array(PUBLIC_KEY_B64);
    
    const isValid = nacl.sign.detached.verify(payloadBytes, signatureBytes, publicKey);
    
    if (!isValid) {
      return { valid: false, error: 'Invalid signature - key tampered with' };
    }
    
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    
    return {
      valid: true,
      plan: payload.plan,
      maxMasters: payload.maxMasters,
      expiresAt: payload.expiresAt,
      machineId: payload.machineId
    };
  } catch (e) {
    return { valid: false, error: 'Malformed key data' };
  }
}

