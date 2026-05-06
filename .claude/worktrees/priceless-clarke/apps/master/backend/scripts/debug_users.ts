
import DatabaseManager from '../shared/db';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pb_data', 'data.db');
const dbManager = new DatabaseManager(dbPath);
dbManager.connect();

const users = dbManager.query('SELECT * FROM users');
console.log('Users in DB:', users);
dbManager.close();
