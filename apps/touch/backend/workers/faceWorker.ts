// backend/workers/faceWorker.ts
import { parentPort } from "worker_threads";

if (!parentPort) {
  throw new Error("This file must be run as a worker thread");
}

let faceapi: any = null;
let isLoaded = false;

async function loadFaceApi(modelsPath: string) {
  if (isLoaded) return;

  try {
    const { TextEncoder, TextDecoder } = require("util");
    // Check if @napi-rs/canvas is available, otherwise this will fail
    // Note: For Touch App, we might need to install this if it's missing
    const canvas = require("@napi-rs/canvas");
    const { Canvas, Image, ImageData } = canvas;

    (global as any).TextEncoder = TextEncoder;
    (global as any).TextDecoder = TextDecoder;
    (global as any).window = global;
    (global as any).self = global;
    (global as any).document = {
      createElement: (tag: string) => {
        if (tag === "canvas") return new Canvas(100, 100);
        if (tag === "img") return new Image();
        return {};
      },
      body: {},
    };
    (global as any).HTMLCanvasElement = Canvas;
    (global as any).HTMLImageElement = Image;
    (global as any).Canvas = Canvas;
    (global as any).Image = Image;
    (global as any).ImageData = ImageData;

    if (!(global as any).fetch) {
      const nodeFetch = require("node-fetch");
      (global as any).fetch = nodeFetch;
    }

    require("@tensorflow/tfjs-backend-cpu");
    const faceapiModule = require("@vladmandic/face-api/dist/face-api.node.js");
    faceapi = faceapiModule.default || faceapiModule;

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);

    isLoaded = true;
  } catch (err: any) {
    throw new Error(`Worker failed to load face-api: ${err.message}`);
  }
}

parentPort.on("message", async (job: any) => {
  const { type, imagePath, modelsPath } = job;

  try {
    await loadFaceApi(modelsPath);

    if (type === "get-descriptors") {
      const sharp = require("sharp");
      const { data, info } = await sharp(imagePath)
        .removeAlpha()
        .resize({ width: 800, withoutEnlargement: true })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const tensor = faceapi.tf.tensor3d(data, [
        info.height,
        info.width,
        info.channels,
      ]);
      const detections = await faceapi
        .detectAllFaces(tensor)
        .withFaceLandmarks()
        .withFaceDescriptors();

      tensor.dispose();

      const faces = detections.map((d: any) => ({
        descriptor: Array.from(d.descriptor),
        box: d.detection.box,
      }));

      // Simplified score for Touch App import
      const avgFaceScore =
        detections.length > 0
          ? detections.reduce(
              (sum: number, d: any) => sum + d.detection.score,
              0,
            ) / detections.length
          : 0;

      parentPort?.postMessage({
        success: true,
        faces,
        scores: {
          overall: avgFaceScore,
          sharpness: 1.0,
          expression: avgFaceScore,
        },
        faceCount: detections.length,
      });
    }
  } catch (error: any) {
    parentPort?.postMessage({
      success: false,
      error: error.message,
    });
  }
});
