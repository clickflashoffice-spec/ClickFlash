const { parentPort, threadId } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

if (!parentPort) {
    throw new Error('This file must be run as a worker thread');
}

console.log(`[FulfillmentWorker] Starting thread ${threadId}...`);

parentPort.on('message', async (job) => {
    try {
        if (job.type === 'render') {
            await handleRenderJob(job);
        }
    } catch (error) {
        console.error(`[FulfillmentWorker] Error in thread ${threadId}:`, error);
        parentPort.postMessage({
            success: false,
            error: `Rendering failed: ${error.message}`
        });
    }
});

/**
 * Handle High-Res Rendering Job
 * Applies specific edits (Retouch, Crop, Styles) to a source image.
 */
async function handleRenderJob(job) {
    const { sourcePath, destPath, edits } = job;

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
    }

    try {
        console.log(`[FulfillmentWorker] Rendering ${path.basename(sourcePath)} -> ${path.basename(destPath)}`);

        // 1. Initial Load & Rotation/Straighten
        // We do rotation first so coordinates for subsequent steps (crop, retouch) 
        // match the "final visually oriented" space.
        let pipeline = sharp(sourcePath).withMetadata();
        const rotVal = (edits.rotate || 0) + (edits.straighten || 0);
        if (rotVal !== 0) {
            pipeline = pipeline.rotate(rotVal);
        }

        // Get metadata after rotation to know new dimensions
        // We need huge limits for high-res photos (default is ~268MP, usually enough, but let's be safe if config needed)
        const intermediateBuffer = await pipeline.toBuffer();
        let metadata = await sharp(intermediateBuffer).metadata();
        let currentWidth = metadata.width || 0;
        let currentHeight = metadata.height || 0;

        // 2. Retouching (Healing)
        // Applied to the rotated image
        if (edits.retouchActions && edits.retouchActions.length > 0) {
            pipeline = await applyRetouchActions(intermediateBuffer, edits.retouchActions, currentWidth, currentHeight);

            // Re-fetch intermediate buffer and metadata after retouching
            // This is heavy, but necessary to burn in the healing before crop
            const retouchedBuffer = await pipeline.toBuffer();
            pipeline = sharp(retouchedBuffer);
            metadata = await pipeline.metadata();
            currentWidth = metadata.width || 0;
            currentHeight = metadata.height || 0;
        } else {
            pipeline = sharp(intermediateBuffer);
        }

        // 3. Crop (Percentage-based)
        if (edits.crop && typeof edits.crop === 'object') {
            const { x, y, width, height } = edits.crop;
            // Convert percentage to pixels relative to CURRENT (rotated) dimensions
            const left = Math.round((x / 100) * currentWidth);
            const top = Math.round((y / 100) * currentHeight);
            const cropW = Math.round((width / 100) * currentWidth);
            const cropH = Math.round((height / 100) * currentHeight);

            // Ensure we are within bounds
            const safeLeft = Math.max(0, Math.min(currentWidth - 1, left));
            const safeTop = Math.max(0, Math.min(currentHeight - 1, top));
            const safeW = Math.max(1, Math.min(currentWidth - safeLeft, cropW));
            const safeH = Math.max(1, Math.min(currentHeight - safeTop, cropH));

            pipeline = pipeline.extract({
                left: safeLeft,
                top: safeTop,
                width: safeW,
                height: safeH
            });
        }

        // 4. Global Color Adjustments
        const brightnessAdjust = 1.0 + ((edits.brightness || 0) + (edits.exposure || 0) * 5) / 100.0;
        const saturationAdjust = 1.0 + (edits.saturate || 0) / 100.0;

        if (brightnessAdjust !== 1.0 || saturationAdjust !== 1.0 || edits.hueRotate) {
            pipeline = pipeline.modulate({
                brightness: brightnessAdjust,
                saturation: saturationAdjust,
                hue: edits.hueRotate || 0
            });
        }

        const contrastAdjust = 1.0 + (edits.contrast || 0) / 100.0;
        if (contrastAdjust !== 1.0) {
            // Linear transformation for contrast
            pipeline = pipeline.linear(contrastAdjust, -(0.5 * contrastAdjust) + 0.5);
        }

        // Filter fallbacks (Grayscale, Sepia, etc.)
        if (edits.grayscale) pipeline = pipeline.grayscale();
        if (edits.sepia) pipeline = pipeline.recomb([[0.3588, 0.7044, 0.1368], [0.2990, 0.5870, 0.1140], [0.2392, 0.4696, 0.0912]]);
        if (edits.invert) pipeline = pipeline.negate();

        if (edits.soften && edits.soften > 0) {
            pipeline = pipeline.blur(edits.soften / 5.0);
        }

        // Clarity is basically unsharp mask in this context
        if (edits.clarity && edits.clarity > 0) {
            pipeline = pipeline.sharpen(edits.clarity / 20.0);
        }

        // 5. Final Output
        await pipeline
            .jpeg({ quality: 95, mozjpeg: true })
            .toFile(destPath);

        parentPort.postMessage({
            success: true,
            destPath: destPath
        });

    } catch (err) {
        console.error(`[FulfillmentWorker] Error rendering:`, err);
        throw err;
    }
}

/**
 * Applies retouching (healing) actions using Sharp compositions
 * Ported from Master App
 */
async function applyRetouchActions(imageBuffer, actions, width, height) {
    // We start with the base image buffer
    let currentBuffer = imageBuffer;

    // Apply retouches sequentially to allow overlaps
    for (const action of actions) {
        const { x, y, radius, sourceX, sourceY } = action;
        if (sourceX == null || sourceY == null) continue;

        const patchSize = Math.round(radius * 2);

        // 1. Extract source patch
        // Clamp to image bounds
        const sx = Math.max(0, Math.min(width - patchSize, Math.round(sourceX - radius)));
        const sy = Math.max(0, Math.min(height - patchSize, Math.round(sourceY - radius)));

        const patch = await sharp(currentBuffer)
            .extract({ left: sx, top: sy, width: patchSize, height: patchSize })
            .toBuffer();

        // 2. Create feathered mask
        const mask = Buffer.from(`
            <svg width="${patchSize}" height="${patchSize}">
                <defs>
                    <radialGradient id="feather" cx="50%" cy="50%" r="50%">
                        <stop offset="60%" style="stop-color:white;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:white;stop-opacity:0" />
                    </radialGradient>
                </defs>
                <circle cx="${radius}" cy="${radius}" r="${radius}" fill="url(#feather)" />
            </svg>
        `);

        // 3. Apply mask to patch
        const featheredPatch = await sharp(patch)
            .composite([{ input: mask, blend: 'dest-in' }])
            .toBuffer();

        // 4. Composite patch onto target
        const tx = Math.max(0, Math.min(width - patchSize, Math.round(x - radius)));
        const ty = Math.max(0, Math.min(height - patchSize, Math.round(y - radius)));

        currentBuffer = await sharp(currentBuffer)
            .composite([{ input: featheredPatch, left: tx, top: ty }])
            .toBuffer();
    }

    return sharp(currentBuffer);
}
