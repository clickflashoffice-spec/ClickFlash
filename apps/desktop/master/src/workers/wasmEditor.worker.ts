// @ts-nocheck
import { parentPort, isMainThread } from 'worker_threads';
import { createCanvas, loadImage } from '@napi-rs/canvas';

if (isMainThread) {
  throw new Error('This file must be run as a worker thread');
}

export interface WasmEditorJob {
  id: string;
  type: 'auto-edit' | 'ping';
  imagePath: string;
}

export interface WasmEditorResult {
  id: string;
  success: boolean;
  metadata?: unknown;
  error?: string;
}

// Basic auto-edit function using @napi-rs/canvas
async function processImage(imagePath: string) {
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.drawImage(image, 0, 0);

  // Extract pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Perform basic auto-enhance (e.g. contrast stretching)
  let min = 255, max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    if (luma < min) min = luma;
    if (luma > max) max = luma;
  }

  const range = max - min;
  const factor = range > 0 ? 255 / range : 1;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = (data[i] - min) * factor;     // R
    data[i+1] = (data[i+1] - min) * factor; // G
    data[i+2] = (data[i+2] - min) * factor; // B
  }

  ctx.putImageData(imageData, 0, 0);
  
  // Return buffer or metadata
  const buffer = canvas.toBuffer('image/jpeg');
  return {
    width: canvas.width,
    height: canvas.height,
    bufferSize: buffer.length,
    autoEdited: true
  };
}

parentPort?.on('message', async (job: WasmEditorJob) => {
  try {
    if (job.type === 'ping') {
      parentPort?.postMessage({ id: job.id, success: true, metadata: 'pong' });
      return;
    }

    if (job.type === 'auto-edit') {
      const metadata = await processImage(job.imagePath);
      parentPort?.postMessage({
        id: job.id,
        success: true,
        metadata
      });
    }
  } catch (error) {
    parentPort?.postMessage({
      id: job.id,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
