import { redisCache } from "../services/redisCacheService";
import { DatabaseManager } from "../database/db";
import crypto from "crypto";
import { ALLOWED_COLUMNS } from "../config/constants";

export class AlbumRepo {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  public findById(id: string) {
    return this.dbManager.get(`SELECT * FROM albums WHERE id = ?`, [id]);
  }

  // Batch query to solve N+1 issues
  public findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(", ");
    return this.dbManager.all(`SELECT * FROM albums WHERE id IN (${placeholders})`, ids);
  }

  public findByPhotographerId(photographerId: string) {
    return this.dbManager.all(`SELECT * FROM albums WHERE photographerId = ?`, [photographerId]);
  }

  public findAll() {
    return this.dbManager.all(`SELECT * FROM albums ORDER BY created_at DESC`);
  }

  public create(data: Record<string, any>) {
    if (!data.id) data.id = crypto.randomUUID();
    const now = new Date().toISOString();
    data.created_at = now;
    data.updated_at = now;

    const allowedCols = ALLOWED_COLUMNS["albums"] || [];
    const rowData: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      if (allowedCols.includes(key)) {
        const val = data[key];
        if (val !== undefined) {
          if (typeof val === "boolean") {
            rowData[key] = val ? 1 : 0;
          } else if (typeof val === "object" && val !== null && !Buffer.isBuffer(val)) {
            rowData[key] = JSON.stringify(val);
          } else {
            rowData[key] = val;
          }
        }
      }
    });

    const keys = Object.keys(rowData);
    const cols = keys.join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map(k => rowData[k]);

    this.dbManager.run(
      `INSERT INTO albums (${cols}) VALUES (${placeholders})`,
      values
    );

    redisCache.publishEvent('album_created', { id: data.id, photographerId: data.photographerId, timestamp: now });

    return this.findById(data.id);
  }

  public update(id: string, data: Record<string, any>) {
    data.updated_at = new Date().toISOString();

    const allowedCols = ALLOWED_COLUMNS["albums"] || [];
    const rowData: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      if (allowedCols.includes(key) && key !== "id") {
        const val = data[key];
        if (val !== undefined) {
          if (typeof val === "boolean") {
            rowData[key] = val ? 1 : 0;
          } else if (typeof val === "object" && val !== null && !Buffer.isBuffer(val)) {
            rowData[key] = JSON.stringify(val);
          } else {
            rowData[key] = val;
          }
        }
      }
    });

    const updateKeys = Object.keys(rowData);
    if (updateKeys.length > 0) {
      const setClause = updateKeys.map(k => `${k} = ?`).join(", ");
      const values = updateKeys.map(k => rowData[k]);
      values.push(id);

      this.dbManager.run(`UPDATE albums SET ${setClause} WHERE id = ?`, values);
    }
    return this.findById(id);
  }

  public delete(id: string) {
    this.dbManager.run(`DELETE FROM albums WHERE id = ?`, [id]);
    return true;
  }
}
