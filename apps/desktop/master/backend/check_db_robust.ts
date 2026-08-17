import { Logger, logger } from './utils/logger';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

export function checkDbRobustness(): boolean {
  const dbCandidatePaths = [
    path.join(_dirname, '../db/local.db'),
    path.join(_dirname, 'local.db'),
    path.join(_dirname, '../shared/local.db'),
    path.join(_dirname, '../../db/local.db')
  ];

  let dbPath: string | null = null;
  for (const p of dbCandidatePaths) {
    if (fs.existsSync(p)) {
      dbPath = p;
      break;
    }
  }

  if (!dbPath) {
    logger.error('Could not find local.db');
    return false;
  }

  logger.info('Using DB:', dbPath);
  const db = new Database(dbPath);
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  logger.info('Tables:', tables.map(t => t.name));

  if (tables.some(t => t.name === 'orders')) {
    const cols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
    logger.info('Orders Columns:', cols.map(c => c.name));
  }

  if (tables.some(t => t.name === 'prospects')) {
    const cols = db.prepare("PRAGMA table_info(prospects)").all() as { name: string }[];
    logger.info('Prospects Columns:', cols.map(c => c.name));
  }
  
  return true;
}

if (require.main === module || process.argv[1] === fileURLToPath(import.meta.url)) {
    if (!checkDbRobustness()) {
        process.exit(1);
    }
}
