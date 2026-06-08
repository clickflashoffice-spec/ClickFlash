const { parentPort, threadId } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

if (!parentPort) {
    throw new Error('This file must be run as a worker thread');
}

console.log(`[WatermarkWorker] Starting thread ${threadId}...`);

parentPort.on('message', async (job) => {
    try {
        if (job.type === 'watermark') {
            await handleWatermarkJob(job);
        }
    } catch (error) {
        console.error(`[WatermarkWorker] Error in thread ${threadId}:`, error);
        parentPort.postMessage({
            success: false,
            error: `Watermarking failed: ${error.message}`
        });
    }
});

/**
 * Handle Watermark Generation Job
 * Applies a "PROOF" overlay and converts to WebP.
 */
async function handleWatermarkJob(job) {
    const { filepath, outputDir, photoId } = job;

    if (!fs.existsSync(filepath)) {
        throw new Error(`Input file not found: ${filepath}`);
    }

    // Use WebP for previews - much more efficient for the browser (Low RAM)
    const wmFilename = `${photoId}_preview_wm.webp`;
    const wmPath = path.join(outputDir, wmFilename);

    try {
        const metadata = await sharp(filepath).metadata();
        const width = metadata.width || 1200;
        const height = metadata.height || 1200;

        // Calculate output dimensions (Target 2K for high-DPI displays)
        const scale = Math.min(2048 / width, 2048 / height, 1);
        const outWidth = Math.round(width * scale);
        const outHeight = Math.round(height * scale);

        // Dynamic font size (10% of smallest dimension)
        const fontSize = Math.floor(Math.min(outWidth, outHeight) * 0.1);

        // Semi-transparent SVG Overlay
        const svg = Buffer.from(`
            <svg width="${outWidth}" height="${outHeight}">
                <style>
                .title { 
                    fill: rgba(255, 255, 255, 0.3); 
                    font-family: sans-serif;
                    font-size: ${fontSize}px; 
                    font-weight: bold; 
                    transform: rotate(-45deg); 
                    transform-origin: center; 
                }
                </style>
                <text x="50%" y="50%" text-anchor="middle" class="title">PROOF</text>
            </svg>
        `);

        await sharp(filepath)
            .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
            .composite([{ input: svg, gravity: 'center' }])
            .toFormat('webp', { quality: 80 })
            .toFile(wmPath);

        parentPort.postMessage({
            success: true,
            photoId,
            wmFilename
        });

    } catch (err) {
        console.error(`[WatermarkWorker] Failed to process ${photoId}:`, err);
        throw err;
    }
}
