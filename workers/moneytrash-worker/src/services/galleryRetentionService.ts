import { logger } from "@clickflash/logger";
import type { Env } from "../index";

interface ExpiredAssetRow {
  id: string;
  r2_key: string;
  preview_key: string | null;
  thumbnail_key: string | null;
}

export async function purgeExpiredGalleries(env: Env): Promise<void> {
  const expired = await env.DB.prepare(
    `SELECT id FROM galleries
     WHERE status = 'active' AND expires_at IS NOT NULL
       AND expires_at <= datetime('now')
     ORDER BY expires_at ASC
     LIMIT 100`,
  ).all<{ id: string }>();

  for (const gallery of expired.results || []) {
    try {
      const assets = await env.DB.prepare(
        `SELECT id, r2_key, preview_key, thumbnail_key
         FROM assets WHERE gallery_id = ?`,
      ).bind(gallery.id).all<ExpiredAssetRow>();
      const keys = Array.from(new Set(
        (assets.results || [])
          .flatMap((asset) => [asset.r2_key, asset.preview_key, asset.thumbnail_key])
          .filter((key): key is string => Boolean(key)),
      ));
      for (let index = 0; index < keys.length; index += 1000) {
        await env.UPLOADS_BUCKET.delete(keys.slice(index, index + 1000));
      }

      await env.DB.batch([
        env.DB.prepare(
          `UPDATE assets SET status = 'expired' WHERE gallery_id = ?`,
        ).bind(gallery.id),
        env.DB.prepare(
          `UPDATE galleries SET status = 'expired', updated_at = datetime('now')
           WHERE id = ?`,
        ).bind(gallery.id),
      ]);
    } catch (error) {
      logger.error("Failed to purge expired MoneyTrash gallery", {
        args: [gallery.id, error],
      });
    }
  }
}
