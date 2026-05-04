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
  type?: "process" | "apply-edits" | "watermark" | "ping";
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
    if (job.type === "ping") {
      parentPort!.postMessage("pong");
      return;
    }
    
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
      photoId: job.photoId,
      error: `Photo processing failed: ${err.message}`,
    });
  }
});

async function handleProcessJob(job: WorkerJob) {
  const { filepath, outputDir, photoId, ext, mimeType } = job;
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

  // Two-layer validation: magic bytes + sharp header parse (catches polyglots)
  const isValidMagicNumber = await validateImageMagicNumber(filepath, mimeType as string | undefined);
  if (!isValidMagicNumber) {
    throw new Error(
      `SECURITY_VIOLATION: Invalid file signature (Magic Number mismatch) for photo ${photoId}`,
    );
  }

  // 3. Generate Assets (Thumbnail, Preview, Tiny)
  const thumbnailFilename = `${photoId}_thumb${ext}`;
  const previewFilename = `${photoId}_preview${ext}`;
  const tinyFilename = `${photoId}_tiny.webp`;

  const thumbnailPath = path.join(outputDir, thumbnailFilename);
  const previewPath = path.join(outputDir, previewFilename);
  const tinyPath = path.join(outputDir, tinyFilename);

  let imageInstance = sharp(filepath, { failOnError: false });
  try {
    // 1. Calculate Hash (Stream-based) - Low Memory Footprint
    const fileHash = await new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filepath);
      stream.on("error", (err: Error) => reject(err));
      stream.on("data", (chunk: string | Buffer) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });

    const metadata = await imageInstance.metadata();
    const orientation = metadata.orientation || 1;

    // AI-Enhanced Analytics: Local Heuristic Image Auditing
    const quality_flags: string[] = [];
    try {
      const stats = await imageInstance.stats();
      if (stats && stats.channels && stats.channels.length >= 3) {
        const r = stats.channels[0];
        const g = stats.channels[1];
        const b = stats.channels[2];
        const luminance = 0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean;
        const contrast = (r.stdev + g.stdev + b.stdev) / 3;
        if (luminance < 30) quality_flags.push("Dark");
        else if (luminance > 225) quality_flags.push("Overexposed");
        if (contrast < 20) quality_flags.push("Flat");
      }
    } catch {
      console.warn(`[PhotoWorker] Failed to compute stats for ${photoId}`);
    }

    // P13: Decouple HI-RES processing (Stripping & Correction) from main thread
    const strippedHighResFilename = `${photoId}_highres${ext}`;
    const strippedHighResPath = path.join(outputDir, strippedHighResFilename);

    await Promise.all([
      // 1. Generate High-Res (Stripped & Corrected orientation)
      sharp(filepath, { failOnError: false })
        .rotate()
        .withMetadata({ exif: Buffer.alloc(0) } as any) // Explicitly clear GPS/sensitive EXIF
        .toFile(strippedHighResPath),

      // 2. Generate Assets
      sharp(filepath, { failOnError: false })
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .toFile(thumbnailPath),
      sharp(filepath, { failOnError: false })
        .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(previewPath),
      sharp(filepath, { failOnError: false })
        .resize(100, 100, { fit: "inside", withoutEnlargement: true })
        .toFormat("webp", { quality: 80 })
        .toFile(tinyPath),
    ]);


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
        highres: strippedHighResFilename,
        thumbnail: thumbnailFilename,
        preview: previewFilename,
        tiny: tinyFilename,
      },
    });
  } catch (error) {
    const err = error as Error;
    // Hardening: Handle Corrupt JPEGs gracefully
    if (err.message && (err.message.includes("Corrupt JPEG") || err.message.includes("premature end of JPEG"))) {
      try {
        console.warn(`[PhotoWorker] Corrupt/Partial JPEG detected for ${photoId}. Attempting aggressive repair...`);
        let buffer: Buffer | null = fs.readFileSync(filepath);

        await Promise.all([
          sharp(buffer, { failOnError: false }).resize(400, 400, { fit: "inside", withoutEnlargement: true }).toFile(thumbnailPath),
          sharp(buffer, { failOnError: false }).resize(2048, 2048, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toFile(previewPath),
          sharp(buffer, { failOnError: false }).resize(100, 100, { fit: "inside", withoutEnlargement: true }).toFormat("webp", { quality: 80 }).toFile(tinyPath),
        ]);

        const repairMetadata = await sharp(buffer, { failOnError: false }).metadata();

        parentPort!.postMessage({
          success: true,
          photoId,
          hash: job.hash || `repair-${crypto.createHash("md5").update(buffer.slice(0, 1024)).digest("hex")}`,
          metadata: {
            width: repairMetadata.width || 0,
            height: repairMetadata.height || 0,
            format: repairMetadata.format,
            size: buffer.length,
            orientation: repairMetadata.orientation || 1,
          },
          quality_flags: [],
          assets: { thumbnail: thumbnailFilename, preview: previewFilename, tiny: tinyFilename },
          warning: "Recovered from corruption/partial data",
        });
        buffer = null; // Memory management: Clear large buffer
        return;
      } catch (fallbackError) {
        console.error(`[PhotoWorker] Aggressive repair failed for ${photoId}`);
      }
    }
    throw err;
  } finally {
    // GC Cleanup
    (imageInstance as any) = null;
  }
}

