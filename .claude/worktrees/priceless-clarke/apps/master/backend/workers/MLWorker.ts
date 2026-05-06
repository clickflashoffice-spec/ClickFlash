import { parentPort } from "worker_threads";
import * as faceapi from "@vladmandic/face-api";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-cpu";
import path from "path";
import sharp from "sharp";

// P0 AI Retouch Safety threshold
const AREA_THRESHOLD_PERCENT = 0.5;

let modelsLoaded = false;

async function initModels() {
  if (modelsLoaded) return;
  const modelPath = path.resolve(
    __dirname,
    "../../node_modules/@vladmandic/face-api/model",
  );

  await tf.ready();
  await tf.setBackend("cpu");

  await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
  modelsLoaded = true;
  console.log("[MLWorker] Face detection models loaded");
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
