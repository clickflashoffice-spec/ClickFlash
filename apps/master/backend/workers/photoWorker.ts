// backend/workers/photoWorker.ts (CommonJS version)
import {
  parentPort,
  threadId,
  workerData as _workerData,
} from "worker_threads";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

import { validateImageMagicNumber } from "../shared/validateImage";

if (!parentPort) {
  throw new Error("This file must be run as a worker thread");
}

// Windows EBUSY Fix: Disable libvips cache to prevent file locking
sharp.cache(false);

// Thread started

interface WorkerJob {
  type?: "process" | "apply-edits" | "watermark";
  filepath: string;
  outputDir: string;
  photoId: string;
  ext: string;
  sourcePath?: string;
  destPath?: string;
  edits?: any;
  hash?: string;
}

parentPort.on("message", async (job: WorkerJob) => {
  try {
    if (!job.type || job.type === "process") {
      await handleProcessJob(job);
    } else if (job.type === "apply-edits") {
      await handleApplyEditsJob(job);
    } else if (job.type === "watermark") {
      await handleWatermarkJob(job);
    }
  } catch (error) {
    const err = error as Error;
    console.error(`[PhotoWorker] Error in thread ${threadId}:`, err);
    parentPort!.postMessage({
      success: false,
      error: `Photo processing failed: ${err.message}`,
    });
  }
});

async function handleProcessJob(job: WorkerJob) {
  const { filepath, outputDir, photoId, ext } = job;
  // Processing ${photoId} from ${filepath}

  // Phase 32: Skip processing for placeholder URLs
  if (filepath.startsWith("http://") || filepath.startsWith("https://") || filepath.includes(":/")) {
    console.warn(`[PhotoWorker] Skipping processing for remote/placeholder URL: ${filepath}`);
    parentPort!.postMessage({
      success: true,
      photoId,
      skipped: true,
      message: "Placeholder URL skipped",
      assets: {
        thumbnail: filepath,
        preview: filepath,
        tiny: filepath,
      }
    });
    return;
  }

  if (!fs.existsSync(filepath)) {
    throw new Error(`Input file not found: ${filepath}`);
  }

  const isValidMagicNumber = await validateImageMagicNumber(filepath);
  if (!isValidMagicNumber) {
    throw new Error(
      `SECURITY_VIOLATION: Invalid file signature (Magic Number mismatch) for photo ${photoId}`,
    );
  }

  // 3. Generate Assets (Thumbnail, Preview, Tiny)
  // Restored per Phase 31: Security & Stability Patch (Touch App Requirement)
  const thumbnailFilename = `${photoId}_thumb${ext}`;
  const previewFilename = `${photoId}_preview${ext}`;
  const tinyFilename = `${photoId}_tiny.webp`; // WebP for tiny is vastly more efficient

  const thumbnailPath = path.join(outputDir, thumbnailFilename);
  const previewPath = path.join(outputDir, previewFilename);
  const tinyPath = path.join(outputDir, tinyFilename);

  try {
    // 1. Calculate Hash (Stream-based) - Low Memory Footprint
    // Rule 15: Scale Capacity - Avoid loading 100MB+ into V8 Heap
    const fileHash = await new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filepath);
      stream.on("error", (err: Error) => reject(err));
      stream.on("data", (chunk: string | Buffer) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });

    // 2. Metadata (Native Memory)
    // Sharp loads data into libvips (outside V8 heap) when passed a path
    const image = sharp(filepath, { failOnError: false });
    const metadata = await image.metadata();
    
    // Extract EXIF orientation for auto-rotation
    const orientation = metadata.orientation || 1;

    // AI-Enhanced Analytics: Local Heuristic Image Auditing
    const quality_flags: string[] = [];
    try {
      const stats = await image.stats();
      if (stats && stats.channels && stats.channels.length >= 3) {
        const r = stats.channels[0];
        const g = stats.channels[1];
        const b = stats.channels[2];

        // Human luminance approximation
        const luminance = 0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean;
        // Contrast approximation (average standard deviation)
        const contrast = (r.stdev + g.stdev + b.stdev) / 3;

        if (luminance < 30) quality_flags.push("Dark");
        else if (luminance > 225) quality_flags.push("Overexposed");

        if (contrast < 20) quality_flags.push("Flat");
      }
    } catch {
      console.warn(`[PhotoWorker] Failed to compute stats for ${photoId}`);
    }

    // Generating assets...

    // Parallel generation for speed (Sharp is efficient at this)
    // Using `filepath` source allows Sharp to stream/map efficiently
    await Promise.all([
      // Thumbnail (400px) - Grid
      sharp(filepath, { failOnError: false })
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .toFile(thumbnailPath),

      // Preview (2048px / 2K) - High Quality Display
      // Upgraded from 1200px for sharper visuals on 4K displays
      // Still uses 1/6th RAM of full Hi-Res (safe for 8GB Touch Kiosks)
      sharp(filepath, { failOnError: false })
        .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(previewPath),

      // Tiny (100px WebP) - Quick Load / Preload
      sharp(filepath, { failOnError: false })
        .resize(100, 100, { fit: "inside", withoutEnlargement: true })
        .toFormat("webp", { quality: 80 })
        .toFile(tinyPath),
    ]);

    // Job completed

    parentPort!.postMessage({
      success: true,
      photoId,
      hash: fileHash,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        orientation: orientation,
      },
      quality_flags,
      assets: {
        thumbnail: thumbnailFilename,
        preview: previewFilename,
        tiny: tinyFilename,
      },
    });
  } catch (error) {
    const err = error as Error;
    // Hardening: Handle Corrupt JPEGs gracefully
    if (
      err.message &&
      (err.message.includes("Corrupt JPEG") ||
        err.message.includes("premature end of JPEG"))
    ) {
      try {
        console.warn(
          `[PhotoWorker] Corrupt/Partial JPEG detected for ${photoId}. Attempting aggressive repair...`,
        );
        // Fallback: Load into Buffer (Native memory optimization)
        const buffer = fs.readFileSync(filepath);

        // Re-run generations with buffer + failOnError: false
        // This allows sharp to process partial images as much as possible
        const p1 = sharp(buffer, { failOnError: false })
          .resize(400, 400, { fit: "inside", withoutEnlargement: true })
          .toFile(thumbnailPath);
        const p2 = sharp(buffer, { failOnError: false })
          .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85, mozjpeg: true })
          .toFile(previewPath);
        const p3 = sharp(buffer, { failOnError: false })
          .resize(100, 100, { fit: "inside", withoutEnlargement: true })
          .toFormat("webp", { quality: 80 })
          .toFile(tinyPath);

        await Promise.all([p1, p2, p3]);

        // Recalculate metadata from failed state
        const repairMetadata = await sharp(buffer, {
          failOnError: false,
        }).metadata();

        parentPort!.postMessage({
          success: true,
          photoId,
          hash:
            job.hash ||
            `repair-${crypto.createHash("md5").update(buffer.slice(0, 1024)).digest("hex")}`,
          metadata: {
            width: repairMetadata.width || 0,
            height: repairMetadata.height || 0,
            format: repairMetadata.format,
            size: buffer.length,
            orientation: repairMetadata.orientation || 1,
          },
          quality_flags: [], // Unable to compute reliable stats on corrupt JPEG
          assets: {
            thumbnail: thumbnailFilename,
            preview: previewFilename,
            tiny: tinyFilename,
          },
          warning: "Recovered from corruption/partial data",
        });
        return;
      } catch (fallbackError) {
        const fallbackErr = fallbackError as Error;
        console.error(
          `[PhotoWorker] Aggressive repair failed for ${photoId}:`,
          fallbackErr.message,
        );
      }
    }

    console.error(
      `[PhotoWorker][Thread ${threadId}] Critical error processing ${photoId}:`,
      err.message,
    );
    throw err;
  }
}

