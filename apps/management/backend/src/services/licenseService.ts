import { logger } from '../utils/logger';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_PREFIX = 'CF-LIVE-';
const SECRET_SALT = 'clickflash-secret-salt-2026';

export interface LicenseKeyData {
  key: string;
  deskId: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  maxMasters: number;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
}

export interface GenerateOptions {
  deskId: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  maxMasters: number;
  expiresDays?: number;
  count?: number;
}

export interface LicenseValidationResult {
  valid: boolean;
  plan?: string;
  maxMasters?: number;
  expiresAt?: string;
  error?: string;
}

export class LicenseService {
  private db?: any;

  constructor(db?: any) {
    this.db = db;
  }

  private generateRandomSegment(length: number): string {
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    let result = '';
    for (let i = 0; i < length; i++) {
      result += ALPHABET.charAt(array[i] % ALPHABET.length);
    }
    return result;
  }

  private async generateChecksum(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key + SECRET_SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .slice(0, 2)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
  }

  private async createKeyString(): Promise<string> {
    const segments = [
      this.generateRandomSegment(4),
      this.generateRandomSegment(4),
      this.generateRandomSegment(4),
      this.generateRandomSegment(4)
    ];
    const keyWithoutChecksum = KEY_PREFIX + segments.join('-');
    const checksum = await this.generateChecksum(keyWithoutChecksum);
    return `${keyWithoutChecksum}-${checksum}`;
  }

  async generateLicenseKeys(options: GenerateOptions): Promise<LicenseKeyData[]> {
    const count = options.count || 1;
    const keys: LicenseKeyData[] = [];
    let expiresAtStr: string | undefined;

    if (options.expiresDays && options.expiresDays > 0) {
      const date = new Date();
      date.setDate(date.getDate() + options.expiresDays);
      expiresAtStr = date.toISOString();
    }

    const nowStr = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const fullKey = await this.createKeyString();
      const keyData: LicenseKeyData = {
        key: fullKey,
        deskId: options.deskId,
        plan: options.plan,
        maxMasters: options.maxMasters,
        expiresAt: expiresAtStr,
        status: 'active',
        createdAt: nowStr
      };

      if (this.db) {
        try {
          if (typeof this.db.prepare === 'function') {
            // D1 binding
            await this.db.prepare(
              `INSERT INTO licenses (key, desk_id, plan, max_masters, status, expires_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              keyData.key,
              keyData.deskId,
              keyData.plan,
              keyData.maxMasters,
              keyData.status,
              keyData.expiresAt || null,
              keyData.createdAt,
              keyData.createdAt
            ).run();
          } else if (typeof this.db.run === 'function') {
            // DatabaseManager wrapper
            await this.db.run(
              `INSERT INTO licenses (key, desk_id, plan, max_masters, status, expires_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                keyData.key,
                keyData.deskId,
                keyData.plan,
                keyData.maxMasters,
                keyData.status,
                keyData.expiresAt || null,
                keyData.createdAt,
                keyData.createdAt
              ]
            );
          }
        } catch (err: any) {
          logger.error(`Failed to store generated license key: ${err.message}`);
          throw err;
        }
      }

      keys.push(keyData);
    }

    logger.info(`Generated ${keys.length} license key(s) for desk ${options.deskId} (${options.plan})`);
    return keys;
  }

  async validateLicenseKey(key: string, deskId?: string): Promise<LicenseValidationResult> {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'License key is required' };
    }

    if (!key.startsWith(KEY_PREFIX)) {
      return { valid: false, error: 'Invalid key prefix' };
    }

    const parts = key.split('-');
    if (parts.length !== 7) {
      return { valid: false, error: 'Invalid key format' };
    }

    const segments = parts.slice(2, 6);
    if (segments.length !== 4 || segments.some(s => s.length !== 4)) {
      return { valid: false, error: 'Invalid segment length' };
    }

    for (const segment of segments) {
      for (const char of segment) {
        if (!ALPHABET.includes(char)) {
          return { valid: false, error: 'Invalid characters in key' };
        }
      }
    }

    const keyWithoutChecksum = parts.slice(0, 6).join('-');
    const expectedChecksum = await this.generateChecksum(keyWithoutChecksum);
    const actualChecksum = parts[6];

    if (actualChecksum !== expectedChecksum) {
      return { valid: false, error: 'Invalid checksum - key may be tampered with' };
    }

    // If we have database connection, check database records
    if (this.db) {
      try {
        let record: any = null;
        if (typeof this.db.prepare === 'function') {
          record = await this.db.prepare('SELECT * FROM licenses WHERE key = ? LIMIT 1').bind(key).first();
        } else if (typeof this.db.get === 'function') {
          record = await this.db.get('SELECT * FROM licenses WHERE key = ? LIMIT 1', [key]);
        }

        if (!record) {
          return { valid: false, error: 'License key not registered' };
        }

        if (record.status !== 'active') {
          return { valid: false, error: `License key is ${record.status}` };
        }

        if (record.expires_at) {
          const expirationDate = new Date(record.expires_at).getTime();
          if (!isNaN(expirationDate) && expirationDate < Date.now()) {
            return { valid: false, error: 'License key has expired' };
          }
        }

        if (deskId && record.desk_id && record.desk_id !== deskId && record.desk_id !== 'UNASSIGNED') {
          return { valid: false, error: 'License key assigned to another desk' };
        }

        return {
          valid: true,
          plan: record.plan,
          maxMasters: record.max_masters || 1,
          expiresAt: record.expires_at || undefined
        };
      } catch (err: any) {
        logger.error(`Database error during license verification: ${err.message}`);
        return { valid: false, error: 'Database verification failed' };
      }
    }

    // Standalone / offline validation (format and checksum passed)
    return {
      valid: true,
      plan: 'pro',
      maxMasters: 5
    };
  }
}