const WORKER_EDIT_RANGES: Record<string, [number, number]> = {
  exposure: [-100, 100], contrast: [-100, 100], highlights: [-100, 100],
  shadows: [-100, 100], saturate: [-100, 100], vibrance: [-100, 100],
  grayscale: [0, 100], sepia: [0, 100], invert: [0, 1],
  hueRotate: [-180, 180], temperature: [-100, 100], tint: [-100, 100],
  whites: [-100, 100], blacks: [-100, 100], clarity: [-100, 100],
  soften: [0, 100], sharpen: [0, 100], vignette: [0, 100],
  dropShadow: [0, 100], brightness: [-100, 100],
  rotate: [-360, 360], straighten: [-45, 45],
  perspectiveX: [-50, 50], perspectiveY: [-50, 50],
};

function clampEdits(raw: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...raw };
  for (const [key, [lo, hi]] of Object.entries(WORKER_EDIT_RANGES)) {
    if (key in out) {
      const n = Number(out[key]);
      out[key] = isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
    }
  }
  return out;
}

async function handleApplyEditsJob(job: WorkerJob) {
  const { sourcePath, destPath, photoId } = job;
  const edits = clampEdits(job.edits || {});

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  let currentBuffer: Buffer | null = null;
  try {
    // 1. Initial Load & Rotation/Straighten
    let pipeline = sharp(sourcePath, { failOnError: false }).withMetadata();
    const rotVal = (edits.rotate || 0) + (edits.straighten || 0);
    if (rotVal !== 0) {
      pipeline = pipeline.rotate(rotVal);
    }

    currentBuffer = await pipeline.toBuffer();
    let metadata = await sharp(currentBuffer).metadata();
    let currentWidth = metadata.width || 0;
    let currentHeight = metadata.height || 0;

    // 2. Retouching (Healing)
    if (edits.retouchActions && edits.retouchActions.length > 0) {
      const retouchedImage = await applyRetouchActions(
        currentBuffer,
        edits.retouchActions,
        currentWidth,
        currentHeight,
      );
      currentBuffer = null; // Clean up previous buffer
      currentBuffer = await retouchedImage.toBuffer();
      metadata = await sharp(currentBuffer).metadata();
      currentWidth = metadata.width || 0;
      currentHeight = metadata.height || 0;
    }

    // Reuse buffer for final pipeline
    pipeline = sharp(currentBuffer);

    // 3. Crop (Percentage-based)
    if (edits.crop && typeof edits.crop === "object") {
      const { x, y, width, height } = edits.crop;
      const safeLeft = Math.max(0, Math.min(currentWidth - 1, Math.round((x / 100) * currentWidth)));
      const safeTop = Math.max(0, Math.min(currentHeight - 1, Math.round((y / 100) * currentHeight)));
      const safeW = Math.max(1, Math.min(currentWidth - safeLeft, Math.round((width / 100) * currentWidth)));
      const safeH = Math.max(1, Math.min(currentHeight - safeTop, Math.round((height / 100) * currentHeight)));

      pipeline = pipeline.extract({ left: safeLeft, top: safeTop, width: safeW, height: safeH });
    }

    // 4. Global Color Adjustments
    const exposureFactor = Math.pow(2, (edits.exposure || 0) / 25);
    const brightnessAdjust = exposureFactor * (1.0 + (edits.brightness || 0) / 100.0);
    const saturationAdjust = 1.0 + (edits.saturate || 0) / 100.0;

    if (brightnessAdjust !== 1.0 || saturationAdjust !== 1.0 || edits.hueRotate) {
      pipeline = pipeline.modulate({
        brightness: brightnessAdjust,
        saturation: saturationAdjust,
        hue: edits.hueRotate || 0,
      });
    }

    const contrastAdjust = 1.0 + (edits.contrast || 0) / 100.0;
    if (contrastAdjust !== 1.0) {
      pipeline = pipeline.linear(contrastAdjust, -(128 * contrastAdjust) + 128);
    }

    if (edits.grayscale) pipeline = pipeline.grayscale();
    if (edits.sepia) pipeline = pipeline.recomb([[0.3588, 0.7044, 0.1368], [0.299, 0.587, 0.114], [0.2392, 0.4696, 0.0912]]);
    if (edits.invert) pipeline = pipeline.negate();
    if (edits.soften && edits.soften > 0) pipeline = pipeline.blur(edits.soften / 5.0);
    if (edits.clarity && edits.clarity > 0) pipeline = pipeline.sharpen(edits.clarity / 20.0);

    // 5. Final Output
    if (destPath) {
      await pipeline.jpeg({ quality: 95, mozjpeg: true }).toFile(destPath);
    }

    parentPort!.postMessage({ success: true, photoId });
  } finally {
    currentBuffer = null; // Memory management: Clear large buffer
  }
}

