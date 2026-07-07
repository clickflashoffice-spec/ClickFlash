const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/**
 * RenderingEngine
 * 
 * Background rendering service for applying non-destructive edits
 * to high-resolution images using sharp.
 * 
 * Adheres to Law 13: Zero-Block IO.
 */
class RenderingEngine {
    constructor(logger) {
        this.logger = logger;
        this.queue = [];
        this.isProcessing = false;
        this.maxConcurrent = 2; // Limit to prevent CPU exhaustion
        this.activeWorkers = 0;
    }

    /**
     * Enqueue a rendering task
     * @param {Object} task - { inputPath, outputPath, edits, photoId, albumId }
     */
    async render(task) {
        return new Promise((resolve, reject) => {
            const taskWithCallbacks = {
                ...task,
                resolve,
                reject,
                timestamp: Date.now()
            };
            this.queue.push(taskWithCallbacks);
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.activeWorkers >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        this.activeWorkers++;
        const task = this.queue.shift();

        try {
            await this.runWorker(task);
            task.resolve({ success: true, outputPath: task.outputPath });
        } catch (error) {
            this.logger.error(`Rendering failed for photo ${task.photoId}: ${error.message}`);
            task.reject(error);
        } finally {
            this.activeWorkers--;
            this.processQueue();
        }
    }

    runWorker(task) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(__filename, {
                workerData: {
                    inputPath: task.inputPath,
                    outputPath: task.outputPath,
                    edits: task.edits
                }
            });

            worker.on('message', (message) => {
                if (message.success) resolve(message);
                else reject(new Error(message.error));
            });

            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
    }
}

// Worker logic
if (!isMainThread) {
    const applyEdits = async () => {
        const { inputPath, outputPath, edits } = workerData;
        try {
            let image = sharp(inputPath);
            const metadata = await image.metadata();

            // 1. Transformations (Rotate/Straighten)
            const rotation = (edits.rotate || 0) + (edits.straighten || 0);
            if (rotation !== 0) {
                // If straighten is used, we might need a background color to fill gaps
                image = image.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 1 } });
            }

            // 2. Color Adjustments
            // Sharp's modulate handles brightness, saturation, hue
            // Brightness = 1 + (exposure / 100) + ... (approx from CSS)
            const brightness = 1 + (edits.exposure || 0) / 100;
            const saturation = 1 + (edits.saturate || 0) / 100;
            const hue = edits.hueRotate || 0;

            image = image.modulate({
                brightness: brightness,
                saturation: saturation,
                hue: hue
            });

            // 3. Contrast adjustment using linear (a * pixel + b)
            // contrastVal = 1 + (contrast / 100)
            const contrast = 1 + (edits.contrast || 0) / 100;
            if (contrast !== 1) {
                // Approximate contrast with linear (slope, intercept)
                // sharp.linear(a, b) => out = in * a + b
                // For contrast: a = contrast, b = 128 * (1 - contrast)
                image = image.linear(contrast, 128 * (1 - contrast));
            }

            // 4. Filters (Grayscale, Sepia)
            if (edits.grayscale > 0) {
                image = image.grayscale();
            }

            if (edits.sepia > 0) {
                // Sepia is a color matrix transform
                // [ 0.393, 0.769, 0.189,
                //   0.349, 0.686, 0.168,
                //   0.272, 0.534, 0.131 ]
                const sepiaFactor = edits.sepia / 100;
                image = image.recolor([
                    [0.393 * sepiaFactor + (1 - sepiaFactor), 0.769 * sepiaFactor, 0.189 * sepiaFactor],
                    [0.349 * sepiaFactor, 0.686 * sepiaFactor + (1 - sepiaFactor), 0.168 * sepiaFactor],
                    [0.272 * sepiaFactor, 0.534 * sepiaFactor, 0.131 * sepiaFactor + (1 - sepiaFactor)]
                ]);
            }

            // 5. Output with optimization
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            await image
                .jpeg({ quality: 95, mozjpeg: true })
                .toFile(outputPath);

            parentPort.postMessage({ success: true });
        } catch (error) {
            parentPort.postMessage({ success: false, error: error.message });
        }
    };

    applyEdits();
}

module.exports = RenderingEngine;
