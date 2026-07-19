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
import exifr from "exifr";

import { validateImageMagicNumber } from '../services/validateImage';
import { logger } from '../utils/logger';
import { AutoEditEngine, ImageStats } from '../services/AutoEditEngine';
import { BlurhashService } from '../services/blurhashService';
import { AICullingService } from '../services/aiCullingService';

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
  mimeType?: string;
  sourcePath?: string;
  destPath?: string;
  edits?: any;
  hash?: string;
  overlayPath?: string;
  opacity?: number;
  scale?: number;
  position?: string;
  iccProfilePath?: string;
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
    logger.error(`[PhotoWorker] Error in thread ${threadId}:`, err);
    parentPort!.postMessage({
      success: false,
      photoId: job.photoId,
      error: `Photo processing failed: ${err.message}`,
    });
  }
});

/**
 * Phase 4: Aggressive format-specific compression for Master Kiosk ingestion.
 * Reduces disk footprint and network bandwidth while maintaining perceptual quality.
 */
function applyFormatCompression(pipeline: sharp.Sharp, ext: string, mode: 'highres' | 'preview' | 'thumb'): sharp.Sharp {
  const normalizedExt = ext.toLowerCase();
  if (normalizedExt === '.jpg' || normalizedExt === '.jpeg') {
    if (mode === 'highres') {
      return pipeline.jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' });
    } else if (mode === 'preview') {
      return pipeline.jpeg({ quality: 82, mozjpeg: true });
    } else {
      return pipeline.jpeg({ quality: 78, mozjpeg: true });
    }
  } else if (normalizedExt === '.webp') {
    return pipeline.webp({ quality: mode === 'highres' ? 88 : 80, effort: 4 });
  } else if (normalizedExt === '.png') {
    return pipeline.png({ compressionLevel: 8, effort: 4 });
  }
  return pipeline;
}

