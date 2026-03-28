import path from "path";
import fs from "fs";
import { createCanvas, Image } from "@napi-rs/canvas";
import { Logger } from "../shared/logger";
import DatabaseManager from "../shared/db";
import { UPLOAD_DIR } from "../config/constants";

// Local definition to avoid cross-layer import issues in backend
export interface Annotation {
  id: string;
  type: "brush" | "text" | "shape";
  points?: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  opacity: number;
  text?: string;
  rect?: { x: number; y: number; w: number; h: number };
}

export interface RetouchAction {
  id: string;
  type: "heal" | "clone";
  x: number;
  y: number;
  radius: number;
  sourceX?: number;
  sourceY?: number;
  timestamp: number;
}

export interface ManualEdits {
  exposure?: number;
  contrast?: number;
  highlights?: number;
  shadows?: number;
  saturate?: number;
  vibrance?: number;
  grayscale?: number;
  sepia?: number;
  invert?: number;
  hueRotate?: number;
  temperature?: number;
  tint?: number;
  whites?: number;
  blacks?: number;
  soften?: number;
  rotate?: number;
  straighten?: number;
  vignette?: number;
  retouchActions?: RetouchAction[];
  annotations?: Annotation[];
}

interface ExportItem {
  photoId: string;
  edits: ManualEdits;
  filename?: string;
}

interface ExportOptions {
  format: "image/jpeg" | "image/png";
  quality: number;
}

export class ExportService {
  private logger: Logger;
  private dbManager: DatabaseManager;

  constructor(logger: Logger, dbManager: DatabaseManager) {
    this.logger = logger;
    this.dbManager = dbManager;
  }

