/**
 * Database encryption key management.
 *
 * On first run a random 256-bit key is generated, encrypted with the OS
 * keychain via Electron's safeStorage API, and written to
 * <userData>/master.key.enc.  On subsequent runs the file is read and
 * decrypted.  The plaintext key is kept only in memory (never logged) and
 * passed to the backend process as DB_ENCRYPTION_KEY.
 *
 * If safeStorage is unavailable (e.g. headless CI), the function returns
 * null and the database runs without encryption, emitting a warning.
 */

import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getLogger } from './logger';

const logger = getLogger('db-key');
const KEY_FILE = 'master.key.enc';

export async function getOrCreateDbKey(): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) {
    logger.warn('[DbKey] safeStorage unavailable — database will run unencrypted. ' +
      'This is expected in CI/test environments.');
    return null;
  }

  const keyFilePath = path.join(app.getPath('userData'), KEY_FILE);

  try {
    if (fs.existsSync(keyFilePath)) {
      // Load and decrypt existing key
      const encrypted = fs.readFileSync(keyFilePath);
      const decrypted = safeStorage.decryptString(encrypted);
      if (!/^[0-9a-fA-F]{64}$/.test(decrypted)) {
        throw new Error('Stored key has unexpected format — regenerating.');
      }
      logger.info('[DbKey] Loaded existing encryption key from userData.');
      return decrypted;
    }
  } catch (err) {
    logger.warn('[DbKey] Could not load existing key, generating new one.', err);
    // Fall through to generate a new key
  }

  // Generate a fresh 256-bit key
  const newKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  try {
    const encrypted = safeStorage.encryptString(newKey);
    fs.mkdirSync(path.dirname(keyFilePath), { recursive: true });
    fs.writeFileSync(keyFilePath, encrypted, { mode: 0o600 });
    logger.info('[DbKey] Generated and stored new encryption key.');
    return newKey;
  } catch (err) {
    logger.error('[DbKey] Failed to persist encryption key.', err);
    return null;
  }
}
