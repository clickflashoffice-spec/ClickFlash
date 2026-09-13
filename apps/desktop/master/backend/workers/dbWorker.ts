import { parentPort } from 'worker_threads';
import { DatabaseManager } from '../database/db.ts';

const dbManager = new DatabaseManager();
dbManager.connect();
const db = dbManager.getDb();

parentPort?.on('message', (msg) => {
  try {
    if (!db) throw new Error('Database not connected in worker');
    const { taskId, table, id, data } = msg;
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }
    const columns = Object.keys(data);
    for (const col of columns) {
      if (!/^[a-zA-Z0-9_]+$/.test(col)) {
        throw new Error(`Invalid column name: ${col}`);
      }
    }
    const values = Object.values(data);
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    
    db.prepare(sql).run(...values, id);
    parentPort?.postMessage({ taskId, success: true });
  } catch (error: any) {
    parentPort?.postMessage({ taskId: msg.taskId, success: false, error: error.message });
  }
});
