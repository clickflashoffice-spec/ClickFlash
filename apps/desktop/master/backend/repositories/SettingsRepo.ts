import { DatabaseManager } from "../database/db";
import crypto from "crypto";

export class SettingsRepo {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  public findById(id: string) {
    return this.dbManager.get(`SELECT * FROM settings WHERE id = ?`, [id]);
  }

  public findByKey(key: string) {
    return this.dbManager.get(`SELECT * FROM settings WHERE key = ?`, [key]);
  }

  public findAll() {
    return this.dbManager.all(`SELECT * FROM settings`);
  }

  public upsert(key: string, value: string) {
    const existing = this.findByKey(key);
    const now = new Date().toISOString();

    if (existing) {
      this.dbManager.run(
        `UPDATE settings SET value = ?, updated_at = ? WHERE key = ?`,
        [value, now, key]
      );
      return this.findByKey(key);
    } else {
      const id = crypto.randomUUID();
      this.dbManager.run(
        `INSERT INTO settings (id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [id, key, value, now, now]
      );
      return this.findById(id);
    }
  }

  public delete(id: string) {
    this.dbManager.run(`DELETE FROM settings WHERE id = ?`, [id]);
    return true;
  }
}
