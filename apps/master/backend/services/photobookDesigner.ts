import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';

interface Photo {
  id: string;
  albumId: string;
  url: string;
  width: number;
  height: number;
  quality_flags?: string; // Assume JSON string of tags like 'blur', 'eyes_closed', 'good_lighting'
}

export class PhotobookDesigner {
  private dbManager: DatabaseManager;
  private logger: Logger;

  constructor(dbManager: DatabaseManager, logger: Logger) {
    this.dbManager = dbManager;
    this.logger = logger;
  }

  /**
   * Automatically curates the best photos in an album and generates a structured
   * JSON layout for a photobook.
   */
  public async designPhotobook(albumId: string): Promise<any> {
    const photos = this.dbManager.all<Photo>(
      `SELECT id, albumId, url, width, height, quality_flags FROM photos WHERE albumId = ?`,
      [albumId]
    );

    if (photos.length < 10) {
        this.logger.info(`[PhotobookDesigner] Album ${albumId} has fewer than 10 photos. Skipping photobook generation.`);
        return null;
    }

    this.logger.info(`[PhotobookDesigner] Curating ${photos.length} photos for photobook generation in album ${albumId}`);

    // Filter out photos with negative quality flags (e.g. blur, closed eyes)
    const validPhotos = photos.filter((p: any) => {
        if (!p.quality_flags) return true;
        try {
            const flags = JSON.parse(p.quality_flags);
            return !flags.includes('blur') && !flags.includes('eyes_closed');
        } catch {
            return true;
        }
    });

    // Select the best 20 photos for a 10-page spread
    const curatedPhotos = validPhotos.slice(0, Math.min(20, validPhotos.length));

    if (curatedPhotos.length < 5) {
        this.logger.info(`[PhotobookDesigner] Album ${albumId} does not have enough high-quality photos for a photobook.`);
        return null;
    }

    const pages = [];
    // Page 1: Cover
    pages.push({
        pageNumber: 1,
        layout: 'cover_full',
        images: [{ id: curatedPhotos[0].id, url: curatedPhotos[0].url }]
    });

    // Subsequence pages: split or full based on orientation
    for (let i = 1; i < curatedPhotos.length; i += 2) {
      const p1 = curatedPhotos[i];
      const p2 = curatedPhotos[i + 1];
      
      const isLandscapeP1 = p1.width > p1.height;
      const isLandscapeP2 = p2 ? p2.width > p2.height : false;

      const page: any = {
        pageNumber: pages.length + 1,
        layout: (isLandscapeP1 && !p2) ? 'landscape_full' : (isLandscapeP1 && isLandscapeP2 ? 'landscape_stacked' : 'split_grid'),
        images: [ { id: p1.id, url: p1.url } ]
      };

      if (p2) {
        page.images.push({ id: p2.id, url: p2.url });
      }
      
      pages.push(page);
    }

    const photobook = {
        albumId,
        theme: 'premium_minimalist',
        coverPhotoId: curatedPhotos[0].id,
        pages
    };

    this.logger.info(`[PhotobookDesigner] Successfully generated photobook layout for album ${albumId} with ${pages.length} pages`);
    return photobook;
  }
}
