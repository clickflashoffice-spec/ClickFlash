import { ManualEdits } from "../../../../types";

/**
 * Canvas-based filter engine for applying filters at the pixel level
 * Used for exporting images with filters applied
 */
export class CanvasFilterEngine {
  private bufferCanvas: HTMLCanvasElement | OffscreenCanvas;
  private bufferCtx:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    this.ctx = ctx;

    // Initialize buffer canvas for retouch sampling (Prefer OffscreenCanvas for performance)
    if (typeof OffscreenCanvas !== "undefined") {
      this.bufferCanvas = new OffscreenCanvas(width, height);
    } else {
      this.bufferCanvas = document.createElement("canvas");
      this.bufferCanvas.width = width;
      this.bufferCanvas.height = height;
    }

    const bCtx = this.bufferCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!bCtx) {
      throw new Error("Failed to get buffer canvas context");
    }
    this.bufferCtx = bCtx as any;
  }

  /**
   * Apply edits to an image and return the resulting canvas/data URL
   */
  async applyEdits(
    image: HTMLImageElement,
    edits: ManualEdits,
    outputFormat: "image/jpeg" | "image/png" = "image/jpeg",
    quality: number = 0.92,
  ): Promise<string> {
    // Clear and draw original image
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);

    // Basic adjustments (exposure -> brightness, saturate -> saturation, hueRotate -> hue)
    await this.applyBrightness(edits.exposure ?? 0);
    await this.applyContrast(edits.contrast ?? 0);
    await this.applySaturation(edits.saturate ?? 0);
    await this.applyHue(edits.hueRotate ?? 0);
    await this.applyBlur(edits.soften ?? 0);

    // Advanced filters (pixel manipulation)
    if (edits.temperature || edits.tint) {
      this.applyTemperatureTint(edits.temperature ?? 0, edits.tint ?? 0);
    }
    if (edits.highlights || edits.shadows) {
      this.applyHighlightsShadows(edits.highlights ?? 0, edits.shadows ?? 0);
    }
    if (edits.vibrance) {
      this.applyVibrance(edits.vibrance);
    }

    // Retouch Actions - Sample from currently filtered state
    if (edits.retouchActions && edits.retouchActions.length > 0) {
      this.applyRetouchActions(
        edits.retouchActions,
        image.naturalWidth,
        image.naturalHeight,
      );
    }

    // Post-retouch filters (vignette goes over everything)
    if (edits.vignette) {
      this.applyVignette(edits.vignette);
    }

    // Final layer: Annotations (Drawings, Text)
    if (edits.annotations && edits.annotations.length > 0) {
      this.applyAnnotations(
        edits.annotations,
        image.naturalWidth,
        image.naturalHeight,
      );
    }

    return this.canvas.toDataURL(outputFormat, quality);
  }

  /**
   * Applies the retouch actions to the canvas
   */
  private applyRetouchActions(
    actions: any[],
    naturalWidth: number,
    naturalHeight: number,
  ) {
    // Sync buffer canvas
    if (
      this.bufferCanvas.width !== this.canvas.width ||
      this.bufferCanvas.height !== this.canvas.height
    ) {
      this.bufferCanvas.width = this.canvas.width;
      this.bufferCanvas.height = this.canvas.height;
    }
    this.bufferCtx.drawImage(this.canvas, 0, 0);

    actions.forEach((action) => {
      this.heal(action, naturalWidth, naturalHeight);
    });
  }

  private heal(action: any, naturalWidth: number, naturalHeight: number) {
    const { x, y, radius, sourceX, sourceY } = action;
    if (sourceX === undefined || sourceY === undefined) return;

    const scaleX = this.canvas.width / naturalWidth;
    const scaleY = this.canvas.height / naturalHeight;

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

    const patchCanvas = document.createElement("canvas");
    patchCanvas.width = patchSize;
    patchCanvas.height = patchSize;
    const patchCtx = patchCanvas.getContext("2d");
    if (!patchCtx) return;

    patchCtx.drawImage(
      this.bufferCanvas,
      sx,
      sy,
      patchSize,
      patchSize,
      0,
      0,
      patchSize,
      patchSize,
    );

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

    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.drawImage(patchCanvas, tx, ty);
  }

  private applyAnnotations(
    annotations: any[],
    naturalWidth: number,
    naturalHeight: number,
  ) {
    annotations.forEach((anno) => {
      switch (anno.type) {
        case "brush":
          this.drawBrush(anno, naturalWidth, naturalHeight);
          break;
        case "text":
          this.drawText(anno, naturalWidth, naturalHeight);
          break;
        case "shape":
          this.drawShape(anno, naturalWidth, naturalHeight);
          break;
      }
    });
  }

  private drawBrush(anno: any, naturalWidth: number, naturalHeight: number) {
    if (!anno.points || anno.points.length < 2) return;

    const scaleX = this.canvas.width / naturalWidth;
    const scaleY = this.canvas.height / naturalHeight;

    this.ctx.save();
    this.ctx.strokeStyle = anno.color;
    this.ctx.lineWidth = anno.width * Math.min(scaleX, scaleY);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.globalAlpha = anno.opacity;

    this.ctx.beginPath();
    this.ctx.moveTo(anno.points[0].x * scaleX, anno.points[0].y * scaleY);

    for (let i = 1; i < anno.points.length; i++) {
      this.ctx.lineTo(anno.points[i].x * scaleX, anno.points[i].y * scaleY);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawText(anno: any, naturalWidth: number, naturalHeight: number) {
    if (!anno.text || !anno.rect) return;

    const scaleX = this.canvas.width / naturalWidth;
    const scaleY = this.canvas.height / naturalHeight;

    this.ctx.save();
    this.ctx.fillStyle = anno.color;
    this.ctx.globalAlpha = anno.opacity;

    const fontSize = (anno.width || 20) * Math.min(scaleX, scaleY);
    this.ctx.font = `${fontSize}px Inter, sans-serif`;

    this.ctx.fillText(
      anno.text,
      anno.rect.x * scaleX,
      (anno.rect.y + anno.rect.h) * scaleY,
    );
    this.ctx.restore();
  }

  private drawShape(anno: any, naturalWidth: number, naturalHeight: number) {
    if (!anno.rect) return;

    const scaleX = this.canvas.width / naturalWidth;
    const scaleY = this.canvas.height / naturalHeight;

    this.ctx.save();
    this.ctx.strokeStyle = anno.color;
    this.ctx.lineWidth = anno.width * Math.min(scaleX, scaleY);
    this.ctx.globalAlpha = anno.opacity;

    this.ctx.strokeRect(
      anno.rect.x * scaleX,
      anno.rect.y * scaleY,
      anno.rect.w * scaleX,
      anno.rect.h * scaleY,
    );
    this.ctx.restore();
  }

  /**
   * Export to Blob for file upload
   */
  async exportToBlob(
    image: HTMLImageElement,
    edits: ManualEdits,
    outputFormat: "image/jpeg" | "image/png" = "image/jpeg",
    quality: number = 0.92,
  ): Promise<Blob> {
    await this.applyEdits(image, edits, outputFormat, quality);

    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        outputFormat,
        quality,
      );
    });
  }

  // Basic filter implementations using CSS-like operations
  private async applyBrightness(exposure: number): Promise<void> {
    // Exposure in ManualEdits is -100 to 100 (0 = neutral)
    // Canvas matrix expects factor (1 = neutral)
    const factor = 1 + exposure / 200; // Using 200 to match the editor's display math
    if (factor === 1) return;
    this.applyMatrix([
      factor,
      0,
      0,
      0,
      0,
      0,
      factor,
      0,
      0,
      0,
      0,
      0,
      factor,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
    ]);
  }

  private async applyContrast(contrast: number): Promise<void> {
    if (contrast === 100) return;
    const factor = contrast / 100;
    const intercept = 128 * (1 - factor);
    this.applyMatrix([
      factor,
      0,
      0,
      0,
      intercept,
      0,
      factor,
      0,
      0,
      intercept,
      0,
      0,
      factor,
      0,
      intercept,
      0,
      0,
      0,
      1,
      0,
    ]);
  }

  private async applySaturation(saturation: number): Promise<void> {
    if (saturation === 100) return;
    const factor = saturation / 100;
    const rw = 0.3086;
    const gw = 0.6094;
    const bw = 0.082;

    this.applyMatrix([
      rw * (1 - factor) + factor,
      gw * (1 - factor),
      bw * (1 - factor),
      0,
      0,
      rw * (1 - factor),
      gw * (1 - factor) + factor,
      bw * (1 - factor),
      0,
      0,
      rw * (1 - factor),
      gw * (1 - factor),
      bw * (1 - factor) + factor,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
    ]);
  }

  private async applyHue(degrees: number): Promise<void> {
    if (degrees === 0) return;
    const cos = Math.cos((degrees * Math.PI) / 180);
    const sin = Math.sin((degrees * Math.PI) / 180);
    const rw = 0.3086;
    const gw = 0.6094;
    const bw = 0.082;

    this.applyMatrix([
      rw + cos * (1 - rw) + sin * -rw,
      gw + cos * -gw + sin * -gw,
      bw + cos * -bw + sin * (1 - bw),
      0,
      0,
      rw + cos * -rw + sin * 0.143,
      gw + cos * (1 - gw) + sin * 0.14,
      bw + cos * -bw + sin * -0.283,
      0,
      0,
      rw + cos * -rw + sin * -(1 - rw),
      gw + cos * -gw + sin * gw,
      bw + cos * (1 - bw) + sin * bw,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
    ]);
  }

  private async applyBlur(radius: number): Promise<void> {
    if (radius <= 0) return;
    // Stack blur algorithm for Gaussian-like blur
    this.applyStackBlur(radius);
  }

  // Advanced pixel-level filters
  private applyTemperatureTint(temperature: number, tint: number): void {
    if (temperature === 0 && tint === 0) return;

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;

    // Temperature: negative = cooler (blue), positive = warmer (orange)
    const tempR = temperature > 0 ? temperature * 0.8 : 0;
    const tempB = temperature < 0 ? -temperature * 0.8 : 0;

    // Tint: negative = green, positive = magenta
    const tintG = tint < 0 ? -tint * 0.5 : 0;
    const tintM = tint > 0 ? tint * 0.5 : 0;

    for (let i = 0; i < data.length; i += 4) {
      // Temperature
      data[i] = Math.min(255, Math.max(0, data[i] + tempR)); // R
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - tempB)); // B

      // Tint
      data[i] = Math.min(255, Math.max(0, data[i] + tintM)); // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] - tintG)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + tintM)); // B
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyHighlightsShadows(highlights: number, shadows: number): void {
    if (highlights === 0 && shadows === 0) return;

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const luminance =
        (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;

      if (luminance > 0.5 && highlights !== 0) {
        // Highlights
        const factor = 1 + (highlights / 100) * (luminance - 0.5) * 2;
        data[i] = Math.min(255, data[i] * factor);
        data[i + 1] = Math.min(255, data[i + 1] * factor);
        data[i + 2] = Math.min(255, data[i + 2] * factor);
      } else if (luminance < 0.5 && shadows !== 0) {
        // Shadows
        const adjustment = shadows * (0.5 - luminance) * 2;
        data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyVibrance(vibrance: number): void {
    if (vibrance === 0) return;

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;
    const vibranceFactor = vibrance / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const max = Math.max(r, g, b);
      const avg = (r + g + b) / 3;
      const amt = ((Math.abs(max - avg) * 2) / 255) * vibranceFactor;

      data[i] = Math.min(255, Math.max(0, r + (r - avg) * amt));
      data[i + 1] = Math.min(255, Math.max(0, g + (g - avg) * amt));
      data[i + 2] = Math.min(255, Math.max(0, b + (b - avg) * amt));
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyVignette(vignette: number): void {
    if (vignette <= 0) return;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    const gradient = this.ctx.createRadialGradient(
      centerX,
      centerY,
      maxDist * 0.4,
      centerX,
      centerY,
      maxDist,
    );

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);

    this.ctx.fillStyle = gradient;
    this.ctx.globalCompositeOperation = "multiply";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = "source-over";
  }

  // Helper: Apply color matrix transformation
  private applyMatrix(matrix: number[]): void {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      data[i] = Math.min(
        255,
        Math.max(
          0,
          r * matrix[0] +
            g * matrix[1] +
            b * matrix[2] +
            a * matrix[3] +
            matrix[4],
        ),
      );
      data[i + 1] = Math.min(
        255,
        Math.max(
          0,
          r * matrix[5] +
            g * matrix[6] +
            b * matrix[7] +
            a * matrix[8] +
            matrix[9],
        ),
      );
      data[i + 2] = Math.min(
        255,
        Math.max(
          0,
          r * matrix[10] +
            g * matrix[11] +
            b * matrix[12] +
            a * matrix[13] +
            matrix[14],
        ),
      );
      data[i + 3] = Math.min(
        255,
        Math.max(
          0,
          r * matrix[15] +
            g * matrix[16] +
            b * matrix[17] +
            a * matrix[18] +
            matrix[19],
        ),
      );
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  // Helper: Generate unsharp mask kernel
  // Helper: Stack blur implementation
  private applyStackBlur(radius: number): void {
    if (radius < 1) return;

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    const { data, width, height } = imageData;

    // Simple box blur approximation for performance
    const passes = 3;
    const boxRadius = Math.max(1, Math.floor(radius / passes));

    for (let pass = 0; pass < passes; pass++) {
      this.horizontalBlur(data, width, height, boxRadius);
      this.verticalBlur(data, width, height, boxRadius);
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private horizontalBlur(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number,
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const idx = (y * width + px) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }
  }

  private verticalBlur(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number,
  ): void {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          count = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + x) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }
  }

  /**
   * Resize the canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Get the canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }
}
