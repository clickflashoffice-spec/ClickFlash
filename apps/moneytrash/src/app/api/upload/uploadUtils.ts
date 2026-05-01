/**
 * Background Sync Utility for Money Trash
 * Handles delegation of photo metadata and binary assets to the Gallery app
 */

export interface SyncConfig {
    priceSingle?: string;
    priceFull?: string;
    customerEmail?: string;
    [key: string]: unknown;
}

export interface SyncFile {
    name: string;
    path: string;
    type: string;
    size: number;
    id?: string;
    originalName?: string;
    savedName?: string;
    buffer?: Buffer;
}

export async function performBackgroundSync(apiUrl: string, albumId: string, albumTitle: string, config: SyncConfig, files: SyncFile[]) {
    try {
        // 1. Sync Album first
        await fetch(`${apiUrl}/api/cloud/sync-album`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: albumId,
                title: albumTitle,
                price_single: parseFloat(config.priceSingle || '0'),
                price_full: parseFloat(config.priceFull || '0'),
                customer_email: config.customerEmail || '',
                date: new Date().toISOString()
            })
        });

        console.log(`[BackgroundSync] Album ${albumId} metadata synced.`);

        // 2. Sync Photos sequentially to avoid overwhelming the bridge
        for (const file of files) {
            if (!file.buffer && !file.path) continue;

            try {
                // Phase 3.4: Pure Streaming Forwarder (Law 15)
                const { createReadStream } = await import('fs');
                const { stat } = await import('fs/promises');
                
                // form-data is a runtime-only Node dep used for real streaming
                // upload support. Types are provided by the local declaration
                // at ./form-data.d.ts (the package itself is a transitive dep,
                // not declared in moneytrash's package.json).
                const { default: FormDataNode } = await import('form-data');
                const form = new FormDataNode();
                
                if (file.path) {
                    const stats = await stat(file.path);
                    form.append('file', createReadStream(file.path), {
                        filename: file.originalName || file.name,
                        contentType: file.type,
                        knownLength: stats.size
                    });
                } else if (file.buffer) {
                    form.append('file', file.buffer, {
                        filename: file.originalName || file.name,
                        contentType: file.type
                    });
                }
                
                form.append('orderId', 'moneytrash-upload');
                form.append('photoId', file.id || crypto.randomUUID());
                form.append('deskId', 'moneytrash');
                form.append('albumId', albumId);

                const response = await new Promise<any>((resolve, reject) => {
                    form.submit(`${apiUrl}/api/cloud/upload-photo`, (err: Error | null, res: any) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
                });

                if (response.statusCode >= 400) {
                    console.error(`[BackgroundSync] Photo ${file.id} sync failed: ${response.statusCode}`);
                }
            } catch (err) {
                console.error(`[BackgroundSync] Photo ${file.id} network error:`, err);
            }
        }
        console.log(`[BackgroundSync] Completed sync for ${albumId}`);
    } catch (err) {
        console.error(`[BackgroundSync] Error syncing album ${albumId}:`, err);
        throw err;
    }
}