  /**
   * Processes a batch of photos with edits and saves them to a target directory.
   * Adheres to Law 14: No browser-side generation.
   */
  public async exportBatch(
    items: ExportItem[],
    targetDir: string,
    options: ExportOptions = { format: "image/jpeg", quality: 90 },
  ): Promise<{ success: boolean; exportedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let exportedCount = 0;

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
      } catch (e: any) {
        throw new Error(`Failed to create target directory: ${e.message}`);
      }
    }

    for (const item of items) {
      try {
        const photo = this.dbManager.get<{ url: string; albumId: string }>(
          "SELECT url, albumId FROM photos WHERE id = ?",
          [item.photoId],
        );

        if (!photo) {
          errors.push(`Photo ${item.photoId} not found in database`);
          continue;
        }

        // Determine source path (Pillar 2: Local Processing + Law 12)
        // Check for Original (High-Res) first, then processed
        const possiblePaths = [
          path.join(
            UPLOAD_DIR,
            photo.albumId,
            "highres",
            path.basename(photo.url),
          ),
          path.join(UPLOAD_DIR, photo.url),
        ];

        let sourcePath = "";
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            sourcePath = p;
            break;
          }
        }

        if (!sourcePath) {
          errors.push(`File for photo ${item.photoId} not found on disk`);
          continue;
        }

        // Load Image
        const imgData = fs.readFileSync(sourcePath);
        const image = new Image();
        image.src = imgData;

        // Create Canvas
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");

        // Apply Filters (Replicating CanvasFilterEngine logic)
        // Note: ctx is cast to any to avoid strict @napi-rs type issues in this environment
        (ctx as any).drawImage(image, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        this.processPixels(data, item.edits);
        ctx.putImageData(imageData, 0, 0);

        // 8. Vignette (Over filtered pixels)
        if (item.edits.vignette && item.edits.vignette > 0) {
          this.applyVignette(
            ctx,
            canvas.width,
            canvas.height,
            item.edits.vignette,
          );
        }

        // 9. Retouch (Heal/Clone)
        if (item.edits.retouchActions && item.edits.retouchActions.length > 0) {
          this.processRetouch(
            ctx,
            canvas,
            item.edits.retouchActions,
            image.width,
            image.height,
          );
        }

        // 10. Annotations (Brush, Text, Shape)
        if (item.edits.annotations && item.edits.annotations.length > 0) {
          this.processAnnotations(
            ctx,
            canvas,
            item.edits.annotations,
            image.width,
            image.height,
          );
        }

        // Save Result
        const outFilename =
          item.filename || `export_${item.photoId}_${Date.now()}.jpg`;
        const outPath = path.join(targetDir, outFilename);

        // Correct encoding for @napi-rs/canvas
        const format = options.format === "image/png" ? "png" : "jpeg";
        const buffer = await (canvas as any).encode(format, options.quality);

        fs.writeFileSync(outPath, buffer);
        exportedCount++;
      } catch (err: any) {
        this.logger.error(`Export failed for photo ${item.photoId}`, {
          error: err.message,
        });
        errors.push(`Photo ${item.photoId}: ${err.message}`);
      }
    }

    return {
      success: exportedCount > 0,
      exportedCount,
      errors,
    };
  }

  private processPixels(data: Uint8ClampedArray, edits: ManualEdits) {
    const exposure = (edits.exposure ?? 0) / 100;
    const contrast = (edits.contrast ?? 0) / 100;
    const grayscale = (edits.grayscale ?? 0) / 100;
    const sepia = (edits.sepia ?? 0) / 100;
    const temperature = (edits.temperature ?? 0) / 100;
    const tint = (edits.tint ?? 0) / 100;
    const highlights = (edits.highlights ?? 0) / 100;
    const shadows = (edits.shadows ?? 0) / 100;
    const vibrance = (edits.vibrance ?? 0) / 100;

    // Temperature/Tint pre-calcs
    const tempR = temperature > 0 ? temperature * 20 : 0;
    const tempB = temperature < 0 ? -temperature * 20 : 0;
    const tintG = tint < 0 ? -tint * 15 : 0;
    const tintM = tint > 0 ? tint * 15 : 0;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 1. Temperature & Tint
      if (temperature !== 0 || tint !== 0) {
        r = Math.min(255, Math.max(0, r + tempR + tintM));
        g = Math.min(255, Math.max(0, g - tintG));
        b = Math.min(255, Math.max(0, b + tempB + tintM));
      }

      // 2. Exposure
      if (exposure !== 0) {
        const factor = 1 + exposure;
        r *= factor;
        g *= factor;
        b *= factor;
      }

      // 3. Contrast
      if (contrast !== 0) {
        const factor =
          (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }

      // 4. Highlights & Shadows
      if (highlights !== 0 || shadows !== 0) {
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        if (luminance > 0.5 && highlights !== 0) {
          const factor = 1 + highlights * (luminance - 0.5) * 2;
          r *= factor;
          g *= factor;
          b *= factor;
        } else if (luminance < 0.5 && shadows !== 0) {
          const adjustment = shadows * (0.5 - luminance) * 2 * 255;
          r += adjustment;
          g += adjustment;
          b += adjustment;
        }
      }

      // 5. Vibrance
      if (vibrance !== 0) {
        const max = Math.max(r, g, b);
        const avg = (r + g + b) / 3;
        const amt = ((Math.abs(max - avg) * 2) / 255) * vibrance;
        r += (r - avg) * amt;
        g += (g - avg) * amt;
        b += (b - avg) * amt;
      }

      // 6. Grayscale
      if (grayscale > 0) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = r * (1 - grayscale) + gray * grayscale;
        g = g * (1 - grayscale) + gray * grayscale;
        b = b * (1 - grayscale) + gray * grayscale;
      }

      // 7. Sepia
      if (sepia > 0) {
        const sr = r * 0.393 + g * 0.769 + b * 0.189;
        const sg = r * 0.349 + g * 0.686 + b * 0.168;
        const sb = r * 0.272 + g * 0.534 + b * 0.131;
        r = r * (1 - sepia) + sr * sepia;
        g = g * (1 - sepia) + sg * sepia;
        b = b * (1 - sepia) + sb * sepia;
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
  }

  private applyVignette(
    ctx: any,
    width: number,
    height: number,
    vignette: number,
  ) {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      maxDist * 0.4,
      centerX,
      centerY,
      maxDist,
    );

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);

    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  }

  private processRetouch(
    ctx: any,
    canvas: any,
    actions: RetouchAction[],
    naturalWidth: number,
    naturalHeight: number,
  ) {
    // Create a temporary buffer canvas to sample from the current state
    const bufferCanvas = createCanvas(canvas.width, canvas.height);
    const bufferCtx = bufferCanvas.getContext("2d");
    bufferCtx.drawImage(canvas, 0, 0);

    actions.forEach((action) => {
      this.heal(ctx, bufferCanvas, action, naturalWidth, naturalHeight);
    });
  }

  private heal(
    ctx: any,
    bufferCanvas: any,
    action: RetouchAction,
    naturalWidth: number,
    naturalHeight: number,
  ) {
    const { x, y, radius, sourceX, sourceY } = action;
    if (sourceX === undefined || sourceY === undefined) return;

    const scaleX = ctx.canvas.width / naturalWidth;
    const scaleY = ctx.canvas.height / naturalHeight;

    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    const canvasSourceX = sourceX * scaleX;
    const canvasSourceY = sourceY * scaleY;
    const canvasRadius = radius * Math.min(scaleX, scaleY);

    const patchSize = canvasRadius * 2;
    const sx = canvasSourceX - canvasRadius;
    const sy = canvasSourceY - canvasRadius;
    const tx = canvasX - canvasRadius;
    const ty = canvasY - canvasRadius;

    // Create patch canvas
    const patchCanvas = createCanvas(patchSize, patchSize);
    const patchCtx = patchCanvas.getContext("2d");

    // Draw source area from buffer
    patchCtx.drawImage(
      bufferCanvas,
      sx,
      sy,
      patchSize,
      patchSize,
      0,
      0,
      patchSize,
      patchSize,
    );

    // Apply radial mask for seamless transition
    patchCtx.globalCompositeOperation = "destination-in";
    const gradient = patchCtx.createRadialGradient(
      canvasRadius,
      canvasRadius,
      0,
      canvasRadius,
      canvasRadius,
      canvasRadius,
    );
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.5, "rgba(0,0,0,1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    patchCtx.fillStyle = gradient;
    patchCtx.fillRect(0, 0, patchSize, patchSize);

    // Composite back to main canvas
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(patchCanvas, tx, ty);
  }

  private processAnnotations(
    ctx: any,
    _canvas: any,
    annotations: Annotation[],
    naturalWidth: number,
    naturalHeight: number,
  ) {
    annotations.forEach((anno) => {
      switch (anno.type) {
        case "brush":
          this.drawBrush(ctx, anno, naturalWidth, naturalHeight);
          break;
        case "text":
          this.drawText(ctx, anno, naturalWidth, naturalHeight);
          break;
        case "shape":
          this.drawShape(ctx, anno, naturalWidth, naturalHeight);
          break;
      }
    });
  }

  private drawBrush(
    ctx: any,
    anno: Annotation,
    naturalWidth: number,
    naturalHeight: number,
  ) {
    if (!anno.points || anno.points.length < 2) return;

    const scaleX = ctx.canvas.width / naturalWidth;
    const scaleY = ctx.canvas.height / naturalHeight;

    ctx.save();
    ctx.strokeStyle = anno.color;
    ctx.lineWidth = anno.width * Math.min(scaleX, scaleY);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = anno.opacity;

    ctx.beginPath();
    ctx.moveTo(anno.points[0].x * scaleX, anno.points[0].y * scaleY);

    for (let i = 1; i < anno.points.length; i++) {
      ctx.lineTo(anno.points[i].x * scaleX, anno.points[i].y * scaleY);
    }

    ctx.stroke();
    ctx.restore();
  }

  private drawText(
    ctx: any,
    anno: Annotation,
    naturalWidth: number,
    naturalHeight: number,
  ) {
    if (!anno.text || !anno.rect) return;

    const scaleX = ctx.canvas.width / naturalWidth;
    const scaleY = ctx.canvas.height / naturalHeight;

    ctx.save();
    ctx.fillStyle = anno.color;
    ctx.globalAlpha = anno.opacity;

    // Simple font handling for backend
    const fontSize = (anno.width || 20) * Math.min(scaleX, scaleY);
    ctx.font = `${fontSize}px Arial`;

    ctx.fillText(
      anno.text,
      anno.rect.x * scaleX,
      (anno.rect.y + anno.rect.h) * scaleY,
    );
    ctx.restore();
  }

  private drawShape(
    ctx: any,
    anno: Annotation,
    naturalWidth: number,
    naturalHeight: number,
  ) {
    if (!anno.rect) return;

    const scaleX = ctx.canvas.width / naturalWidth;
    const scaleY = ctx.canvas.height / naturalHeight;

    ctx.save();
    ctx.strokeStyle = anno.color;
    ctx.lineWidth = anno.width * Math.min(scaleX, scaleY);
    ctx.globalAlpha = anno.opacity;

    ctx.strokeRect(
      anno.rect.x * scaleX,
      anno.rect.y * scaleY,
      anno.rect.w * scaleX,
      anno.rect.h * scaleY,
    );
    ctx.restore();
  }
}
