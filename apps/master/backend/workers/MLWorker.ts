import { parentPort } from "worker_threads";
import * as faceapi from "@vladmandic/face-api";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-cpu";
import path from "path";
import sharp from "sharp";
import { logger } from '../utils/logger';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

// P0 AI Retouch Safety threshold
const AREA_THRESHOLD_PERCENT = 0.5;

let modelsLoaded = false;

async function initModels() {
  if (modelsLoaded) return;
  const modelPath = path.resolve(
    _dirname,
    "../../node_modules/@vladmandic/face-api/model",
  );

  await tf.ready();
  await tf.setBackend("cpu");

  await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
  modelsLoaded = true;
  logger.info("[MLWorker] Face detection models loaded");
}

parentPort?.on("message", async (job) => {
  try {
    await initModels();

    if (job.type === "verify-retouch") {
      const { imagePath, actions, width, height } = job;

      let totalAreaPercent = 0;

      for (const action of actions) {
        const { x, y, radius } = action;
        const area = Math.PI * radius * radius;
        const totalPixels = width * height;
        const areaPercent = (area / totalPixels) * 100;

        totalAreaPercent += areaPercent;

        if (areaPercent > AREA_THRESHOLD_PERCENT) {
          // Verify this specific action covers a face
          const isFace = await verifyFaceRegion(imagePath, x, y, radius);
          if (!isFace) {
            throw new Error(
              `RETOUCH_REJECTION: Action at [${Math.round(x)}, ${Math.round(y)}] exceeds ${AREA_THRESHOLD_PERCENT}% area and covers NO detected face.`,
            );
          }
        }
      }

      parentPort?.postMessage({
        success: true,
        totalAreaPercent,
      });
    } else if (job.type === "curate-photo") {
      const { imagePath, width, height } = job;
      const curationResult = await computeCurationScore(imagePath, width, height);
      parentPort?.postMessage({
        success: true,
        ...curationResult,
      });
    }
  } catch (error: any) {
    parentPort?.postMessage({
      success: false,
      error: error.message,
    });
  }
});

async function verifyFaceRegion(
  imagePath: string,
  x: number,
  y: number,
  radius: number,
): Promise<boolean> {
  // Load original image and decode using sharp to avoid tfjs-node dependency
  const image = sharp(imagePath);
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Rule: Decode image efficiently using tfjs
  const tensor = tf.tidy(() => {
    return tf.tensor3d(data, [info.height, info.width, info.channels]);
  });

  const detections = await faceapi.detectAllFaces(
    tensor as any,
    new faceapi.TinyFaceDetectorOptions(),
  );
  tf.dispose(tensor);

  // Check if any detected face overlaps with our retouch region
  const retouchRect = {
    left: x - radius,
    top: y - radius,
    right: x + radius,
    bottom: y + radius,
  };

  for (const det of detections) {
    const box = det.box;
    // Simple intersection check
    const overlap = !(
      box.left > retouchRect.right ||
      box.right < retouchRect.left ||
      box.top > retouchRect.bottom ||
      box.bottom < retouchRect.top
    );
    if (overlap) return true;
  }

  return false;
}

async function computeCurationScore(
  imagePath: string,
  width: number | null,
  height: number | null,
): Promise<{ score: number; flags: string[]; facesDetected: number; sharpnessScore: number }> {
  let score = 85; // Base high quality default
  const flags: string[] = [];
  let facesDetected = 0;
  let sharpnessScore = 0;

  try {
    const image = sharp(imagePath);
    const stats = await image.stats();
    const channels = stats.channels;

    // Laplacian convolution for edge sharpness
    try {
      const edgeStats = await sharp(imagePath)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
        })
        .stats();
      sharpnessScore = Math.round(edgeStats.channels[0].stdev);
      if (sharpnessScore < 6) {
        flags.push("blurry");
        score -= 35;
      } else if (sharpnessScore >= 18) {
        flags.push("sharp_focus");
        score += 10;
      }
    } catch {
      // Fallback if convolution fails
      const avgStdev = channels.reduce((s, c) => s + c.stdev, 0) / channels.length;
      sharpnessScore = Math.round(avgStdev);
      if (avgStdev < 15) {
        flags.push("blurry");
        score -= 30;
      }
    }

    // Exposure check
    const avgMean = channels.slice(0, 3).reduce((s, c) => s + c.mean, 0) / 3;
    if (avgMean > 232) {
      flags.push("overexposed");
      score -= 25;
    } else if (avgMean < 24) {
      flags.push("underexposed");
      score -= 25;
    }

    // Resolution check
    if (width && height && (width < 1000 || height < 1000)) {
      flags.push("low_resolution");
      score -= 15;
    }

    // Face AI Detection check
    try {
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      const tensor = tf.tidy(() => tf.tensor3d(data, [info.height, info.width, info.channels]));
      const detections = await faceapi.detectAllFaces(tensor as any, new faceapi.TinyFaceDetectorOptions());
      tf.dispose(tensor);

      facesDetected = detections.length;
      if (facesDetected > 0) {
        flags.push("faces_detected");
        score += 10;
      }
    } catch (faceErr) {
      // Face detection non-fatal
    }

    score = Math.min(100, Math.max(0, score));
  } catch (err: any) {
    logger.warn("[Curation] Curation score failed, defaulting", { error: err.message });
  }

  return { score, flags, facesDetected, sharpnessScore };
}
