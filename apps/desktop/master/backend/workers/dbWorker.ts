import { parentPort } from 'worker_threads';
import { DatabaseManager } from '../database/db';

const dbManager = new DatabaseManager();
dbManager.connect();
const db = dbManager.getDb();

parentPort?.on('message', (msg) => {
  try {
    if (!db) throw new Error('Database not connected in worker');
    const { taskId, table, id, data } = msg;
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col) => ` = ?`).join(', ');
    const sql = `UPDATE  SET  WHERE id = ?`;
    
    db.prepare(sql).run(...values, id);
    parentPort?.postMessage({ taskId, success: true });
  } catch (error: any) {
    parentPort?.postMessage({ taskId: msg.taskId, success: false, error: error.message });
  }
});
