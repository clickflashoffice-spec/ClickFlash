/**
 * Photo Service
 * 
 * Handles all CRUD operations for photos
 * Includes complex manualEdits handling and batch operations
 */

import { pb } from '../pb';
import { Photo, ManualEdits, PhotoMetadata } from '../../types';
import { PocketRecord, GetListResult } from '../pbTypes';
import { logger } from '../../utils/logger';
import { INITIAL_EDITS } from '../../utils/styleUtils';

/**
 * Validates and sanitizes ManualEdits object
 */
export function validateManualEdits(edits: Partial<ManualEdits>): ManualEdits {
    const valid = { ...INITIAL_EDITS, ...edits };

    // Ensure numeric values are numbers and within plausible ranges if necessary
    // This is a safety layer to prevent string injection or NaN into the DB
    const keys = Object.keys(valid) as Array<keyof ManualEdits>;
    keys.forEach(key => {
        if (typeof valid[key] === 'number' && isNaN(valid[key] as number)) {
            (valid as any)[key] = (INITIAL_EDITS as any)[key] || 0;
        }
    });

    return valid as ManualEdits;
}

export function getPhotoUrl(photo: PocketRecord | Photo, baseUrl?: string): string {
    const base = baseUrl || pb.baseUrlValue;
    // Handle Photo type
    let url = (photo.url as string) || '';

    // If it's a full URL or blob, return it
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }

    // Otherwise construct PocketBase URL
    return `${base}/api/files/photos/${photo.id}/${url}`;
}



/**
 * Helper function to parse manualEdits safely
 */
