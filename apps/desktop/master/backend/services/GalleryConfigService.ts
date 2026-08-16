import DatabaseManager from '../database/db';
import { GalleryConfig, GalleryTheme } from '@clickflash/types';

export class GalleryConfigService {
  private db: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.db = dbManager;
    this.init();
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS destination_settings (
        destinationId TEXT PRIMARY KEY,
        galleryConfig TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public getConfig(destinationId: string): GalleryConfig | null {
    const row = this.db.get(
      "SELECT galleryConfig FROM destination_settings WHERE destinationId = ?",
      [destinationId]
    );
    if (row && row.galleryConfig) {
      try {
        return JSON.parse(row.galleryConfig) as GalleryConfig;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  public updateConfig(destinationId: string, config: GalleryConfig): void {
    const configStr = JSON.stringify(config);
    this.db.run(`
      INSERT INTO destination_settings (destinationId, galleryConfig, updatedAt)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(destinationId) DO UPDATE SET
        galleryConfig = excluded.galleryConfig,
        updatedAt = CURRENT_TIMESTAMP
    `, [destinationId, configStr]);
  }
}
