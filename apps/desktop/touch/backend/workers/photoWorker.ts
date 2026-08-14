// apps/touch/backend/workers/photoWorker.ts
import { parentPort } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

if (!parentPort) {
    throw new Error('This file must be run as a worker thread.');
}

async function calculateFileHash(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filepath);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

parentPort.on('message', async (job) => {
    try {
        if (job.type === 'process') {
            const { filepath, outputDir, photoId, ext } = job;

            // 1. Calculate Hash
            const fileHash = await calculateFileHash(filepath);

            // 2. Metadata
            const sharpImg = sharp(filepath);
            const metadata = await sharpImg.metadata();

            // 3. Kiosk Version (Resize)
            const kioskFilename = `kiosk_${photoId}${ext}`;
            const kioskPath = path.join(outputDir, kioskFilename);

            await sharpImg
                .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(kioskPath);

            parentPort!.postMessage({
                success: true,
                hash: fileHash,
                metadata: {
                    size: fs.statSync(filepath).size,
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height
                },
                kioskFilename,
                photoId
            });
        }
    } catch (error: any) {
        parentPort!.postMessage({
            success: false,
            error: error.message
        });
    }
});
