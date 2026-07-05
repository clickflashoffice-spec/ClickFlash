import { SyncPipeline, SyncContext, PipelineResult } from '../SyncPipeline';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { UPLOAD_DIR } from '../../../config/constants';

const fetchFn = (globalThis as any).fetch;

export class PhotosPipeline implements SyncPipeline {
  name = 'photos_to_cloud';

  async execute(context: SyncContext): Promise<PipelineResult> {
    try {
      const pendingPhotos = context.dbManager.query<any>(`
        SELECT *
        FROM photos
        WHERE sync_status = 'pending' OR sync_status = 'failed'
        LIMIT 5
      `);

      if (pendingPhotos.length === 0) return { name: this.name, success: true };

      context.logger.info(
        `[CloudSync] Syncing ${pendingPhotos.length} photos to Cloud...`,
      );

      let successCount = 0;

      for (const photo of pendingPhotos) {
        try {
          const filePath = path.join(UPLOAD_DIR, photo.albumId || 'unassigned', photo.url || '');
          let fileStream: fs.ReadStream | null = null;
          let fileExists = false;

          // Check if file exists physically
          if (photo.url && fs.existsSync(filePath)) {
            fileExists = true;
            fileStream = fs.createReadStream(filePath);
          } else if (photo.url && fs.existsSync(path.join(UPLOAD_DIR, photo.url))) {
            // Fallback for flat directory structure
            fileExists = true;
            fileStream = fs.createReadStream(path.join(UPLOAD_DIR, photo.url));
          }

          const formData = new FormData();
          formData.append('desk_id', context.deskId);
          formData.append('photo', JSON.stringify({
            id: photo.id,
            albumId: photo.albumId,
            photographerId: photo.photographerId,
            url: photo.url,
            originalName: photo.originalName,
            size: photo.size,
            mimeType: photo.mimeType,
            created_at: photo.created_at,
          }));

          if (fileExists && fileStream) {
            formData.append('file', fileStream);
          }

          const res = await fetchFn(
            `${context.cloudApiUrl}/api/cloud/sync/photo`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${context.token}`,
                ...formData.getHeaders(),
              },
              body: formData as any,
            },
          );

          if (res.ok) {
            context.dbManager.run(
              `UPDATE photos SET 
                 sync_status = 'synced', 
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [photo.id],
            );
            
            successCount++;
          } else {
            const errorText = await res.text();
            context.logger.warn(`[CloudSync] Failed to sync photo ${photo.id}: HTTP ${res.status} ${errorText}`);
            
            // Mark as failed so it can be retried or ignored later
            context.dbManager.run(
              `UPDATE photos SET sync_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [photo.id]
            );
          }
        } catch (err) {
          context.logger.error(`[CloudSync] Error syncing photo ${photo.id}:`, err instanceof Error ? err : new Error(String(err)));
          context.dbManager.run(
            `UPDATE photos SET sync_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [photo.id]
          );
        }
      }

      return {
        name: this.name,
        success: successCount === pendingPhotos.length,
      };
    } catch (error) {
      context.logger.error(`[CloudSync] Error in ${this.name}:`, error instanceof Error ? error : new Error(String(error)));
      return {
        name: this.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
