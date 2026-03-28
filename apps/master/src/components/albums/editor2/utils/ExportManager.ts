import { ManualEdits } from "../../../../types/shared";
import { CanvasFilterEngine } from "./CanvasFilterEngine";

export interface ExportOptions {
  format: "image/jpeg" | "image/png" | "image/webp";
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio: boolean;
}

export interface ExportResult {
  dataUrl: string;
  blob: Blob;
  filename: string;
  width: number;
  height: number;
}

export const defaultExportOptions: ExportOptions = {
  format: "image/jpeg",
  quality: 0.92,
  maintainAspectRatio: true,
};

export class ExportManager {
  private canvas: HTMLCanvasElement;
  private filterEngine: CanvasFilterEngine;

  constructor() {
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create canvas context");
    }
    this.filterEngine = new CanvasFilterEngine(1, 1);
  }

  /**
   * Export an image with filters applied
   */
  async export(
    image: HTMLImageElement,
    edits: ManualEdits,
    options: Partial<ExportOptions> = {},
  ): Promise<ExportResult> {
    const opts = { ...defaultExportOptions, ...options };

    // Calculate output dimensions
    let { width, height } = this.calculateDimensions(
      image.naturalWidth,
      image.naturalHeight,
      opts,
    );

    // Resize canvas and filter engine
    this.canvas.width = width;
    this.canvas.height = height;
    this.filterEngine.resize(width, height);

    // Apply filters and export
    const dataUrl = await this.filterEngine.applyEdits(
      image,
      edits,
      opts.format as any,
      opts.quality,
    );

    // Convert to blob
    const blob = await this.dataUrlToBlob(dataUrl);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const extension = opts.format.split("/")[1];
    const filename = `edited-${timestamp}.${extension}`;

    return {
      dataUrl,
      blob,
      filename,
      width,
      height,
    };
  }

  /**
   * Export multiple images using the backend service (Law 14)
   * Offloads processing to backend to handle high-resolution / high-volume without crashing browser
   */
  async backendBatchExport(
    items: Array<{ photoId: string; edits: ManualEdits; filename?: string }>,
    targetDir: string,
    _onProgress?: (current: number, total: number) => void,
  ): Promise<{ success: boolean; exportedCount: number; errors: string[] }> {
    try {
      const response = await fetch("/api/export/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          targetDir,
          options: { format: "image/jpeg", quality: 92 },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Backend export failed");
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Backend Export failed:", error);
      throw error;
    }
  }

  /**
   * Download an export result to the user's device
   */
  download(result: ExportResult): void {
    const link = document.createElement("a");
    link.href = result.dataUrl;
    link.download = result.filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Upload an export result to a server
   */
  async upload(
    result: ExportResult,
    uploadUrl: string,
    additionalFields?: Record<string, string>,
  ): Promise<Response> {
    const formData = new FormData();
    formData.append("file", result.blob, result.filename);

    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });
  }

  /**
   * Preview export at a smaller size (for thumbnails/previews)
   */
  async preview(
    image: HTMLImageElement,
    edits: ManualEdits,
    maxPreviewSize: number = 400,
  ): Promise<string> {
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    let width = maxPreviewSize;
    let height = maxPreviewSize;

    if (aspectRatio > 1) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }

    // Resize canvas and filter engine for preview
    this.canvas.width = Math.floor(width);
    this.canvas.height = Math.floor(height);
    this.filterEngine.resize(Math.floor(width), Math.floor(height));

    return this.filterEngine.applyEdits(image, edits, "image/jpeg", 0.85);
  }

  /**
   * Calculate output dimensions based on options
   */
  private calculateDimensions(
    naturalWidth: number,
    naturalHeight: number,
    options: ExportOptions,
  ): { width: number; height: number } {
    let width = naturalWidth;
    let height = naturalHeight;

    // Apply max dimensions if specified
    if (options.maxWidth && width > options.maxWidth) {
      const ratio = options.maxWidth / width;
      width = options.maxWidth;
      if (options.maintainAspectRatio) {
        height = Math.round(height * ratio);
      }
    }

    if (options.maxHeight && height > options.maxHeight) {
      const ratio = options.maxHeight / height;
      height = options.maxHeight;
      if (options.maintainAspectRatio) {
        width = Math.round(width * ratio);
      }
    }

    return { width, height };
  }

  /**
   * Convert data URL to Blob
   */
  private dataUrlToBlob(dataUrl: string): Promise<Blob> {
    return new Promise((resolve) => {
      const arr = dataUrl.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      resolve(new Blob([u8arr], { type: mime }));
    });
  }

  /**
   * Compare original vs filtered (for before/after)
   */
  async createComparisonData(
    image: HTMLImageElement,
    edits: ManualEdits,
    maxSize: number = 800,
  ): Promise<{ before: string; after: string }> {
    // Create before (original scaled)
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    let width = maxSize;
    let height = maxSize;

    if (aspectRatio > 1) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }

    width = Math.floor(width);
    height = Math.floor(height);

    // Before image
    const beforeCanvas = document.createElement("canvas");
    beforeCanvas.width = width;
    beforeCanvas.height = height;
    const beforeCtx = beforeCanvas.getContext("2d");
    if (beforeCtx) {
      beforeCtx.drawImage(image, 0, 0, width, height);
    }
    const before = beforeCanvas.toDataURL("image/jpeg", 0.85);

    // After image (with filters)
    this.canvas.width = width;
    this.canvas.height = height;
    this.filterEngine.resize(width, height);
    const after = await this.filterEngine.applyEdits(
      image,
      edits,
      "image/jpeg",
      0.85,
    );

    return { before, after };
  }
}

// Singleton instance
export const exportManager = new ExportManager();
