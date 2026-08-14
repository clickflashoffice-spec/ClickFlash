import { pb } from './core';
import { Album, Photo, AlbumStatus } from '../../types';
import { PocketRecord } from '../../services/pbTypes';
import { logger } from '../../utils/logger';

export function resolvePhotoUrl(record: any, baseUrl: string, manualEdits: any): string {
    let photoUrl = record.url || '';
    if (!photoUrl) return '';
    if (photoUrl.startsWith('http') || photoUrl.startsWith('blob:') || photoUrl.startsWith('data:')) {
        return photoUrl;
    }

    let hasEdits = false;
    if (record.autoEnhanced === true || record.autoEnhanced === 1 || record.autoEnhanced === 'true') {
        hasEdits = true;
    } else if (record.autoEdits && typeof record.autoEdits === 'string' && record.autoEdits !== '{}') {
        hasEdits = true;
    } else if (record.autoEdits && typeof record.autoEdits === 'object' && Object.keys(record.autoEdits).length > 0) {
        hasEdits = true;
    } else if (manualEdits && typeof manualEdits === 'object' && Object.keys(manualEdits).length > 0) {
        hasEdits = true;
    }

    if (hasEdits) {
        return `${baseUrl}/api/files/photos/${record.id}/${record.id}_preview_edited.jpg`;
    }

    return `${baseUrl}/api/files/photos/${record.id}/${photoUrl}`;
}

