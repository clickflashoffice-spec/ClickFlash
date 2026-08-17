import { logger } from './utils/logger';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Database from 'better-sqlite3';
import path from 'path';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

export function debugKiosks(dbDir: string = _dirname) {
  const dbPath = path.join(dbDir, 'data', 'photography-os.db');
  let db: Database.Database;
  
  try {
    db = new Database(dbPath, { verbose: (msg: any) => logger.info(msg) });
  } catch (err) {
    logger.error("DB Initialization Error", err);
    return false;
  }

  try {
    const rows = db.prepare("SELECT id, name, status, ordersFolderPath FROM kiosks").all();
    logger.info(JSON.stringify(rows, null, 2));
    return true;
  } catch (err) {
    logger.error("DB Error", err);
    return false;
  } finally {
    if (db) {
      db.close();
    }
  }
}

if (require.main === module || process.argv[1] === fileURLToPath(import.meta.url)) {
    debugKiosks();
}
