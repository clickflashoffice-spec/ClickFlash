import { pb } from '../pb';
import { safeStorage } from '../../utils/safeStorage';

export interface ScanReport {
    issues: string[];
    storage: string; // Formatted string
    itemCount: number;
    healthScore: number;
    counts: {
        albums: number;
        photos: number;
        orders: number;
    };
    storageUsageBytes: number;
    network?: NetworkStats;
}

export interface NetworkStats {
    throughput: number;
    avgLatency: number;
    successRate: number;
    failCount: number;
    eventCount: number;
}

export interface CloudLinkStatus {
    status: 'connected' | 'disconnected' | 'not_configured' | 'checking';
    url?: string;
    latency?: number;
}

// Retry helper for resilient health checks
async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 500
): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e) {
            lastError = e;
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}

export const diagnosticsService = {
    /**
     * Check cloud link connectivity
     */
    async checkCloudLinkStatus(): Promise<CloudLinkStatus> {
        const savedCloudSettings = safeStorage.getItem('masterCloudSettings');
        if (!savedCloudSettings) {
            return { status: 'not_configured' };
        }

        let config: { url?: string; key?: string };
        try {
            config = JSON.parse(savedCloudSettings);
        } catch {
            return { status: 'not_configured' };
        }

        if (!config.url) {
            return { status: 'not_configured' };
        }

        const start = performance.now();
        try {
            // Try to fetch the cloud health endpoint
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(`${config.url}/api/health`, {
                method: 'GET',
                signal: controller.signal,
                mode: 'no-cors' // Allow cross-origin without CORS headers
            });

            clearTimeout(timeout);
            const latency = Math.round(performance.now() - start);

            return {
                status: res.ok || res.status === 0 ? 'connected' : 'disconnected', // status 0 from no-cors
                url: config.url,
                latency
            };
        } catch {
            return { status: 'disconnected', url: config.url };
        }
    },

    /**
     * Verify application bundle health (not just assuming connected)
     */
    async verifyAppHealth(): Promise<{ healthy: boolean; latency: number }> {
        const start = performance.now();
        try {
            // Check if we can reach the API base URL
            const res = await withRetry(async () => {
                const r = await fetch(`${pb.baseUrlValue}/api/health`, {
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                if (!r.ok) throw new Error('Health check failed');
                return r;
            }, 2, 300);

            const latency = Math.round(performance.now() - start);
            return { healthy: res.ok, latency };
        } catch {
            return { healthy: false, latency: -1 };
        }
    },

    /**
     * Fetch network performance stats
     */
    async getNetworkStats(): Promise<NetworkStats | null> {
        try {
            const res = await withRetry(async () => {
                const r = await fetch(`${pb.baseUrlValue}/api/system/network-stats`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${pb.authStore.token}` }
                });
                if (!r.ok) throw new Error('Failed to fetch network stats');
                return r;
            }, 2, 300);

            const data = await res.json();
            return {
                throughput: data.throughput || 0,
                avgLatency: data.avgLatency || 0,
                successRate: data.successRate ?? 1,
                failCount: data.failCount || 0,
                eventCount: data.eventCount || 0
            };
        } catch {
            return null;
        }
    },

    /**
     * Run data integrity checks - OPTIMIZED version
     * Uses count queries and paginated sampling instead of full collection fetches
     */
    async verifyDataIntegrity(): Promise<ScanReport> {
        const issues: string[] = [];
        let totalBytes = 0;

        // 1. Fetch Counts using optimized queries (not full list)
        let albumCount = 0;
        let photoCount = 0;
        let orderCount = 0;
        let albums: any[] = [];
        let photos: any[] = [];

        try {
            // Use getList with perPage=1 to get total count efficiently
            const [albumsResult, photosResult, ordersResult] = await Promise.all([
                pb.collection('albums').getList(1, 1, {
                    fields: 'id' // Only fetch IDs to minimize data
                }),
                pb.collection('photos').getList(1, 1, {
                    fields: 'id'
                }),
                pb.collection('orders').getList(1, 1, {
                    fields: 'id'
                })
            ]);

            albumCount = albumsResult.totalItems;
            photoCount = photosResult.totalItems;
            orderCount = ordersResult.totalItems;

            // 2. For integrity checks, sample data instead of loading everything
            // Sample albums for cover photo check (first 500)
            if (albumCount > 0) {
                const albumSample = await pb.collection('albums').getList(1, Math.min(500, albumCount), {
                    fields: 'id,coverPhotoUrl'
                });
                albums = albumSample.items;
            }

            // For orphan detection, we need photo albumIds and album IDs
            // Sample photos (first 1000) to check for orphans
            if (photoCount > 0) {
                const photoSample = await pb.collection('photos').getList(1, Math.min(1000, photoCount), {
                    fields: 'id,albumId'
                });
                photos = photoSample.items;
            }

            // Get all album IDs for orphan check (just IDs, not full records)
            // If there are too many albums, we paginate through them
            const albumIds = new Set<string>();
            if (albumCount > 0) {
                // For small collections, get all IDs
                if (albumCount <= 2000) {
                    const allAlbums = await pb.collection('albums').getFullList({
                        fields: 'id'
                    });
                    allAlbums.forEach((a: any) => albumIds.add(a.id));
                } else {
                    // For large collections, just use the sample + note limitation
                    albums.forEach((a: any) => albumIds.add(a.id));
                    issues.push(`Large collection (${albumCount} albums): Orphan check limited to sample.`);
                }
            }

            // Check for orphaned photos in sample
            let orphanedPhotos = 0;
            photos.forEach(p => {
                if (p.albumId && !albumIds.has(p.albumId)) {
                    orphanedPhotos++;
                }
            });

            // Extrapolate orphan count if we sampled
            if (photoCount > 1000 && orphanedPhotos > 0) {
                const estimatedOrphans = Math.round((orphanedPhotos / photos.length) * photoCount);
                issues.push(`~${estimatedOrphans} orphaned photos estimated (based on sample).`);
            } else if (orphanedPhotos > 0) {
                issues.push(`${orphanedPhotos} orphaned photos found (no matching album).`);
            }

            // Check for albums without cover photos
            let albumsNoCover = 0;
            albums.forEach((a: any) => {
                if (!a.coverPhotoUrl && !a.coverPhotoId) {
                    albumsNoCover++;
                }
            });

            // Extrapolate if sampled
            if (albumCount > 500 && albumsNoCover > 0) {
                const estimatedNoCover = Math.round((albumsNoCover / albums.length) * albumCount);
                issues.push(`${estimatedNoCover} albums estimated missing cover photos.`);
            } else if (albumsNoCover > 0) {
                issues.push(`${albumsNoCover} albums missing cover photos.`);
            }

        } catch (e) {
            issues.push("Failed to fetch collections from database.");
            return {
                issues,
                storage: '0 B',
                itemCount: 0,
                healthScore: 0,
                counts: { albums: 0, photos: 0, orders: 0 },
                storageUsageBytes: 0
            };
        }

        // 3. Estimate Storage
        // Use backend stats if available for more accurate numbers
        try {
            const backendStatsRes = await fetch(`${pb.baseUrlValue}/api/health`);
            if (backendStatsRes.ok) {
                const stats = await backendStatsRes.json();
                if (stats.storage) {
                    // Use backend-provided storage info
                    totalBytes = (stats.dbSize || 0) +
                        (stats.storage.imports || 0) +
                        (stats.storage.backup || 0);
                }
            }
        } catch {
            // Fallback to estimation
            const avgPhotoSize = 2 * 1024 * 1024; // 2MB
            totalBytes += photoCount * avgPhotoSize;
            totalBytes += albumCount * 1024; // ~1KB per album record
            totalBytes += orderCount * 2048; // ~2KB per order record
        }

        const healthScore = Math.max(0, 100 - (issues.length * 10));

        return {
            issues,
            storage: formatBytes(totalBytes),
            itemCount: albumCount + orderCount + photoCount,
            healthScore,
            counts: {
                albums: albumCount,
                photos: photoCount,
                orders: orderCount
            },
            storageUsageBytes: totalBytes,
            network: await this.getNetworkStats() || undefined
        };
    },

    /**
     * Execute maintenance tasks with retry
     */
    async performMaintenance(): Promise<{ success: boolean; cleaned: number }> {
        try {
            // vacuum with retry
            await withRetry(async () => {
                const res = await fetch(`${pb.baseUrlValue}/api/maintenance/vacuum`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${pb.authStore.token}` }
                });
                if (!res.ok) throw new Error('Vacuum failed');
                return res;
            }, 3, 500);

            // cleanup with retry
            const res = await withRetry(async () => {
                const r = await fetch(`${pb.baseUrlValue}/api/maintenance/cleanup`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${pb.authStore.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ masterImportRetentionDays: 30 })
                });
                if (!r.ok) throw new Error('Cleanup failed');
                return r;
            }, 3, 500);

            if (res.ok) {
                const data = await res.json();
                const match = data.message?.match(/(\d+) files/);
                const cleaned = match ? parseInt(match[1]) : 0;
                return { success: true, cleaned };
            }

            return { success: false, cleaned: 0 };
        } catch (e) {
            console.error("Maintenance failed", e);
            throw e;
        }
    },

    /**
     * Wipe database and reset
     */
    async resetDb(): Promise<void> {
        const res = await fetch(`${pb.baseUrlValue}/api/system/reset`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${pb.authStore.token}` }
        });

        if (!res.ok) {
            throw new Error("Failed to reset system");
        }
    }
};

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