export function getHighResPhotoUrl(record: any, baseUrl: string, manualEdits?: any): string {
    const url = resolvePhotoUrl(record, baseUrl, manualEdits);
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}variant=highres`;
}

export const photoService = {
    resolvePhotoUrl,
    getHighResPhotoUrl,
    // --- Albums ---
    async getAlbums(): Promise<Album[]> {
        try {
            const records = await pb.collection('albums').getFullList({ sort: '-created' });

            if (!Array.isArray(records)) {
                logger.warn('getAlbums: records is not an array', records);
                return [];
            }

            if (records == null) {
                logger.warn('getAlbums: records is null or undefined');
                return [];
            }

            const albumsWithPhotos = await Promise.all(records
                .filter((r: PocketRecord) => r != null && typeof r === 'object' && r.id != null)
                .map(async (r: PocketRecord) => {
                    let photos: Photo[] = [];
                    let coverPhotoUrl = r.coverPhotoUrl || '';

                    try {
                        const photosList = await pb.collection('photos').getFullList({ filter: `albumId="${r.id}"` });

                        if (Array.isArray(photosList)) {
                            photos = photosList
                                .filter((p: PocketRecord) => p != null && typeof p === 'object' && p.id != null)
                                .map((p: PocketRecord) => {
                                    let manualEdits: any = {};
                                    try {
                                        if (typeof p.manualEdits === 'string' && p.manualEdits) {
                                            const parsed = JSON.parse(p.manualEdits);
                                            manualEdits = (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
                                        } else if (p.manualEdits != null && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) {
                                            manualEdits = p.manualEdits;
                                        }
                                    } catch (parseError) {
                                        logger.warn('Failed to parse manualEdits for photo', { photoId: p.id, parseError });
                                        manualEdits = {};
                                    }
                                    
                                    const photoUrl = resolvePhotoUrl(p, pb.baseUrlValue, manualEdits);

                                    return {
                                        id: p.id,
                                        albumId: (p.albumId as string) || '',
                                        title: (p.title as string) || '',
                                        url: photoUrl,
                                        photographerId: p.photographerId as number,
                                        category: (p.category as string) || undefined,
                                        manualEdits: manualEdits
                                    };
                                });
                        }

                        if (!coverPhotoUrl && photos.length > 0 && photos[0]?.url) {
                            coverPhotoUrl = photos[0].url;
                        }
                    } catch (photoError) {
                        logger.warn('Failed to fetch photos for album', { albumId: r.id, photoError });
                    }

                    let categories: any[] = [];
                    try {
                        if (typeof r.categories === 'string' && r.categories) {
                            const parsed = JSON.parse(r.categories);
                            categories = Array.isArray(parsed) ? parsed : [];
                        } else if (Array.isArray(r.categories)) {
                            categories = r.categories;
                        }
                    } catch (parseError) {
                        logger.warn('Failed to parse categories for album', { albumId: r.id, parseError });
                        categories = [];
                    }

                    return {
                        id: r.id || '',
                        title: (r.title as string) || '',
                        date: (r.date as string) || '',
                        photographerId: r.photographerId != null ? (r.photographerId as number) : 0,
                        coverPhotoUrl: (coverPhotoUrl as string),
                        source: (r.source as string) || '',
                        roomNumber: (r.roomNumber as string) || '',
                        status: (r.status as AlbumStatus) || undefined,
                        categories: categories,
                        photos: photos
                    };
                }));

            if (!Array.isArray(albumsWithPhotos)) {
                logger.warn('getAlbums: albumsWithPhotos is not an array', albumsWithPhotos);
                return [];
            }

            return albumsWithPhotos;
        } catch (error) {
            logger.error('getAlbums: Error fetching albums', error instanceof Error ? error : undefined);
            return [];
        }
    },

    async getAlbum(id: string): Promise<Album | null> {
        try {
            const record = await pb.collection('albums').getOne(id, { expand: 'photos_via_album' }) as PocketRecord & { expand?: { photos_via_album?: PocketRecord[] } };

            if (!record || typeof record !== 'object') {
                logger.warn('Album not found or invalid record returned', { albumId: id });
                return null;
            }

            let photos: Photo[] = [];
            try {
                const photosList = await pb.collection('photos').getFullList({ filter: `albumId="${id}"` });

                if (Array.isArray(photosList)) {
                    photos = photosList
                        .filter((p: PocketRecord) => p != null && typeof p === 'object' && p.id != null)
                        .map((p: PocketRecord) => {
                            let manualEdits: any = {};
                            try {
                                if (typeof p.manualEdits === 'string' && p.manualEdits) {
                                    const parsed = JSON.parse(p.manualEdits);
                                    manualEdits = (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
                                } else if (p.manualEdits != null && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) {
                                    manualEdits = p.manualEdits;
                                }
                            } catch (parseError) {
                                logger.warn('Failed to parse manualEdits for photo', { photoId: p.id, parseError });
                                manualEdits = {};
                            }

                            const photoUrl = resolvePhotoUrl(p, pb.baseUrlValue, manualEdits);

                            return {
                                id: p.id,
                                albumId: (p.albumId as string) || '',
                                title: (p.title as string) || '',
                                url: photoUrl,
                                photographerId: p.photographerId as number,
                                category: (p.category as string) || undefined,
                                manualEdits: manualEdits
                            };
                        });
                } else {
                    logger.warn('getAlbum: photosList is not an array for album', { albumId: id, photosList });
                    photos = [];
                }
            } catch (photoError) {
                logger.warn('Failed to fetch photos for album', { photoError });
                if (record && record.expand && typeof record.expand === 'object' && record.expand.photos_via_album) {
                    const expandedPhotos = record.expand.photos_via_album;
                    if (Array.isArray(expandedPhotos)) {
                        photos = expandedPhotos
                            .filter((p: any) => p != null && p.id != null)
                            .map((p: any) => {
                                let manualEdits: any = {};
                                try {
                                    if (typeof p.manualEdits === 'string' && p.manualEdits) {
                                        const parsed = JSON.parse(p.manualEdits);
                                        manualEdits = (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
                                    } else if (p.manualEdits != null && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) {
                                        manualEdits = p.manualEdits;
                                    }
                                } catch (parseError) {
                                    logger.warn('Failed to parse manualEdits for photo', { photoId: p.id, parseError });
                                    manualEdits = {};
                                }

                                const photoUrl = resolvePhotoUrl(p, pb.baseUrlValue, manualEdits);

                                return {
                                    id: p.id,
                                    albumId: (p.albumId as string) || '',
                                    title: (p.title as string) || '',
                                    url: photoUrl,
                                    photographerId: p.photographerId as number,
                                    category: (p.category as string) || undefined,
                                    manualEdits: manualEdits
                                };
                            });
                    }
                }
            }

            let categories: any[] = [];
            try {
                if (record.categories != null) {
                    if (typeof record.categories === 'string' && record.categories) {
                        const parsed = JSON.parse(record.categories);
                        categories = Array.isArray(parsed) ? parsed : [];
                    } else if (Array.isArray(record.categories)) {
                        categories = record.categories;
                    }
                }
            } catch (parseError) {
                logger.warn('Failed to parse categories for album', { albumId: record?.id ?? 'unknown', parseError });
                categories = [];
            }

            const albumId = record.id || '';
            const albumTitle = record.title || '';
            const albumDate = record.date || '';
            const photographerId = record.photographerId != null ? record.photographerId : null;
            const coverPhotoUrl = record.coverPhotoUrl || (photos.length > 0 && photos[0]?.url ? photos[0].url : '') || '';
            const albumSource = record.source || '';
            const roomNumber = record.roomNumber || '';
            const albumStatus = record.status || '';

            return {
                id: albumId as string,
                title: albumTitle as string,
                date: albumDate as string,
                photographerId: (photographerId ?? 0) as number,
                coverPhotoUrl: coverPhotoUrl as string,
                source: albumSource as string,
                roomNumber: roomNumber as string,
                status: (albumStatus as AlbumStatus) || undefined,
                categories: categories,
                photos: photos
            };
        } catch (error) {
            logger.error('Failed to fetch album', error instanceof Error ? error : undefined);

            if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase();
                if (errorMessage.includes('failed to fetch') || errorMessage.includes('network') || errorMessage.includes('connection')) {
                    throw new Error('Network error: Unable to connect to the server. Please check your connection.');
                }
                if (errorMessage.includes('not found') || errorMessage.includes('404')) {
                    throw new Error(`Album not found. The album may have been deleted.`);
                }
                if (errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorMessage.includes('403')) {
                    throw new Error('Permission denied: You do not have access to this album.');
                }
                throw new Error(`Failed to load album: ${error.message}`);
            }

            return null;
        }
    },

    async createAlbum(data: Partial<Album>): Promise<Album> {
        try {
            const record = await pb.collection('albums').create(data);
            return record as Album;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('Type error');

            if (isNetworkError) {
                logger.warn(`[SyncResilience] Offline detected. Queueing create for Album`);
                const { offlineQueue } = await import('../OfflineQueue');
                
                const tempId = data.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const queuedData = { ...data, id: tempId };
                offlineQueue.enqueue('albums', 'create', queuedData);

                return {
                    ...queuedData,
                    status: data.status || 'Active',
                    photos: []
                } as Album;
            }
            throw error;
        }
    },

    async updateAlbum(id: string, data: Partial<Album>, retryCount = 0): Promise<Album> {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        try {
            const record = await pb.collection('albums').update(id, data);
            return record as Album;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('timeout');
            const isConflict = errorMessage.includes('conflict') ||
                errorMessage.includes('modified');

            if (isConflict) {
                logger.warn('Album update conflict detected', { albumId: id, error: errorMessage });
                throw error;
            }

            if (retryCount < MAX_RETRIES && isNetworkError) {
                logger.info(`Retrying album update (attempt ${retryCount + 1}/${MAX_RETRIES})`, { albumId: id });
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
                return this.updateAlbum(id, data, retryCount + 1);
            }

            logger.error('Failed to update album', error instanceof Error ? error : undefined, { albumId: id, retryCount });
            throw error;
        }
    },

    async deleteAlbum(id: string): Promise<void> {
        await pb.collection('albums').delete(id);
    },

    // --- Photos ---
    async getPhotos(): Promise<Photo[]> {
        const records = await pb.collection('photos').getFullList();
        const baseUrl = pb.baseUrlValue;
        return records.map((r: PocketRecord) => {
            const manualEdits = typeof r.manualEdits === 'string' ? JSON.parse(r.manualEdits) : (r.manualEdits || {});
            const photoUrl = resolvePhotoUrl(r, baseUrl, manualEdits);

            return {
                id: r.id,
                albumId: r.albumId,
                title: r.title || '',
                url: photoUrl,
                photographerId: r.photographerId,
                category: r.category,
                manualEdits
            };
        });
    },

    async createPhoto(data: Partial<Photo> | FormData): Promise<Photo> {
        try {
            const record = await pb.collection('photos').create(data);
            return record as Photo;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('Type error');

            if (isNetworkError) {
                logger.warn(`[SyncResilience] Offline detected. Queueing create for Photo`);
                const { offlineQueue } = await import('../OfflineQueue');
                
                // If it's FormData, we need to extract data for the queue
                let queuedData: any = {};
                if (data instanceof FormData) {
                    data.forEach((value, key) => {
                        if (value instanceof File) {
                            // Can't queue actual files easily without base64 or object URLs
                            // but we can queue the metadata. Wait, Photo creation usually involves a file.
                            // If we can't upload the file, we should queue the file upload. 
                            // Fortunately, offlineQueue handles file uploads in enqueueFileUpload.
                            logger.error('Cannot easily offline-queue raw FormData. Fallback failed.');
                        } else {
                            queuedData[key] = value;
                        }
                    });
                    // Because we have offlineQueue.enqueueFileUpload, maybe we can use it?
                    // Actually, let's just queue the basic creation. Touch doesn't upload photos directly often, it just queues them.
                    throw error;
                } else {
                    const tempId = data.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    queuedData = { ...data, id: tempId };
                    offlineQueue.enqueue('photos', 'create', queuedData);
                    
                    return {
                        ...queuedData
                    } as Photo;
                }
            }
            throw error;
        }
    },

    async deletePhoto(id: string): Promise<void> {
        await pb.collection('photos').delete(id);
    },

    async getPhotoBlobs(photoIds: string[]): Promise<Record<string, Blob>> {
        const blobs: Record<string, Blob> = {};
        const baseUrl = pb.baseUrlValue;

        for (const photoId of photoIds) {
            try {
                const photo = await pb.collection('photos').getOne(photoId);
                let manualEdits: any = {};
                try {
                    if (typeof photo.manualEdits === 'string' && photo.manualEdits) {
                        manualEdits = JSON.parse(photo.manualEdits);
                    } else if (photo.manualEdits) {
                        manualEdits = photo.manualEdits;
                    }
                } catch { }
                
                const photoUrl = resolvePhotoUrl(photo, baseUrl, manualEdits);

                if (photoUrl) {
                    const response = await fetch(photoUrl);
                    if (response.ok) {
                        blobs[photoId] = await response.blob();
                    }
                }
            } catch (error) {
                logger.warn(`Failed to fetch blob for photo ${photoId}`, { error });
            }
        }

        return blobs;
    }
};
