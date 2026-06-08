import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export function seed(dbPath: string, environment: 'development' | 'test' = 'development') {
  const db = new Database(dbPath);
  const seedFile = join(__dirname, '../seeds', `${environment}.sql`);
  const sql = readFileSync(seedFile, 'utf-8');
  db.exec(sql);
  db.close();
  console.log(`Seeded ${environment} data`);
}
