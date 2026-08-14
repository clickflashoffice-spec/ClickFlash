/* global ImageBitmap */
import { ManualEdits } from "../../../../types";
import { CanvasFilterEngine } from "../utils/CanvasFilterEngine";

let engine: CanvasFilterEngine | null = null;
let originalImageBitmap: ImageBitmap | null = null;
let currentUrl: string | null = null;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === "INIT") {
    const { canvas, width, height } = payload;
    engine = // @ts-ignore
new CanvasFilterEngine(width, height, canvas);
  } else if (type === "LOAD_IMAGE") {
    const { url } = payload;
    if (url === currentUrl && originalImageBitmap) {
      return; // Already loaded
    }
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      originalImageBitmap = await createImageBitmap(blob);
      currentUrl = url;
      
      // Update engine dimensions if needed
      if (engine) {
        engine.resize(originalImageBitmap.width, originalImageBitmap.height);
      }
      
      self.postMessage({ type: "IMAGE_LOADED", width: originalImageBitmap.width, height: originalImageBitmap.height });
    } catch (err) {
      self.postMessage({ type: "ERROR", error: "Failed to load image" });
    }
  } else if (type === "RENDER") {
    const { edits } = payload;
    if (!engine || !originalImageBitmap) return;

    try {
      // Cast ImageBitmap to any since CanvasFilterEngine expects HTMLImageElement
      // but under the hood, Canvas ctx.drawImage supports ImageBitmap
      await engine.applyEdits(originalImageBitmap as any, edits as ManualEdits);
      self.postMessage({ type: "RENDER_COMPLETE" });
    } catch (err) {
      self.postMessage({ type: "ERROR", error: "Render failed" });
    }
  }
};
