import { generateEd25519License, verifyEd25519License } from '@clickflash/licensing';
import type { LicenseKeyData } from '../types/license';

interface GenerateOptions {
  plan: 'trial' | 'starter' | 'pro' | 'enterprise';
  maxMasters: number;
  expiresDays: number;
  count: number;
  machineId: string;
}

export function isValidSigningKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9+/]{86}==$/.test(value.trim());
}

export async function generateLicenseKeys(
  options: GenerateOptions,
  signingKey: string,
): Promise<LicenseKeyData[]> {
  const privateKey = signingKey.trim();
  if (!isValidSigningKey(privateKey)) {
    throw new Error('Enter a valid Ed25519 private signing key');
  }

  const keys: LicenseKeyData[] = [];

  for (let i = 0; i < options.count; i++) {
    const license = generateEd25519License({
      plan: options.plan,
      maxMasters: options.maxMasters,
      expiresDays: options.expiresDays,
      machineId: options.machineId
    }, privateKey);
    
    keys.push({
      key: license.key,
      plan: license.plan,
      maxMasters: license.maxMasters,
      expiresAt: license.expiresAt || '',
      createdAt: license.createdAt,
      machineId: license.machineId
    });
  }

  return keys;
}

export interface ValidateOptions {
  expectedMachineId?: string;
}

export async function validateLicenseKey(
  key: string,
  publicKeyB64: string,
  options?: ValidateOptions
): Promise<{ valid: boolean; plan?: string; maxMasters?: number; expiresAt?: string; machineId?: string; error?: string }> {
  const result = verifyEd25519License(key, publicKeyB64, options);
  
  if (result.valid && result.data) {
    return {
      valid: true,
      plan: result.data.plan,
      maxMasters: result.data.maxMasters,
      expiresAt: result.data.expiresAt || undefined,
      machineId: result.data.machineId
    };
  }
  
  return {
    valid: false,
    error: result.error
  };
}
