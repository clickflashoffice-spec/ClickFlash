export interface R2Bucket {
    put(key: string, value: any, options?: any): Promise<void>;
    get(key: string): Promise<R2ObjectBody | null>;
    delete(key: string): Promise<void>;
}

export interface R2ObjectBody {
    body: ReadableStream;
}

export interface PhotoMetadata {
    url: string;
    storagePath: string; // Now R2 key
    originalFilename: string;
    fileSize: number;
    mimeType: string;
    width: number | null;
    height: number | null;
    fileHash: string;
}

export class PhotoProcessor {
    private bucket: R2Bucket;

    constructor(bucket: R2Bucket) {
        this.bucket = bucket;
    }

    /**
     * Get organized storage path for a photo (R2 Key)
     */
    getStorageKey(albumId: string, photoId: string, originalFilename: string): string {
        const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
        return `${albumId}/${photoId}.${ext}`;
    }

    /**
     * Calculate file hash using Web Crypto API.
     */
    async calculateFileHash(data: ArrayBuffer, algorithm: string = 'SHA-256'): Promise<string> {
        const hashBuffer = await crypto.subtle.digest(algorithm, data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Get MIME type from file extension
     */
    getMimeType(filename: string): string {
        const ext = `.${filename.split('.').pop()?.toLowerCase()}`;
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    /**
     * Process uploaded photo and save to R2
     */
    async processPhoto(data: ArrayBuffer, filename: string, albumId: string, photoId: string): Promise<PhotoMetadata> {
        const storageKey = this.getStorageKey(albumId, photoId, filename);
        const fileHash = await this.calculateFileHash(data);
        const mimeType = this.getMimeType(filename);
        const fileSize = data.byteLength;

        // Save to R2
        await this.bucket.put(storageKey, data, {
            httpMetadata: { contentType: mimeType }
        });

        return {
            url: storageKey,
            storagePath: storageKey,
            originalFilename: filename,
            fileSize: fileSize,
            mimeType: mimeType,
            width: null,
            height: null,
            fileHash: fileHash
        };
    }
}

export default PhotoProcessor;
