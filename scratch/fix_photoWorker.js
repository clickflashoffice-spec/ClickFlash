const fs = require('fs');

const FILE = 'C:/Users/alamo/Desktop/ClickFlash/apps/master/backend/workers/photoWorker.ts';
let content = fs.readFileSync(FILE, 'utf8');

// Find the end of applyPipelineEdits and the start of handleWatermarkJob
const startIdx = content.indexOf('async function handleApplyEditsJob');
const endIdx = content.indexOf('async function handleWatermarkJob');

const newCode = `async function handleApplyEditsJob(job: WorkerJob) {
  const { sourcePath, destPath, photoId, edits } = job;

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error(\`Source file not found: \${sourcePath}\`);
  }

  let currentBuffer: Buffer | null = null;
  try {
    // 1. Initial Load & Rotation/Straighten
    let pipeline = sharp(sourcePath, { failOn: 'none' }).withMetadata();
    const rotVal = edits ? ((edits.geometry.rotate || 0) + (edits.geometry.straighten || 0)) : 0;
    if (rotVal !== 0) {
      pipeline = pipeline.rotate(rotVal);
    }

    currentBuffer = await pipeline.toBuffer();
    let metadata = await sharp(currentBuffer).metadata();
    let currentWidth = metadata.width || 0;
    let currentHeight = metadata.height || 0;

    // 2. Retouching (Healing)
    if (edits && edits.retouchActions && edits.retouchActions.length > 0) {
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

    // Enforce consistent color management (sRGB transformation)
    pipeline = pipeline.toColorspace('srgb');

    if (edits) {
      // 3. Crop (Percentage-based)
      pipeline = applyPipelineCrop(pipeline, edits.geometry.crop, currentWidth, currentHeight);

      // 4. Global Color Adjustments
      pipeline = applyPipelineEdits(pipeline, edits.color);
    }

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
    const mask = Buffer.from(\`<svg width="\${actualPatchSize}" height="\${actualPatchSize}"><defs><radialGradient id="feather" cx="50%" cy="50%" r="50%"><stop offset="60%" style="stop-color:white;stop-opacity:1" /><stop offset="100%" style="stop-color:white;stop-opacity:0" /></radialGradient></defs><circle cx="\${actualPatchSize / 2}" cy="\${actualPatchSize / 2}" r="\${actualPatchSize / 2}" fill="url(#feather)" /></svg>\`);

    const featheredPatch: Buffer = await sharp(patch).composite([{ input: mask, blend: "dest-in" }]).toBuffer();

    const tx = Math.max(0, Math.min(width - actualPatchSize, Math.round(safeX - safeRadius)));
    const ty = Math.max(0, Math.min(height - actualPatchSize, Math.round(safeY - safeRadius)));

    const nextBuffer: Buffer = await sharp(currentBuffer!).composite([{ input: featheredPatch, left: tx, top: ty }]).toBuffer();
    currentBuffer = nextBuffer;
  }

  return sharp(currentBuffer!);
}

`;

content = content.substring(0, startIdx) + newCode + content.substring(endIdx);
fs.writeFileSync(FILE, content);
console.log('Fixed photoWorker.ts');