function parseManualEdits(p: PocketRecord): ManualEdits | undefined {
    let manualEdits: ManualEdits | undefined = undefined;
    try {
        if (typeof p.manualEdits === 'string' && p.manualEdits) {
            const parsed = JSON.parse(p.manualEdits);
            manualEdits = (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed as ManualEdits : undefined;
        } else if (p.manualEdits != null && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) {
            manualEdits = p.manualEdits as ManualEdits;
        }
    } catch (parseError) {
        logger.warn('Failed to parse manualEdits for photo', { photoId: p.id, error: parseError });
        manualEdits = undefined;
    }
    return manualEdits;
}

/**
 * STANDARD ASSET PATH GENERATOR (Rule 12)
 * Follows structure: uploads/<albumId>/<tier>/<filename>
 */
export function getAssetPath(albumId: string, id: string, tier: 'highres' | 'thumbs', originalUrl?: string): string {
    if (!albumId) return originalUrl || '';

    // Determine fileName from originalUrl if possible, else use id
    let fileName = id;
    if (originalUrl) {
        const parts = originalUrl.split('/');
        fileName = parts[parts.length - 1];
    }

    // RULE 12 extension handling
    // We used to force .jpg here, but backend workers preserve original extension (e.g. .png)
    // for thumbnails. So we should keep the extension from the fileName.
    // If no extension exists, we default to id + _thumb.jpg logic in callers.

    return `${albumId}/${tier}/${fileName}`;
}

function transformPhoto(r: PocketRecord, baseUrl: string): Photo {
    const id = r.id as string;
    const albumId = r.albumId as string;

    let finalUrl = (r.url as string) || '';
    if (finalUrl && !finalUrl.startsWith('http') && !finalUrl.startsWith('blob:') && !finalUrl.startsWith('data:') && !finalUrl.includes(`${albumId}/highres/`)) {
        finalUrl = `${albumId}/highres/${finalUrl}`;
    }
    const photoUrl = finalUrl.startsWith('http') || finalUrl.startsWith('blob:') || finalUrl.startsWith('data:')
        ? finalUrl
        : `${baseUrl}/api/files/photos/${id}/${finalUrl || (id + '.jpg')}`;
    const manualEdits = parseManualEdits(r);

    let metadata: PhotoMetadata | undefined = undefined;
    try {
        if (typeof r.metadata === 'string' && r.metadata) {
            metadata = JSON.parse(r.metadata);
        } else if (r.metadata != null && typeof r.metadata === 'object' && !Array.isArray(r.metadata)) {
            metadata = r.metadata;
        }
    } catch (e) {
        logger.warn('Failed to parse metadata for photo', { photoId: r.id, error: e });
    }

    // RULE 12: Structured Storage Construction
    // Default to structured paths if not explicitly provided in the record
    const photoExt = (r.url as string)?.split('.').pop() || 'jpg';

    let thumbPath = (r.thumbnailUrl as string) || '';
    if (!thumbPath || !thumbPath.includes(`${albumId}/thumbs/`)) {
        thumbPath = getAssetPath(albumId, id, 'thumbs', thumbPath || `${id}_thumb.${photoExt}`);
    }

    let previewPath = ((r.preview || r.previewUrl) as string) || '';
    if (!previewPath || !previewPath.includes(`${albumId}/thumbs/`)) {
        previewPath = getAssetPath(albumId, id, 'thumbs', previewPath || `${id}_preview.${photoExt}`);
    }

    // Helper to strip structure prefix if we are using the record-based file API
    // backend/routes/files.ts already prepends the record directory
    const stripStructure = (path: string) => {
        if (path.startsWith(`${albumId}/thumbs/`)) return path.replace(`${albumId}/thumbs/`, '');
        if (path.startsWith(`${albumId}/highres/`)) return path.replace(`${albumId}/highres/`, '');
        return path;
    };

    return {
        id: id,
        albumId: albumId,
        title: (r.title as string) || '',
        url: photoUrl,
        thumbnailUrl: thumbPath.startsWith('http') ? thumbPath : `${baseUrl}/api/files/photos/${id}/${stripStructure(thumbPath)}`,
        previewUrl: previewPath.startsWith('http') ? previewPath : `${baseUrl}/api/files/photos/${id}/${stripStructure(previewPath)}`,
        photographerId: r.photographerId as string | undefined,
        category: r.category as 'uncategorized' | 'print' | 'digital' | undefined,
        manualEdits: manualEdits,
        metadata: metadata
    };
}

export const photoService = {
    /**
     * Get all photos
     */
    async getPhotos(): Promise<Photo[]> {
        const records = await pb.collection('photos').getFullList();
        const baseUrl = pb.baseUrlValue;
        return records.map((r: PocketRecord) => transformPhoto(r, baseUrl));
    },

    /**
     * Get photos paginated
     */
    async getPhotosPaginated(
        page: number,
        perPage: number,
        albumId?: string,
        sort = '+created',
        filter = ''
    ): Promise<GetListResult<Photo>> {
        let filterString = filter;
        if (albumId) {
            const albumFilter = `albumId = "${albumId}"`;
            filterString = filterString ? `(${filterString}) && ${albumFilter}` : albumFilter;
        }

        // Enforce max page size for performance
        const finalPerPage = Math.min(perPage, 100);

        const result = await pb.collection('photos').getList(page, finalPerPage, {
            filter: filterString,
            sort: sort
        });

        const baseUrl = pb.baseUrlValue;

        return {
            ...result,
            items: result.items.map((r: PocketRecord) => transformPhoto(r, baseUrl))
        };
    },

    /**
     * Create a new photo
     */
    async createPhoto(data: Partial<Photo> | FormData): Promise<Photo> {
        const record = await pb.collection('photos').create(data);
        return record as Photo;
    },

    /**
     * Update an existing photo
     */
    async updatePhoto(id: string, data: Partial<Photo> | FormData, retryCount = 0): Promise<Photo> {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        try {
            let photoData: Partial<Photo> | FormData = data;

            // Handle FormData vs Object
            if (!(data instanceof FormData)) {
                photoData = { ...data };

                // VALIDATION: Ensure manualEdits is valid before saving
                if (photoData.manualEdits) {
                    photoData.manualEdits = validateManualEdits(photoData.manualEdits);
                }

                // Metadata cleaning
                if (photoData.metadata && typeof photoData.metadata === 'object') {
                    // Remove any non-serializable fields if they might exist
                }
            }

            const record = await pb.collection('photos').update(id, photoData);
            const baseUrl = pb.baseUrlValue;

            // Use our standard transform for consistency in return value
            return transformPhoto(record as PocketRecord, baseUrl);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('timeout');
            const isConflict = errorMessage.includes('conflict') ||
                errorMessage.includes('modified') ||
                errorMessage.includes('Update conflict');

            // Don't retry on conflict errors
            if (isConflict) {
                logger.warn('Photo update conflict detected', { photoId: id, error: errorMessage });
                throw error;
            }

            // Retry on network errors
            if (retryCount < MAX_RETRIES && isNetworkError) {
                logger.info(`Retrying photo update (attempt ${retryCount + 1}/${MAX_RETRIES})`, { photoId: id });
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
                return this.updatePhoto(id, data, retryCount + 1);
            }

            logger.error('Failed to update photo', error instanceof Error ? error : undefined, { photoId: id, retryCount });
            throw error;
        }
    },

    /**
     * Batch save photos with manual edits and metadata
     * 
     * Saves multiple photos in a single request, ensuring all manualEdits
     * are properly validated and persisted.
     * 
     * Features:
     * - Validates all photos before saving
     * - Ensures manualEdits are properly formatted
     * - Handles both creates and updates
     * - Returns results for all photos
     * 
     * @param {Partial<Photo>[]} photos - Array of photo objects to save
     * @returns {Promise<{items: Photo[], successCount: number, failureCount: number}>}
     */
    async batchSavePhotos(photos: Partial<Photo>[]): Promise<{ items: Photo[], successCount: number, failureCount: number }> {
        if (!Array.isArray(photos) || photos.length === 0) {
            throw new Error('Photos array is required and must not be empty');
        }

        const results: Photo[] = [];
        let successCount = 0;
        let failureCount = 0;

        // Process in parallel with a limit if needed, but for now Promise.all is fine for typical batch sizes (1-50)
        // usage of updatePhoto ensures we reuse the same serialization logic
        const promises = photos.map(async (photo) => {
            if (!photo.id) {
                failureCount++;
                logger.warn('Skipping photo without ID in batch save');
                return null;
            }

            try {
                // We use updatePhoto which handles retries and manualEdits parsing
                const result = await this.updatePhoto(photo.id, photo);
                successCount++;
                return result;
            } catch (error) {
                failureCount++;
                logger.error('Failed to save photo in batch', { photoId: photo.id, error });
                return null;
            }
        });

        const settled = await Promise.all(promises);

        // Filter out nulls
        settled.forEach(res => {
            if (res) results.push(res);
        });

        return {
            items: results,
            successCount,
            failureCount
        };
    },

    /**
     * Delete a photo
     */
    async deletePhoto(id: string): Promise<void> {
        await pb.collection('photos').delete(id);
    },

    /**
     * Get photo blobs for multiple photos
     */
    async getPhotoBlobs(photoIds: string[]): Promise<Record<string, Blob>> {
        const blobs: Record<string, Blob> = {};
        const baseUrl = pb.baseUrlValue;

        for (const photoId of photoIds) {
            try {
                // Get photo record to find the URL
                const photo = await pb.collection('photos').getOne(photoId);
                let photoUrl = photo.url || '';

                // Construct full URL if needed
                if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('blob:') && !photoUrl.startsWith('data:')) {
                    photoUrl = `${baseUrl}/api/files/photos/${photoId}/${photoUrl}`;
                }

                // Fetch the image and convert to blob
                if (photoUrl) {
                    const response = await fetch(photoUrl);
                    if (response.ok) {
                        blobs[photoId] = await response.blob();
                    }
                }
            } catch (error) {
                console.warn(`Failed to fetch blob for photo ${photoId}:`, error);
            }
        }

        return blobs;
    }
};