async function handleProcessJob(job: WorkerJob) {
  const { filepath, outputDir, photoId, ext, mimeType, iccProfilePath } = job;
  // Processing ${photoId} from ${filepath}

  // Phase 32: Skip processing for placeholder URLs
  if (filepath.startsWith("http://") || filepath.startsWith("https://") || filepath.includes(":/")) {
    logger.warn(`[PhotoWorker] Skipping processing for remote/placeholder URL: ${filepath}`);
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

  // P13: Decouple HI-RES processing (Stripping & Correction) from main thread
  // Defined here so it's accessible in both the happy-path and the corrupt-JPEG repair path.
  const strippedHighResFilename = `${photoId}_highres${ext}`;
  const strippedHighResPath = path.join(outputDir, strippedHighResFilename);

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

    let entaggedBarcode: string | null = null;
    try {
        const exifData = await (exifr.parse as any)(filepath, { userComment: true, ImageDescription: true });
        if (exifData) {
            const possibleTags = [exifData.ImageDescription, exifData.UserComment, exifData.DocumentName];
            for (const tag of possibleTags) {
                if (typeof tag === 'string' && tag.trim().length > 0) {
                    entaggedBarcode = tag.trim();
                    break;
                }
            }
        }
    } catch (e) {
        logger.warn(`[PhotoWorker] Failed to parse EXIF for ${photoId}`);
    }

    // AI-Enhanced Analytics: Local Heuristic Image Auditing
    const quality_flags: string[] = [];
    let imageStats: ImageStats | null = null;
    
    try {
      const stats = await imageInstance.stats();
      if (stats && stats.channels && stats.channels.length >= 3) {
        const r = stats.channels[0];
        const g = stats.channels[1];
        const b = stats.channels[2];
        const luminance = 0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean;
        const contrast = (r.stdev + g.stdev + b.stdev) / 3;
        
        imageStats = { luminance, contrast, rMean: r.mean, gMean: g.mean, bMean: b.mean };
        
        if (luminance < 30) quality_flags.push("Dark");
        else if (luminance > 225) quality_flags.push("Overexposed");
        if (contrast < 20) quality_flags.push("Flat");
      }

      // 🧠 Run Deep Learning Quality Assessment
      // Requires raw RGB buffer, which we approximate with sharp() buffer
      const bufferForAI = await sharp(filepath, { failOnError: false }).resize(224, 224, { fit: 'inside' }).toBuffer();
      const aiScores = await AICullingService.evaluateImage(bufferForAI, 224, 224);
      
      if (aiScores.blurScore > 0.8) quality_flags.push("Blurred");
      else if (aiScores.blurScore < 0.2) quality_flags.push("Sharp");
      
      if (aiScores.closedEyesCount > 0) quality_flags.push("Closed Eyes");
      if (aiScores.faceCount === 0) quality_flags.push("No Faces");

    } catch {
      logger.warn(`[PhotoWorker] Failed to compute stats/AI culling for ${photoId}`);
    }

    let autoEdits: any = null;
    if (imageStats) {
      try {
        autoEdits = AutoEditEngine.computeHeuristics(imageStats);
        const crop = await AutoEditEngine.smartCrop(filepath);
        if (crop) {
          autoEdits.crop = crop;
        }
      } catch (err) {
        logger.warn(`[PhotoWorker] Failed to compute auto edits for ${photoId}`, err);
      }
    }

    const promises: Promise<any>[] = [
      // 1. Generate High-Res (Stripped & Corrected orientation & optional ICC)
      applyFormatCompression(
        sharp(filepath, { failOnError: false })
          .rotate()
          .withMetadata(
             iccProfilePath && fs.existsSync(iccProfilePath)
             ? { icc: iccProfilePath, exif: Buffer.alloc(0) } as any
             : { exif: Buffer.alloc(0) } as any
          ),
        ext,
        'highres'
      ).toFile(strippedHighResPath),

      // 2. Generate Assets
      applyFormatCompression(
        sharp(filepath, { failOnError: false })
          .resize(400, 400, { fit: "inside", withoutEnlargement: true }),
        ext,
        'thumb'
      ).toFile(thumbnailPath),
      applyFormatCompression(
        sharp(filepath, { failOnError: false })
          .resize(2048, 2048, { fit: "inside", withoutEnlargement: true }),
        ext,
        'preview'
      ).toFile(previewPath),
      sharp(filepath, { failOnError: false })
        .resize(100, 100, { fit: "inside", withoutEnlargement: true })
        .toFormat("webp", { quality: 80 })
        .toFile(tinyPath),
    ];

    if (autoEdits && Object.keys(autoEdits).length > 0) {
      const previewEditedFilename = `${photoId}_preview_edited.jpg`;
      const previewEditedPath = path.join(outputDir, previewEditedFilename);
      const highresEditedFilename = `${photoId}_highres_edited.jpg`;
      const highresEditedPath = path.join(outputDir, highresEditedFilename);
      
      // Calculate true dimensions after rotation
      let currentWidth = metadata.width || 0;
      let currentHeight = metadata.height || 0;
      if (orientation >= 5 && orientation <= 8) {
          currentWidth = metadata.height || 0;
          currentHeight = metadata.width || 0;
      }
      
      let baseEditedPipeline = sharp(filepath, { failOnError: false }).rotate();
      baseEditedPipeline = applyPipelineCrop(baseEditedPipeline, autoEdits.crop, currentWidth, currentHeight);
      baseEditedPipeline = applyPipelineEdits(baseEditedPipeline, autoEdits);
      
      promises.push(applyFormatCompression(baseEditedPipeline.clone().resize(2048, 2048, { fit: "inside", withoutEnlargement: true }), '.jpg', 'preview').toFile(previewEditedPath));
      promises.push(applyFormatCompression(baseEditedPipeline.clone(), '.jpg', 'highres').toFile(highresEditedPath));
    }

    const [blurhash] = await Promise.all([
      BlurhashService.generateBlurhash(filepath),
      Promise.all(promises)
    ]);


    parentPort!.postMessage({
      success: true,
      photoId,
      hash: fileHash,
      entaggedBarcode,
      blurhash: blurhash || undefined,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        orientation: orientation,
      },
      quality_flags,
      autoEdits,
      assets: {
        highres: strippedHighResFilename,
        thumbnail: thumbnailFilename,
        preview: previewFilename,
        tiny: tinyFilename,
        ...(autoEdits && Object.keys(autoEdits).length > 0 ? {
          previewEdited: `${photoId}_preview_edited.jpg`,
          highresEdited: `${photoId}_highres_edited.jpg`,
        } : {})
      },
    });
  } catch (error) {
    const err = error as Error;
    // Hardening: Handle Corrupt JPEGs gracefully
    if (err.message && (err.message.includes("Corrupt JPEG") || err.message.includes("premature end of JPEG"))) {
      try {
        logger.warn(`[PhotoWorker] Corrupt/Partial JPEG detected for ${photoId}. Attempting aggressive repair...`);
        let buffer: Buffer | null = fs.readFileSync(filepath);

        const [blurhash, repairMetadata] = await Promise.all([
          BlurhashService.generateBlurhash(buffer),
          Promise.all([
            applyFormatCompression(
              sharp(buffer, { failOnError: false }).rotate().withMetadata(
                  job.iccProfilePath && fs.existsSync(job.iccProfilePath)
                  ? { icc: job.iccProfilePath, exif: Buffer.alloc(0) } as any
                  : { exif: Buffer.alloc(0) } as any
              ),
              job.ext || '.jpg',
              'highres'
            ).toFile(strippedHighResPath),
            applyFormatCompression(
              sharp(buffer, { failOnError: false }).resize(400, 400, { fit: "inside", withoutEnlargement: true }),
              job.ext || '.jpg',
              'thumb'
            ).toFile(thumbnailPath),
            applyFormatCompression(
              sharp(buffer, { failOnError: false }).resize(2048, 2048, { fit: "inside", withoutEnlargement: true }),
              job.ext || '.jpg',
              'preview'
            ).toFile(previewPath),
            sharp(buffer, { failOnError: false }).resize(100, 100, { fit: "inside", withoutEnlargement: true }).toFormat("webp", { quality: 80, effort: 4 }).toFile(tinyPath),
          ]).then(() => sharp(buffer!, { failOnError: false }).metadata())
        ]);

        parentPort!.postMessage({
          success: true,
          photoId,
          hash: job.hash || `repair-${crypto.createHash("md5").update(buffer.slice(0, 1024)).digest("hex")}`,
          blurhash: blurhash || undefined,
          metadata: {
            width: repairMetadata.width || 0,
            height: repairMetadata.height || 0,
            format: repairMetadata.format,
            size: buffer.length,
            orientation: repairMetadata.orientation || 1,
          },
          quality_flags: [],
          assets: { highres: strippedHighResFilename, thumbnail: thumbnailFilename, preview: previewFilename, tiny: tinyFilename },
          warning: "Recovered from corruption/partial data",
        });
        buffer = null; // Memory management: Clear large buffer
        return;
      } catch (fallbackError) {
        logger.error(`[PhotoWorker] Aggressive repair failed for ${photoId}`);
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

function applyPipelineCrop(pipeline: sharp.Sharp, crop: any, currentWidth: number, currentHeight: number): sharp.Sharp {
    if (crop && typeof crop === "object") {
      const { x, y, width, height } = crop;
      const safeLeft = Math.max(0, Math.min(currentWidth - 1, Math.round((x / 100) * currentWidth)));
      const safeTop = Math.max(0, Math.min(currentHeight - 1, Math.round((y / 100) * currentHeight)));
      const safeW = Math.max(1, Math.min(currentWidth - safeLeft, Math.round((width / 100) * currentWidth)));
      const safeH = Math.max(1, Math.min(currentHeight - safeTop, Math.round((height / 100) * currentHeight)));

      return pipeline.extract({ left: safeLeft, top: safeTop, width: safeW, height: safeH });
    }
    return pipeline;
}

function applyPipelineEdits(pipeline: sharp.Sharp, edits: Record<string, any>): sharp.Sharp {
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
    
    return pipeline;
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
    pipeline = applyPipelineCrop(pipeline, edits.crop, currentWidth, currentHeight);

    // 4. Global Color Adjustments
    pipeline = applyPipelineEdits(pipeline, edits);

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
  const { filepath, outputDir, photoId, overlayPath, opacity, scale, position } = job;

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

  const baseScale = Math.min(2048 / width, 2048 / height, 1);
  const outWidth = Math.round(width * baseScale);
  const outHeight = Math.round(height * baseScale);
  
  let compositeInput: string | Buffer;
  let gravity = position || "center";

  // Map our DB position strings to sharp gravity
  const gravityMap: Record<string, string> = {
    'center': 'center',
    'top-left': 'northwest',
    'top-right': 'northeast',
    'bottom-left': 'southwest',
    'bottom-right': 'southeast'
  };
  gravity = gravityMap[gravity] || "center";

  if (overlayPath && fs.existsSync(overlayPath)) {
    // Dynamic Watermark
    const overlayScale = scale || 1.0;
    const overlayOpacity = opacity !== undefined ? opacity : 1.0;
    
    // We resize the overlay relative to the base image size.
    // E.g., scale=1.0 means the overlay takes up 30% of the image's min dimension.
    const targetOverlayWidth = Math.max(1, Math.round((Math.min(outWidth, outHeight) * 0.3) * overlayScale));
    
    let overlayBuffer = await sharp(overlayPath)
      .resize({ width: targetOverlayWidth, withoutEnlargement: true })
      .toBuffer();
      
    if (overlayOpacity < 1.0) {
      // Apply opacity using SVG trick since sharp composite doesn't have an opacity flag
      const overlayMeta = await sharp(overlayBuffer).metadata();
      const ow = overlayMeta.width || targetOverlayWidth;
      const oh = overlayMeta.height || targetOverlayWidth;
      const overlayBase64 = overlayBuffer.toString('base64');
      const format = overlayMeta.format || 'png';
      
      const svg = Buffer.from(`
        <svg width="${ow}" height="${oh}">
          <image href="data:image/${format};base64,${overlayBase64}" width="${ow}" height="${oh}" opacity="${overlayOpacity}" />
        </svg>
      `);
      overlayBuffer = svg;
    }
    compositeInput = overlayBuffer;
  } else {
    // Fallback static PROOF watermark
    const fontSize = Math.floor(Math.min(outWidth, outHeight) * 0.1);
    compositeInput = Buffer.from(`
      <svg width="${outWidth}" height="${outHeight}">
        <style>.title { fill: rgba(255, 255, 255, 0.3); font-size: ${fontSize}px; font-weight: bold; transform: rotate(-45deg); transform-origin: center; }</style>
        <text x="50%" y="50%" text-anchor="middle" class="title">PROOF</text>
      </svg>
    `);
    gravity = "center";
  }

  await sharp(filepath, { failOnError: false })
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .composite([{ input: compositeInput, gravity: gravity }])
    .toFormat("webp", { quality: 80 })
    .toFile(wmPath);

  parentPort!.postMessage({ success: true, photoId, assets: { previewWatermarked: wmFilename } });
}
