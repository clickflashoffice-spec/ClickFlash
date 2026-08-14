
import DatabaseManager from '../database/db';
import path from 'path';

import { logger } from "../utils/logger";

const dbPath = path.join(process.cwd(), 'pb_data', 'data.db');
const dbManager = new DatabaseManager(dbPath);
dbManager.connect();

const users = dbManager.query('SELECT * FROM users');
logger.info('Users in DB:', users);
dbManager.close();
