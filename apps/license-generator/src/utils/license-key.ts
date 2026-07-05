const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, I, L to avoid confusion
const KEY_PREFIX = 'CF-LIVE-';

interface LicenseKeyData {
  key: string;
  plan: string;
  maxMasters: number;
  expiresAt: string;
  createdAt: string;
}

interface GenerateOptions {
  plan: 'trial' | 'starter' | 'pro' | 'enterprise';
  maxMasters: number;
  expiresDays: number;
  count: number;
}

function generateRandomSegment(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(array[i] % ALPHABET.length);
  }
  return result;
}

async function generateChecksum(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key + 'clickflash-secret-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .slice(0, 2)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

function generateKey(): string {
  const segments = [
    generateRandomSegment(4),
    generateRandomSegment(4),
    generateRandomSegment(4),
    generateRandomSegment(4)
  ];
  const key = KEY_PREFIX + segments.join('-');
  return key;
}

export async function generateLicenseKeys(options: GenerateOptions): Promise<LicenseKeyData[]> {
  const keys: LicenseKeyData[] = [];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + options.expiresDays);

  for (let i = 0; i < options.count; i++) {
    const key = generateKey();
    const checksum = await generateChecksum(key);
    keys.push({
      key: key + '-' + checksum,
      plan: options.plan,
      maxMasters: options.maxMasters,
      expiresAt: expiresAt.toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    });
  }

  return keys;
}

export async function validateLicenseKey(key: string): Promise<{ valid: boolean; plan?: string; maxMasters?: number; expiresAt?: string; error?: string }> {
  if (!key.startsWith(KEY_PREFIX)) {
    return { valid: false, error: 'Invalid key prefix' };
  }

  const parts = key.split('-');
  if (parts.length !== 7) { // CF-LIVE-XXXX-XXXX-XXXX-XXXX-YY (with checksum)
    return { valid: false, error: 'Invalid key format' };
  }

  // Check if key matches expected pattern
  const segments = parts.slice(2, 6); // Skip 'CF' and 'LIVE', take 4 segments
  if (segments.length !== 4 || segments.some(s => s.length !== 4)) {
    return { valid: false, error: 'Invalid segment length' };
  }

  // Check characters are valid
  for (const segment of segments) {
    for (const char of segment) {
      if (!ALPHABET.includes(char)) {
        return { valid: false, error: 'Invalid characters in key' };
      }
    }
  }

  // Verify checksum
  const keyWithoutChecksum = parts.slice(0, 6).join('-');
  const expectedChecksum = await generateChecksum(keyWithoutChecksum);
  const actualChecksum = parts[6];
  if (actualChecksum !== expectedChecksum) {
    return { valid: false, error: 'Invalid checksum - key may be tampered with' };
  }

  // In a real implementation, you'd check against a database
  // For now, we just validate the format and checksum
  return { 
    valid: true, 
    plan: 'pro', // Would be looked up from database
    maxMasters: 5,
    expiresAt: '2027-06-13'
  };
}
