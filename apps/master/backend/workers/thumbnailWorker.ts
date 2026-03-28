
const { parentPort } = require('worker_threads');
const sharp = require('sharp');
const fs = require('fs');

if (!parentPort) throw new Error('Worker must be spawned from main thread');

parentPort.on('message', async (task) => {
    try {
        const { filepath, width = 400, quality = 80 } = task;

        if (!filepath) throw new Error('Filepath is required');

        // Verify file exists
        if (!fs.existsSync(filepath)) {
            throw new Error(`File not found: ${filepath}`);
        }

        // Generate Thumbnail
        // Resize to width, maintaining aspect ratio
        const buffer = await sharp(filepath)
            .resize({ width, withoutEnlargement: true })
            .jpeg({ quality })
            .toBuffer();

        // Convert to Base64 Data URL for immediate UI consume
        const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        parentPort.postMessage({ success: true, dataUrl });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
