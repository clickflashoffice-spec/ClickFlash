import { logger } from '../utils/logger';
// backend/workers/watermarkWorker.ts
export {};
const { parentPort, threadId } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

if (!parentPort) {
    throw new Error('This file must be run as a worker thread');
}

// Thread ready

parentPort.on('message', async (job: any) => {
    try {
        await generateWatermark(job);
    } catch (error: any) {
        logger.error(`[WatermarkWorker] Error in thread ${threadId}:`, error);
        parentPort.postMessage({
            success: false,
            error: `Watermark generation failed: ${error.message}`,
            photoId: job.photoId
        });
    }
});

async function generateWatermark(job: any) {
    const { sourcePath, outputPath, config, photoId } = job;

    // Processing ${photoId}

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
    }

    try {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Apply invisible DCT steganographic watermark
        const watermarkText = config.text || `CF-${photoId}`;
        const scriptPath = path.join(process.cwd(), 'scripts', 'dct_watermark.py');
        const exec = require('util').promisify(require('child_process').exec);
        
        // Execute Python DCT watermark script
        await exec(`python "${scriptPath}" "${sourcePath}" "${watermarkText}" "${outputPath}"`);
        
        // Ensure the file was created
        if (!fs.existsSync(outputPath)) {
            throw new Error('DCT watermark script failed to generate output file');
        }

        // Generated watermark

        parentPort?.postMessage({
            success: true,
            photoId,
            outputPath
        });
    } catch (err: any) {
        logger.error(`[WatermarkWorker][Thread ${threadId}] Error processing ${photoId}:`, err.message);
        throw err;
    }
}
