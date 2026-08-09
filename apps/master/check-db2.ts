import { config } from 'dotenv';
config();
import Database from 'better-sqlite3-multiple-ciphers';

const db = new Database('./pb_data/master.db');
const key = process.env.DB_ENCRYPTION_KEY;
if (key) {
  db.pragma(`key = "x'${key}'"`);
}
const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table"').all();
console.log('Tables:', tables);
