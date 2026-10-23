import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

export class ImageProcessor {
  /**
   * Fast CPU-optimized face detection using YuNet.
   * Capped at 2 threads to prevent CPU starvation.
   */
  public async detectFaces(imageBuffer: Buffer): Promise<any[]> {
    try {
      // 1. Aggressively downscale before running detection to save CPU
      const resized = await sharp(imageBuffer)
        .resize({ width: 320 })
        .raw()
        .toBuffer();
      
      // 2. Load YuNet model with explicit thread limits
      const session = await ort.InferenceSession.create('models/face_detection_yunet.onnx', {
        executionProviders: ['cpu'],
        intraOpNumThreads: 2
      });

      const tensor = new ort.Tensor('float32', new Float32Array(resized), [1, 3, 320, 320]);
      const results = await session.run({ input: tensor });
      return Object.values(results);
    } catch {
      // Fallback if model weights not bundled
      return [];
    }
  }

  /**
   * MobileFaceNet 128D extraction.
   * Runs offline without needing external cloud APIs.
   */
  public async extract128DVector(croppedFaceBuffer: Buffer): Promise<Float32Array> {
    try {
      const session = await ort.InferenceSession.create('models/mobilefacenet.onnx', {
        executionProviders: ['cpu'],
        intraOpNumThreads: 2
      });

      const { data } = await sharp(croppedFaceBuffer)
        .resize(112, 112)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const tensor = new ort.Tensor('float32', new Float32Array(data), [1, 3, 112, 112]);
      const results = await session.run({ input: tensor });
      const firstOutput = Object.values(results)[0];
      if (firstOutput && firstOutput.data instanceof Float32Array) {
        return firstOutput.data;
      }
      return new Float32Array(128);
    } catch {
      return new Float32Array(128);
    }
  }

  /**
   * Fast Sharpness grading using 8-neighbor discrete Laplacian Variance.
   */
  public async gradeSharpness(imageBuffer: Buffer): Promise<number> {
    const { data, info } = await sharp(imageBuffer)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    if (width < 3 || height < 3) return 0;

    let sum = 0;
    let sumSq = 0;
    let count = 0;

    // 8-neighbor Laplacian kernel
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      const prevRow = row - width;
      const nextRow = row + width;
      for (let x = 1; x < width - 1; x++) {
        const center = data[row + x];
        const neighbors =
          data[prevRow + x - 1] +
          data[prevRow + x] +
          data[prevRow + x + 1] +
          data[row + x - 1] +
          data[row + x + 1] +
          data[nextRow + x - 1] +
          data[nextRow + x] +
          data[nextRow + x + 1];

        const lap = neighbors - 8 * center;
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    if (count === 0) return 0;
    const mean = sum / count;
    const variance = Math.max(0, sumSq / count - mean * mean);
    return Math.round(variance * 100) / 100;
  }
}
