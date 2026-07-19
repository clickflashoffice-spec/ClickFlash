import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createLogger } from '@clickflash/logger';

const logger = createLogger({ serviceName: 'database-seeder' });

export function seed(dbPath: string, environment: 'development' | 'test' = 'development') {
  const db = new Database(dbPath);
  const seedFile = join(__dirname, '../seeds', `${environment}.sql`);
  const sql = readFileSync(seedFile, 'utf-8');
  db.exec(sql);
  db.close();
  logger.info(`Seeded ${environment} data`);
}
