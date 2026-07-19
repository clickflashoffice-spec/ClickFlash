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
          let filePath = '';
          if (photo.url) {
            const basename = path.basename(photo.url);
            if (photo.autoEnhanced) {
              const ext = path.extname(basename);
              const editedBasename = basename.replace(ext, '_highres_edited.jpg');
              filePath = path.join(UPLOAD_DIR, photo.albumId || 'unassigned', 'thumbs', editedBasename);
            } else {
              filePath = path.join(UPLOAD_DIR, photo.albumId || 'unassigned', 'highres', basename);
            }
          }
          let fileStream: fs.ReadStream | null = null;
          let fileExists = false;

          // Check if file exists physically
          if (photo.url && fs.existsSync(filePath)) {
            fileExists = true;
            fileStream = fs.createReadStream(filePath);
          } else if (photo.url) {
            // Fallbacks
            const fallbackPath = path.join(UPLOAD_DIR, photo.albumId || 'unassigned', photo.url.replace('/uploads/', ''));
            const flatFallbackPath = path.join(UPLOAD_DIR, photo.url.replace('/uploads/', ''));
            
            if (fs.existsSync(fallbackPath)) {
                fileExists = true;
                fileStream = fs.createReadStream(fallbackPath);
            } else if (fs.existsSync(flatFallbackPath)) {
                fileExists = true;
                fileStream = fs.createReadStream(flatFallbackPath);
            }
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
            manualEdits: photo.manualEdits,
            autoEnhanced: photo.autoEnhanced,
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

        // Apply dynamic bandwidth shaping delay if configured
        if (context.bandwidthThrottle?.isThrottled && context.bandwidthThrottle.delayBetweenChunksMs > 0) {
          await new Promise(resolve => setTimeout(resolve, context.bandwidthThrottle!.delayBetweenChunksMs));
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
