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

// Allowed numeric ranges for every ManualEdits field.
// Anything outside these bounds is clamped — never stored or sent to the worker
// with out-of-range values that could crash sharp or produce nonsense output.
const EDIT_RANGES: Partial<Record<keyof ManualEdits, [number, number]>> = {
    exposure:     [-100, 100],
    contrast:     [-100, 100],
    highlights:   [-100, 100],
    shadows:      [-100, 100],
    saturate:     [-100, 100],
    vibrance:     [-100, 100],
    grayscale:    [0, 100],
    sepia:        [0, 100],
    invert:       [0, 1],
    hueRotate:    [-180, 180],
    temperature:  [-100, 100],
    tint:         [-100, 100],
    whites:       [-100, 100],
    blacks:       [-100, 100],
    clarity:      [-100, 100],
    soften:       [0, 100],
    sharpen:      [0, 100],
    vignette:     [0, 100],
    dropShadow:   [0, 100],
    brightness:   [-100, 100],
    rotate:       [-360, 360],
    straighten:   [-45, 45],
    perspectiveX: [-50, 50],
    perspectiveY: [-50, 50],
    zoomLevel:    [0.1, 10],
};

/**
 * Validates and sanitizes ManualEdits object.
 * - Merges with INITIAL_EDITS to supply missing fields.
 * - Replaces NaN with the field default.
 * - Clamps every numeric field to its allowed range (see EDIT_RANGES).
 */
// Current schema version — increment whenever ManualEdits fields change.
const CURRENT_EDITS_VERSION = 1;

export function validateManualEdits(edits: Partial<ManualEdits>): ManualEdits {
    // Schema migration: upgrade from older versions as needed.
    // Version-less records are treated as v0 (pre-versioning).
    const incomingVersion = (edits as any)._v ?? 0;
    // Future migrations: if (incomingVersion < 2) { /* rename oldField → newField */ }
    void incomingVersion; // suppress unused-variable lint until migrations are needed

    const valid = { ...INITIAL_EDITS, ...edits };

    const keys = Object.keys(valid) as Array<keyof ManualEdits>;
    keys.forEach(key => {
        if (key === '_v') return; // skip the version field
        const val = (valid as any)[key];
        if (typeof val !== 'number') return;

        // Replace NaN with the default.
        const defaultVal = (INITIAL_EDITS as any)[key] ?? 0;
        const numeric = isNaN(val) ? defaultVal : val;

        // Clamp to allowed range if one is defined.
        const range = EDIT_RANGES[key];
        (valid as any)[key] = range
            ? Math.max(range[0], Math.min(range[1], numeric))
            : numeric;
    });

    // Stamp the current schema version.
    (valid as any)._v = CURRENT_EDITS_VERSION;

    return valid as ManualEdits;
}

export function getPhotoUrl(photo: PocketRecord | Photo, baseUrl?: string): string {
    const base = baseUrl || pb.baseUrlValue;
    // Handle Photo type
    const url = (photo.url as string) || '';

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
export function parseManualEdits(p: PocketRecord): ManualEdits | undefined {
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

function parseEditsField(fieldValue: any, photoId: string, fieldName: string): ManualEdits | undefined {
    let edits: ManualEdits | undefined = undefined;
    try {
        if (typeof fieldValue === 'string' && fieldValue) {
            const parsed = JSON.parse(fieldValue);
            edits = (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed as ManualEdits : undefined;
        } else if (fieldValue != null && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
            edits = fieldValue as ManualEdits;
        }
    } catch (parseError) {
        logger.warn(`Failed to parse ${fieldName} for photo`, { photoId, error: parseError });
    }
    return edits;
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
    const manualEdits = parseEditsField(r.manualEdits, id, 'manualEdits');
    const autoEdits = parseEditsField(r.autoEdits, id, 'autoEdits');

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
        autoEdits: autoEdits,
        autoEnhanced: r.autoEnhanced === 1 || r.autoEnhanced === true,
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

                // Optimistic locking: send the client's last-known updatedAt so the
                // backend can reject the write if another session already modified the record.
                if ((data as Partial<Photo>).updated_at) {
                    (photoData as any)._clientUpdatedAt = (data as Partial<Photo>).updated_at;
                }

                // Metadata cleaning
                if (photoData.metadata && typeof photoData.metadata === 'object') {
                    // Remove any non-serializable fields if they might exist
                }
            }

            const record = await pb.collection('photos').update(id, photoData as any);
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
                errorMessage.includes('Update conflict') ||
                errorMessage.includes('EDIT_CONFLICT');

            // Don't retry on conflict errors — surface them so the UI can warn the user.
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
     * P1-A2 Fix: Uses single batch endpoint instead of N sequential PATCH calls
     * 
     * @param {Partial<Photo>[]} photos - Array of photo objects to save
     * @returns {Promise<{items: Photo[], successCount: number, failureCount: number}>}
     */
    async batchSavePhotos(photos: Partial<Photo>[]): Promise<{ items: Photo[], successCount: number, failureCount: number }> {
        if (!Array.isArray(photos) || photos.length === 0) {
            throw new Error('Photos array is required and must not be empty');
        }

        // Validate and sanitize all manualEdits before sending.
        const items = photos
            .filter(p => !!p.id)
            .map(p => ({
                id: p.id as string,
                manualEdits: p.manualEdits ? validateManualEdits(p.manualEdits) : undefined,
                autoEdits: p.autoEdits ? validateManualEdits(p.autoEdits) : undefined,
                autoEnhanced: p.autoEnhanced,
            }));

        const skipped = photos.length - items.length;
        if (skipped > 0) {
            logger.warn(`batchSavePhotos: skipped ${skipped} photos without ID`);
        }

        if (items.length === 0) {
            return { items: [], successCount: 0, failureCount: skipped };
        }


        try {
            // Single PATCH /api/collections/photos/records/batch — one DB transaction.
            const response = await (pb as any).send('/api/collections/photos/records/batch', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });

            const successCount = (response as any).updatedCount ?? items.length;
            const batchErrors: string[] = (response as any).errors ?? [];
            // failedIds is populated by the backend for every item it skipped
            // (e.g. photo not found). Only IDs NOT in this set were actually persisted.
            const failedIdSet = new Set<string>((response as any).failedIds ?? []);

            if (batchErrors.length > 0) {
                logger.warn('batchSavePhotos: partial failures', { errors: batchErrors });
            }

            // Only return photos that were actually saved so AlbumEditor's markSaved
            // call only clears dirty-state for those photos (D1: partial-save fix).
            const resultItems: Photo[] = photos
                .filter(p => !!p.id && !failedIdSet.has(p.id as string))
                .map(p => p as Photo);

            return {
                items: resultItems,
                successCount,
                failureCount: skipped + batchErrors.length,
            };
        } catch (error) {
            logger.error('batchSavePhotos: batch endpoint failed, falling back to sequential', { error });

            // Fallback: sequential updates (original behaviour) so saves don't silently drop.
            const results: Photo[] = [];
            let successCount = 0;
            let failureCount = skipped;

            for (const photo of photos) {
                if (!photo.id) continue;
                try {
                    const result = await this.updatePhoto(photo.id, photo);
                    successCount++;
                    results.push(result);
                } catch (err) {
                    failureCount++;
                    logger.error('Failed to save photo in sequential fallback', { photoId: photo.id, error: err });
                }
            }

            return { items: results, successCount, failureCount };
        }
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
                logger.warn(`Failed to fetch blob for photo ${photoId}:`, error);
            }
        }

        return blobs;
    }
};