/**
 * Advanced Edit Application
 * Applies rotation, crop, color adjustments, and retouching (healing) to a photo.
 * Used for both high-quality previews and final fulfillment.
 */
async function handleApplyEditsJob(job: WorkerJob) {
  const { sourcePath, destPath, edits } = job;

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  try {
    // Applying edits to ${sourcePath}

    // 1. Initial Load & Rotation/Straighten
    // We do rotation first so coordinates for subsequent steps (crop, retouch)
    // match the "final visually oriented" space.
    let pipeline = sharp(sourcePath, { failOnError: false }).withMetadata();
    const rotVal = (edits.rotate || 0) + (edits.straighten || 0);
    if (rotVal !== 0) {
      pipeline = pipeline.rotate(rotVal);
    }

    // Get metadata after rotation to know new dimensions
    const intermediateBuffer = await pipeline.toBuffer();
    let metadata = await sharp(intermediateBuffer).metadata();
    let currentWidth = metadata.width || 0;
    let currentHeight = metadata.height || 0;

    // 2. Retouching (Healing)
    // Applied to the rotated image
    if (edits.retouchActions && edits.retouchActions.length > 0) {
      pipeline = await applyRetouchActions(
        intermediateBuffer,
        edits.retouchActions,
        currentWidth,
        currentHeight,
      );

      // Re-fetch intermediate buffer and metadata after retouching
      const retouchedBuffer = await pipeline.toBuffer();
      pipeline = sharp(retouchedBuffer);
      metadata = await pipeline.metadata();
      currentWidth = metadata.width || 0;
      currentHeight = metadata.height || 0;
    } else {
      pipeline = sharp(intermediateBuffer);
    }

    // 3. Crop (Percentage-based)
    if (edits.crop && typeof edits.crop === "object") {
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
        height: safeH,
      });
    }

    // 4. Global Color Adjustments
    // Rule: Logarithmic Exposure Mapping (Phase 81 Fix)
    // Range -50 to +50 maps to roughly 0.25x to 4x brightness
    const exposure = edits.exposure || 0;
    const exposureFactor = Math.pow(2, exposure / 25);

    // Combine exposure with linear brightness
    const brightnessAdjust =
      exposureFactor * (1.0 + (edits.brightness || 0) / 100.0);
    const saturationAdjust = 1.0 + (edits.saturate || 0) / 100.0;

    if (
      brightnessAdjust !== 1.0 ||
      saturationAdjust !== 1.0 ||
      edits.hueRotate
    ) {
      pipeline = pipeline.modulate({
        brightness: brightnessAdjust,
        saturation: saturationAdjust,
        hue: edits.hueRotate || 0,
      });
    }

    const contrastAdjust = 1.0 + (edits.contrast || 0) / 100.0;
    if (contrastAdjust !== 1.0) {
      // Linear transformation for contrast: (contrast * pixel) + bias
      // bias = (1 - contrast) * 128 / 255 (if using 0-1 range)
      // Sharp linear uses: f(x) = slope * x + intercept
      pipeline = pipeline.linear(contrastAdjust, -(128 * contrastAdjust) + 128);
    }

    // Filter fallbacks (Grayscale, Sepia, etc.)
    if (edits.grayscale) pipeline = pipeline.grayscale();
    if (edits.sepia)
      pipeline = pipeline.recomb([
        [0.3588, 0.7044, 0.1368],
        [0.299, 0.587, 0.114],
        [0.2392, 0.4696, 0.0912],
      ]);
    if (edits.invert) pipeline = pipeline.negate();

    if (edits.soften && edits.soften > 0) {
      pipeline = pipeline.blur(edits.soften / 5.0);
    }
    if (edits.clarity && edits.clarity > 0) {
      pipeline = pipeline.sharpen(edits.clarity / 20.0);
    }

    // 5. Final Output
    if (destPath) {
      await pipeline.jpeg({ quality: 95, mozjpeg: true }).toFile(destPath);
    }

    parentPort!.postMessage({
      success: true,
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[PhotoWorker] Error applying edits:`, err);
    throw err;
  }
}

interface RetouchAction {
  x: number;
  y: number;
  radius: number;
  sourceX: number;
  sourceY: number;
}

/**
 * Applies retouching (healing) actions using Sharp compositions
 */
async function applyRetouchActions(
  imageBuffer: Buffer,
  actions: RetouchAction[],
  width: number,
  height: number,
) {
  // Applying ${actions.length} retouch actions

  // We start with the base image buffer
  let currentBuffer = imageBuffer;

  // Apply retouches sequentially to allow overlaps (matching Canvas behavior)
  for (const action of actions) {
    const { x, y, radius, sourceX, sourceY } = action;
    if (sourceX == null || sourceY == null) continue;

    const patchSize = Math.round(radius * 2);

    // 1. Extract source patch
    // Clamp to image bounds
    const sx = Math.max(
      0,
      Math.min(width - patchSize, Math.round(sourceX - radius)),
    );
    const sy = Math.max(
      0,
      Math.min(height - patchSize, Math.round(sourceY - radius)),
    );

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
      .composite([{ input: mask, blend: "dest-in" }])
      .toBuffer();

    // 4. Composite patch onto target
    const tx = Math.max(0, Math.min(width - patchSize, Math.round(x - radius)));
    const ty = Math.max(
      0,
      Math.min(height - patchSize, Math.round(y - radius)),
    );

    currentBuffer = await sharp(currentBuffer)
      .composite([{ input: featheredPatch, left: tx, top: ty }])
      .toBuffer();
  }

  return sharp(currentBuffer);
}

async function handleWatermarkJob(job: WorkerJob) {
  const { filepath, outputDir, photoId } = job;

  // Phase 32: Skip watermarking for placeholder URLs
  if (filepath.startsWith("http://") || filepath.startsWith("https://") || filepath.includes(":/")) {
    console.warn(`[PhotoWorker] Skipping watermarking for remote/placeholder URL: ${filepath}`);
    parentPort?.postMessage({
      success: true,
      photoId,
      skipped: true,
      wmFilename: filepath // Use remote URL as fallback if supported
    });
    return;
  }

  if (!fs.existsSync(filepath)) {
    throw new Error(`Input file not found: ${filepath}`);
  }

  const wmFilename = `${photoId}_preview_wm.webp`;
  const wmPath = path.join(outputDir, wmFilename);

  const metadata = await sharp(filepath).metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 1200;

  // Calculate output dimensions strictly to match sharp's resize (2K)
  const scale = Math.min(2048 / width, 2048 / height, 1);
  const outWidth = Math.round(width * scale);
  const outHeight = Math.round(height * scale);
  const fontSize = Math.floor(Math.min(outWidth, outHeight) * 0.1);

  const svg = Buffer.from(`
        <svg width="${outWidth}" height="${outHeight}">
            <style>
            .title { fill: rgba(255, 255, 255, 0.3); font-size: ${fontSize}px; font-weight: bold; transform: rotate(-45deg); transform-origin: center; }
            </style>
            <text x="50%" y="50%" text-anchor="middle" class="title">PROOF</text>
        </svg>
    `);

  await sharp(filepath, { failOnError: false })
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .composite([{ input: svg, gravity: "center" }])
    .toFormat("webp", { quality: 80 })
    .toFile(wmPath);

  parentPort?.postMessage({
    success: true,
    photoId,
    wmFilename,
  });
}
