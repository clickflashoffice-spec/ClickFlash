// backend/workers/faceWorker.ts
import { parentPort } from 'worker_threads';

/**
 * Worker Thread for Face Recognition
 * This avoids blocking the main Node.js event loop during heavy neural net inference.
 */

if (!parentPort) {
    throw new Error('This file must be run as a worker thread');
}

let faceapi: any = null;
let isLoaded = false;

async function loadFaceApi(modelsPath: string) {
    if (isLoaded) return;

    try {
        // Polyfill globals for face-api browser bundle
        const { TextEncoder, TextDecoder } = require('util');
        const canvas = require('@napi-rs/canvas');
        const { Canvas, Image, ImageData } = canvas;

        (global as any).TextEncoder = TextEncoder;
        (global as any).TextDecoder = TextDecoder;
        (global as any).window = global;
        (global as any).self = global;
        (global as any).document = {
            createElement: (tag: string) => {
                if (tag === 'canvas') return new Canvas(100, 100);
                if (tag === 'img') return new Image();
                return {};
            },
            body: {}
        };
        (global as any).HTMLCanvasElement = Canvas;
        (global as any).HTMLImageElement = Image;
        (global as any).Canvas = Canvas;
        (global as any).Image = Image;
        (global as any).ImageData = ImageData;

        // Use standard fetch if available, or polyfill
        if (!(global as any).fetch) {
            const nodeFetch = require('node-fetch');
            (global as any).fetch = nodeFetch;
        }

        // Register CPU backend
        require('@tensorflow/tfjs-backend-cpu');

        // Import ESM bundle
        const faceapiModule = require('@vladmandic/face-api/dist/face-api.node.js');
        faceapi = faceapiModule.default || faceapiModule;

        // Load models
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);

        isLoaded = true;
    } catch (err: any) {
        throw new Error(`Worker failed to load face-api: ${err.message}`);
    }
}

parentPort.on('message', async (job: any) => {
    const { type, imagePath, modelsPath } = job;

    try {
        await loadFaceApi(modelsPath);

        if (type === 'get-descriptors') {
            const sharp = require('sharp');
            // Similar to faceService.ts: imageToTensor logic
            const { data, info } = await sharp(imagePath)
                .removeAlpha()
                .resize({ width: 800, withoutEnlargement: true })
                .raw()
                .toBuffer({ resolveWithObject: true });

            // Ensure 3 channels (RGB) after removing alpha
            const channels = info.channels === 4 ? 3 : info.channels;
            const tensor = faceapi.tf.tensor3d(data, [info.height, info.width, channels], 'int32');
            const detections = await faceapi.detectAllFaces(tensor)
                .withFaceLandmarks()
                .withFaceDescriptors();

            tensor.dispose();

            const faces = detections.map((d: any) => ({
                descriptor: Array.from(d.descriptor),
                box: d.detection.box
            }));

            // Hero Score Logic (Rule 53: AI Smart Selection)
            // 1. Face Confidence
            const avgFaceScore = detections.length > 0
                ? detections.reduce((sum: number, d: any) => sum + d.detection.score, 0) / detections.length
                : 0;

            // 2. Sharpness (Laplacian variance simulation using sharp)
            let sharpness = 0;
            try {
                const laplacian = await sharp(imagePath)
                    .greyscale()
                    .convolve({
                        width: 3,
                        height: 3,
                        kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
                    })
                    .raw()
                    .toBuffer();

                // Calculate variance
                let sum = 0;
                let sqSum = 0;
                for (let i = 0; i < laplacian.length; i++) {
                    sum += laplacian[i];
                    sqSum += laplacian[i] * laplacian[i];
                }
                const mean = sum / laplacian.length;
                sharpness = (sqSum / laplacian.length) - (mean * mean);
            } catch (e: any) {
                console.warn('[FaceWorker] Failed to calculate sharpness:', e.message);
            }

            const heroScore = (avgFaceScore * 0.7) + (Math.min(sharpness / 1000, 1.0) * 0.3);

            parentPort?.postMessage({
                success: true,
                faces,
                scores: {
                    overall: heroScore,
                    sharpness: sharpness / 1000,
                    expression: avgFaceScore
                },
                faceCount: detections.length
            });
        }
    } catch (error: any) {
        parentPort?.postMessage({
            success: false,
            error: error.message
        });
    }
});
