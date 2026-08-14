
import JSZip from 'jszip';
import { photoService, getPhotoUrl } from './api/photoService';
import { logger } from '../utils/logger';

function pLimit(concurrency: number) {
  const queue: Array<() => void> = [];
  let active = 0;
  const next = () => {
    active--;
    if (queue.length > 0) queue.shift()!();
  };
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn().then(resolve, reject).finally(next);
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
}

export interface DownloadProgress {
    total: number;
    processed: number;
    status: 'preparing' | 'downloading' | 'zipping' | 'complete' | 'failed';
    currentFile?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

class BatchDownloadService {
    /**
     * Download a selection of photos as a ZIP file
     * Uses parallel fetching with concurrency limit
     */
    async downloadSelection(
        photoIds: string[],
        albumTitle: string = 'export',
        onProgress: ProgressCallback
    ): Promise<void> {
        try {
            const total = photoIds.length;
            let processed = 0;
            const zip = new JSZip();

            // Limit concurrency to 5 to avoid browser network limits
            const limit = pLimit(5);

            onProgress({ total, processed: 0, status: 'preparing' });

            // Fetch photo metadata first to get URLs
            // In a real app, we might already have this, but let's fetch specific details if needed
            // For now, assuming we use photoService to get details individually or we have them.
            // A better optimization: get all photos in one go or use passed objects.
            // Since we only have IDs here, we might need to fetch them or assume we can construct URLs.
            // Let's assume we need to fetch binary data from the URL.

            // We'll fetch the photo object to get the latest URL/filename
            const tasks = photoIds.map((id) => limit(async () => {
                try {
                    const photo = await (photoService as any).getPhoto(id);
                    if (!photo || !photo.url) {
                        throw new Error(`Photo ${id} not found or missing URL`);
                    }

                    onProgress({
                        total,
                        processed,
                        status: 'downloading',
                        currentFile: photo.originalFilename || `photo-${id}.jpg`
                    });

                    // Fetch the binary content
                    const response = await fetch(getPhotoUrl(photo));
                    if (!response.ok) throw new Error(`Failed to fetch ${photo.url}`);
                    const blob = await response.blob();

                    // Add to zip
                    const filename = photo.originalFilename || `photo-${id}.jpg`;
                    zip.file(filename, blob);

                    processed++;
                    onProgress({ total, processed, status: 'downloading' });

                } catch (err) {
                    logger.error(`Failed to download photo ${id}`, err instanceof Error ? err : undefined);
                    // We continue even if one fails, but log it
                    // Optionally add a text file to zip with errors
                    zip.file(`error-${id}.txt`, `Failed to download: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    processed++;
                    onProgress({ total, processed, status: 'downloading' });
                }
            }));

            await Promise.all(tasks);

            // Generate Zip
            onProgress({ total, processed, status: 'zipping' });

            const content = await zip.generateAsync({ type: 'blob' });

            // Trigger Download
            const url = window.URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${albumTitle}-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            onProgress({ total, processed, status: 'complete' });

        } catch (error) {
            logger.error('Batch download failed', error instanceof Error ? error : undefined);
            onProgress({ total: 0, processed: 0, status: 'failed' });
            throw error;
        }
    }
}

export const batchDownloadService = new BatchDownloadService();
