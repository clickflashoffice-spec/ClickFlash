// backend/workers/faceWorker.ts
import { parentPort } from 'worker_threads';
import { logger } from '../utils/logger.ts';

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

            // Helper function for Eye Aspect Ratio (EAR)
            const calculateEAR = (eyePoints: { x: number; y: number }[]): number => {
                if (!eyePoints || eyePoints.length < 6) return 0.3; // Default open
                const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
                    Math.hypot(p1.x - p2.x, p1.y - p2.y);
                const vertical1 = dist(eyePoints[1], eyePoints[5]);
                const vertical2 = dist(eyePoints[2], eyePoints[4]);
                const horizontal = dist(eyePoints[0], eyePoints[3]);
                if (horizontal === 0) return 0.3;
                return (vertical1 + vertical2) / (2.0 * horizontal);
            };

            let totalEAR = 0;
            let blinkDetected = false;

            const faces = detections.map((d: any) => {
                let ear = 0.3;
                if (d.landmarks) {
                    try {
                        const leftEye = d.landmarks.getLeftEye();
                        const rightEye = d.landmarks.getRightEye();
                        const leftEAR = calculateEAR(leftEye);
                        const rightEAR = calculateEAR(rightEye);
                        ear = (leftEAR + rightEAR) / 2.0;
                        if (ear < 0.2) blinkDetected = true;
                        totalEAR += ear;
                    } catch {
                        totalEAR += 0.3;
                    }
                } else {
                    totalEAR += 0.3;
                }

                return {
                    descriptor: Array.from(d.descriptor),
                    box: {
                        x: d.detection.box.x,
                        y: d.detection.box.y,
                        width: d.detection.box.width,
                        height: d.detection.box.height
                    },
                    ear
                };
            });

            const avgEAR = detections.length > 0 ? totalEAR / detections.length : 0.3;

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
                logger.warn('[FaceWorker] Failed to calculate sharpness:', e.message);
            }

            // 3. Exposure statistics (mean brightness across channels)
            let exposureScore = 0.7;
            try {
                const stats = await sharp(imagePath).stats();
                const avgMean = stats.channels.reduce((sum: number, ch: any) => sum + ch.mean, 0) / stats.channels.length;
                // Ideal exposure around 110-140 in 8-bit space [0-255]
                const dev = Math.abs(avgMean - 128) / 128;
                exposureScore = Math.max(0.1, 1.0 - (dev * 0.8));
            } catch (e: any) {
                logger.warn('[FaceWorker] Failed to calculate exposure stats:', e.message);
            }

            // Penalty for blinking / closed eyes
            const blinkPenalty = blinkDetected ? 0.4 : 1.0;
            const expressionScore = Math.min(1.0, avgFaceScore * (avgEAR / 0.3));

            const normalizedSharpness = Math.min(sharpness / 1000, 1.0);
            const heroScore = ((avgFaceScore * 0.4) + (normalizedSharpness * 0.3) + (exposureScore * 0.2) + (expressionScore * 0.1)) * blinkPenalty;

            parentPort?.postMessage({
                success: true,
                faces,
                scores: {
                    overall: heroScore,
                    sharpness: normalizedSharpness,
                    exposure: exposureScore,
                    expression: expressionScore,
                    blinkDetected
                },
                faceCount: detections.length,
                width: info.width,
                height: info.height
            });
        }
    } catch (error: any) {
        parentPort?.postMessage({
            success: false,
            error: error.message
        });
    }
});
