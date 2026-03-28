// backend/workers/watermarkWorker.ts
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
        console.error(`[WatermarkWorker] Error in thread ${threadId}:`, error);
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
        // Get image dimensions
        const metadata = await sharp(sourcePath).metadata();
        const width = metadata.width || 1200;
        const height = metadata.height || 800;

        // Calculate font size (10% of smallest dimension)
        const fontSize = config.fontSize || Math.floor(Math.min(width, height) * 0.1);

        // Create SVG watermark
        const svgWatermark = Buffer.from(`
            <svg width="${width}" height="${height}">
                <style>
                    .watermark { 
                        fill: rgba(255, 255, 255, ${config.opacity || 0.3}); 
                        font-size: ${fontSize}px; 
                        font-weight: bold; 
                        transform: rotate(${config.rotation || -45}deg);
                        transform-origin: center;
                    }
                </style>
                <text x="50%" y="50%" text-anchor="middle" class="watermark">
                    ${config.text || 'PROOF'}
                </text>
            </svg>
        `);

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Apply watermark and save as WebP
        await sharp(sourcePath)
            .composite([{ input: svgWatermark, gravity: 'center' }])
            .webp({ quality: 80 })
            .toFile(outputPath);

        // Generated watermark

        parentPort?.postMessage({
            success: true,
            photoId,
            outputPath
        });
    } catch (err: any) {
        console.error(`[WatermarkWorker][Thread ${threadId}] Error processing ${photoId}:`, err.message);
        throw err;
    }
}
