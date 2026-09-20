/**
 * Client-Side Image Sharpness Scorer (Laplacian Variance simulation in Canvas/WASM)
 * Computes sharpness & exposure metrics directly in the photographer's browser.
 */

import ScorerWorker from '../workers/scorer.worker?worker';
import { ClientQualityScore } from '../workers/scorer.worker';

export type { ClientQualityScore };

export async function evaluateClientPhotoQuality(file: File): Promise<ClientQualityScore> {
  return new Promise((resolve, reject) => {
    const worker = new ScorerWorker();
    
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data.result);
      }
    };
    
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    worker.postMessage(file);
  });
}
