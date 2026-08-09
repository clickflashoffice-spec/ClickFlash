import { config } from 'dotenv';
config();
import Database from 'better-sqlite3-multiple-ciphers';

const db = new Database('./pb_data/master.db');
const key = process.env.DB_ENCRYPTION_KEY;
if (key) {
  db.pragma(`key = "x'${key}'"`);
}
const users = db.prepare('SELECT id, email, role FROM users').all();
console.log('Users:', users);
