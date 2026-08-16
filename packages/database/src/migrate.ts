// packages/database/src/migrate.ts
import { Database } from 'better-sqlite3-multiple-ciphers';
import { AppError, ErrorCode } from '@clickflash/errors';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { createLogger } from '@clickflash/logger';

const logger = createLogger({ serviceName: 'database-migrator' });

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

interface Migration {
  id: string;
  up: string;
  down: string;
  checksum: string;
}

export function loadMigrations(): Migration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(file => {
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    const [up, down] = content.split('-- DOWN');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    return {
      id: file.replace('.sql', ''),
      up: up.replace('-- UP', '').trim(),
      down: down ? down.trim() : '',
      checksum: hash
    };
  });
}

export interface MigrateOptions {
  target?: string;
  dryRun?: boolean;
}

export function migrate(db: Database, options: MigrateOptions = {}) {
  const { target, dryRun } = options;

  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add checksum column if missing (for backwards compatibility)
  try {
    const cols = db.prepare("PRAGMA table_info(__migrations)").all() as { name: string }[];
    if (!cols.some(c => c.name === 'checksum')) {
      db.exec("ALTER TABLE __migrations ADD COLUMN checksum TEXT;");
      logger.info('Added checksum column to __migrations table.');
    }
  } catch (err) {
    logger.warn('Failed to verify/alter __migrations schema', { error: err });
  }

  const appliedRows = db.prepare('SELECT id, checksum FROM __migrations').all() as { id: string, checksum: string | null }[];
  const applied = new Map(appliedRows.map(r => [r.id, r.checksum]));

  const migrations = loadMigrations();
  const pending: Migration[] = [];

  for (const m of migrations) {
    if (target && m.id > target) break;
    
    if (applied.has(m.id)) {
      const existingChecksum = applied.get(m.id);
      // If we added the column retroactively, we might not have a checksum for old migrations.
      if (existingChecksum && existingChecksum !== m.checksum) {
        throw new AppError(`Migration checksum mismatch for ${m.id}. The migration file was modified after it was applied.`, ErrorCode.DATABASE_ERROR);
      }
      continue;
    }
    
    pending.push(m);
  }

  if (dryRun) {
    logger.info(`Dry run: ${pending.length} migrations would be applied`);
    for (const m of pending) {
      logger.info(`Dry run - Would apply: ${m.id}`);
    }
    return pending;
  }

  for (const m of pending) {
    db.exec(m.up);
    db.prepare('INSERT INTO __migrations (id, checksum) VALUES (?, ?)').run(m.id, m.checksum);
    logger.info(`Applied migration: ${m.id}`);
  }
  
  return pending;
}

export function rollback(db: Database, target: string) {
  const migrations = loadMigrations().reverse();
  for (const m of migrations) {
    if (m.id <= target) break;
    if (!m.down) continue;
    db.exec(m.down);
    db.prepare('DELETE FROM __migrations WHERE id = ?').run(m.id);
    logger.info(`Rolled back migration: ${m.id}`);
  }
}
