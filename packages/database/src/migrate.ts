// packages/database/src/migrate.ts
import { Database } from 'better-sqlite3-multiple-ciphers';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

interface Migration {
  id: string;
  up: string;
  down: string;
}

export function loadMigrations(): Migration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(file => {
    const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    const [up, down] = content.split('-- DOWN');
    return {
      id: file.replace('.sql', ''),
      up: up.replace('-- UP', '').trim(),
      down: down ? down.trim() : ''
    };
  });
}

export function migrate(db: Database, target?: string) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = new Set(
    db.prepare('SELECT id FROM __migrations').all().map((r: any) => r.id)
  );

  const migrations = loadMigrations();
  for (const m of migrations) {
    if (target && m.id > target) break;
    if (applied.has(m.id)) continue;
    db.exec(m.up);
    db.prepare('INSERT INTO __migrations (id) VALUES (?)').run(m.id);
    console.log('Applied migration:', m.id);
  }
}

export function rollback(db: Database, target: string) {
  const migrations = loadMigrations().reverse();
  for (const m of migrations) {
    if (m.id <= target) break;
    if (!m.down) continue;
    db.exec(m.down);
    db.prepare('DELETE FROM __migrations WHERE id = ?').run(m.id);
    console.log('Rolled back migration:', m.id);
  }
}
