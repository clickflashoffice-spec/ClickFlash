export interface PhotoMetadata {
    fileSize: number;
    mimeType: string;
    width: number | null;
    height: number | null;
}

export class PhotoProcessor {
    private bucket: any;

    constructor(bucket: any) {
        this.bucket = bucket;
    }

    async calculateFileHash(data: ArrayBuffer): Promise<string> {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async processPhoto(data: ArrayBuffer, albumId: string, photoId: string, originalFilename: string, mimeType: string) {
        try {
            const fileHash = await this.calculateFileHash(data);
            const storagePath = `${albumId}/${photoId}`; // Simple R2 key

            await this.bucket.put(storagePath, data, {
                httpMetadata: { contentType: mimeType }
            });

            return {
                url: storagePath,
                storagePath: storagePath,
                originalFilename,
                fileSize: data.byteLength,
                mimeType: mimeType,
                fileHash
            };
        } catch (error: any) {
            throw new Error(`Photo processing failed: ${error.message}`);
        }
    }
}

export default PhotoProcessor;
