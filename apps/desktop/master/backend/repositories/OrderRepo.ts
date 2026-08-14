import { DatabaseManager } from "../database/db";
import crypto from "crypto";
import { ALLOWED_COLUMNS } from "../config/constants";

export class OrderRepo {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  public findById(id: string) {
    return this.dbManager.get(`SELECT * FROM orders WHERE id = ?`, [id]);
  }

  public findAll() {
    return this.dbManager.all(`SELECT * FROM orders ORDER BY created_at DESC`);
  }

  public findByStatus(status: string) {
    return this.dbManager.all(`SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC`, [status]);
  }

  public findByAlbumId(albumId: string) {
    return this.dbManager.all(`SELECT * FROM orders WHERE albumId = ? ORDER BY created_at DESC`, [albumId]);
  }

  public findByPhotographerId(photographerId: string) {
    return this.dbManager.all(`SELECT * FROM orders WHERE photographerId = ? ORDER BY created_at DESC`, [photographerId]);
  }

  public create(data: Record<string, any>) {
    if (!data.id) data.id = crypto.randomUUID();
    const now = new Date().toISOString();
    data.created_at = now;
    data.updated_at = now;

    const allowedCols = ALLOWED_COLUMNS["orders"] || [];
    const rowData: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      if (allowedCols.includes(key)) rowData[key] = data[key];
    });

    const keys = Object.keys(rowData);
    const cols = keys.join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map(k => rowData[k]);

    this.dbManager.run(
      `INSERT INTO orders (${cols}) VALUES (${placeholders})`,
      values
    );

    return this.findById(data.id);
  }

  public update(id: string, data: Record<string, any>) {
    data.updated_at = new Date().toISOString();

    const allowedCols = ALLOWED_COLUMNS["orders"] || [];
    const rowData: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      if (allowedCols.includes(key) && key !== "id") rowData[key] = data[key];
    });

    const updateKeys = Object.keys(rowData);
    if (updateKeys.length > 0) {
      const setClause = updateKeys.map(k => `${k} = ?`).join(", ");
      const values = updateKeys.map(k => rowData[k]);
      values.push(id);

      this.dbManager.run(`UPDATE orders SET ${setClause} WHERE id = ?`, values);
    }
    return this.findById(id);
  }

  public delete(id: string) {
    this.dbManager.run(`DELETE FROM orders WHERE id = ?`, [id]);
    return true;
  }
}