interface RetouchAction {
  x: number;
  y: number;
  radius: number;
  sourceX: number;
  sourceY: number;
}

async function applyRetouchActions(
  imageBuffer: Buffer,
  actions: RetouchAction[],
  width: number,
  height: number,
) {
  let currentBuffer: Buffer | null = imageBuffer;

  for (const action of actions) {
    const rawRadius = Number(action.radius);
    const rawX = Number(action.x);
    const rawY = Number(action.y);
    const rawSX = Number(action.sourceX);
    const rawSY = Number(action.sourceY);

    if (!isFinite(rawRadius) || !isFinite(rawX) || !isFinite(rawY) || !isFinite(rawSX) || !isFinite(rawSY)) continue;

    const maxRadius = Math.floor(Math.min(width, height) / 4);
    const safeRadius = Math.max(2, Math.min(maxRadius, rawRadius));
    const safeX = Math.max(0, Math.min(width, rawX));
    const safeY = Math.max(0, Math.min(height, rawY));
    const safeSourceX = Math.max(0, Math.min(width, rawSX));
    const safeSourceY = Math.max(0, Math.min(height, rawSY));

    const patchSize = Math.round(safeRadius * 2);
    if (patchSize < 2) continue;

    const sx = Math.max(0, Math.min(width - patchSize, Math.round(safeSourceX - safeRadius)));
    const sy = Math.max(0, Math.min(height - patchSize, Math.round(safeSourceY - safeRadius)));
    const actualPatchSize = Math.min(patchSize, width - sx, height - sy);
    if (actualPatchSize <= 0) continue;

    const patch: Buffer = await sharp(currentBuffer!).extract({ left: sx, top: sy, width: actualPatchSize, height: actualPatchSize }).toBuffer();
    const mask = Buffer.from(`<svg width="${actualPatchSize}" height="${actualPatchSize}"><defs><radialGradient id="feather" cx="50%" cy="50%" r="50%"><stop offset="60%" style="stop-color:white;stop-opacity:1" /><stop offset="100%" style="stop-color:white;stop-opacity:0" /></radialGradient></defs><circle cx="${actualPatchSize / 2}" cy="${actualPatchSize / 2}" r="${actualPatchSize / 2}" fill="url(#feather)" /></svg>`);

    const featheredPatch: Buffer = await sharp(patch).composite([{ input: mask, blend: "dest-in" }]).toBuffer();

    const tx = Math.max(0, Math.min(width - actualPatchSize, Math.round(safeX - safeRadius)));
    const ty = Math.max(0, Math.min(height - actualPatchSize, Math.round(safeY - safeRadius)));

    const nextBuffer: Buffer = await sharp(currentBuffer!).composite([{ input: featheredPatch, left: tx, top: ty }]).toBuffer();
    currentBuffer = nextBuffer;
  }

  return sharp(currentBuffer!);
}

async function handleWatermarkJob(job: WorkerJob) {
  const { filepath, outputDir, photoId } = job;

  if (filepath.startsWith("http://") || filepath.startsWith("https://") || filepath.includes(":/")) {
    parentPort?.postMessage({ success: true, photoId, skipped: true, wmFilename: filepath });
    return;
  }

  if (!fs.existsSync(filepath)) throw new Error(`Input file not found: ${filepath}`);

  const wmFilename = `${photoId}_preview_wm.webp`;
  const wmPath = path.join(outputDir, wmFilename);

  const metadata = await sharp(filepath).metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 1200;

  const scale = Math.min(2048 / width, 2048 / height, 1);
  const outWidth = Math.round(width * scale);
  const outHeight = Math.round(height * scale);
  const fontSize = Math.floor(Math.min(outWidth, outHeight) * 0.1);

  const svg = Buffer.from(`
    <svg width="${outWidth}" height="${outHeight}">
      <style>.title { fill: rgba(255, 255, 255, 0.3); font-size: ${fontSize}px; font-weight: bold; transform: rotate(-45deg); transform-origin: center; }</style>
      <text x="50%" y="50%" text-anchor="middle" class="title">PROOF</text>
    </svg>
  `);

  await sharp(filepath, { failOnError: false })
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .composite([{ input: svg, gravity: "center" }])
    .toFormat("webp", { quality: 80 })
    .toFile(wmPath);

  parentPort!.postMessage({ success: true, photoId, assets: { previewWatermarked: wmFilename } });
}
