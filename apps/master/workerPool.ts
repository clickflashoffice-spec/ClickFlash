import { ImageProcessor } from '@clickflash/wasm-cv';
import { parentPort } from 'worker_threads';

// Worker thread using CPU-optimized offline processing (YuNet/MobileFaceNet)
const processor = new ImageProcessor();

parentPort?.on('message', async (message) => {
  if (message.type === 'DETECT_AND_EXTRACT_OFFLINE') {
    try {
      // 1. Detect faces locally (YuNet)
      const faces = await processor.detectFaces(message.buffer);
      
      // 2. Extract 128D vector locally (MobileFaceNet)
      // This is now fully offline, no longer hitting Cloudflare!
      const vectors = await Promise.all(
        faces.map(face => processor.extract128DVector(face.croppedBuffer))
      );

      parentPort?.postMessage({ id: message.id, vectors, status: 'success' });
    } catch (e) {
      parentPort?.postMessage({ id: message.id, error: String(e), status: 'error' });
    }
  } else if (message.type === 'GRADE_SHARPNESS') {
    try {
      // Extremely fast C++ Laplacian Variance (Sharp)
      const score = await processor.gradeSharpness(message.buffer);
      parentPort?.postMessage({ id: message.id, score, status: 'success' });
    } catch (e) {
      parentPort?.postMessage({ id: message.id, error: String(e), status: 'error' });
    }
  }
});
