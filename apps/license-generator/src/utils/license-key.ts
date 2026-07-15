import { generateEd25519License, verifyEd25519License } from '@clickflash/licensing/src/ed25519';
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

export async function generateLicenseKeys(options: GenerateOptions): Promise<LicenseKeyData[]> {
  const keys: LicenseKeyData[] = [];

  for (let i = 0; i < options.count; i++) {
    const license = generateEd25519License({
      plan: options.plan,
      maxMasters: options.maxMasters,
      expiresDays: options.expiresDays,
      machineId: options.machineId
    }, PRIVATE_KEY_B64);
    
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
  options?: ValidateOptions
): Promise<{ valid: boolean; plan?: string; maxMasters?: number; expiresAt?: string; machineId?: string; error?: string }> {
  const result = verifyEd25519License(key, PUBLIC_KEY_B64, options);
  
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
