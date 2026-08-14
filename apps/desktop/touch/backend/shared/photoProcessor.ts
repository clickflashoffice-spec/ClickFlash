// backend/shared/photoProcessor.ts
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseManager } from './db';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PhotoMetadata {
    url: string;
    storagePath: string;
    originalFilename: string;
    fileSize: number;
    mimeType: string;
    width: number | null;
    height: number | null;
    fileHash: string;
    kioskUrl: string | null;
    format?: string;
}

interface FileUpload {
    filepath: string;
    originalFilename?: string;
    newFilename?: string;
}

class PhotoProcessor {
    private uploadDir: string;
    private workers: Worker[] = [];
    private workerBusy: boolean[] = [];
    private workerResolvers: Map<number, { resolve: (val: any) => void, reject: (err: any) => void }> = new Map();
    private taskQueue: Array<{ job: any, resolve: (val: any) => void, reject: (err: any) => void }> = [];
    private maxConcurrency = 4;

    constructor(uploadDir: string) {
        if (!uploadDir) throw new Error('PhotoProcessor: uploadDir is required');
        this.uploadDir = uploadDir;
        this.ensureDirectories();
        this.initializeWorkerPool();
    }

    private async ensureDirectories(): Promise<void> {
        try {
            await fs.promises.access(this.uploadDir);
        } catch {
            await fs.promises.mkdir(this.uploadDir, { recursive: true });
        }
    }

    private initializeWorkerPool() {
        const workerPath = path.resolve(__dirname, '../workers/photoWorker.ts');

        for (let i = 0; i < this.maxConcurrency; i++) {
            const worker = new Worker(workerPath, { execArgv: ['--import', 'tsx'] });
            const workerIndex = i;
            this.workerBusy[i] = false;

            worker.on('message', (result: any) => {
                const resolver = this.workerResolvers.get(workerIndex);
                if (resolver) {
                    if (result.success) resolver.resolve(result);
                    else resolver.reject(new Error(result.error));
                    this.workerResolvers.delete(workerIndex);
                }
                this.workerBusy[workerIndex] = false;
                this.processNextTask(workerIndex);
            });

            worker.on('error', (err) => {
                const resolver = this.workerResolvers.get(workerIndex);
                if (resolver) {
                    resolver.reject(err);
                    this.workerResolvers.delete(workerIndex);
                }
                this.workerBusy[workerIndex] = false;
                this.processNextTask(workerIndex);
            });

            this.workers.push(worker);
        }
    }

    private processNextTask(workerIndex: number) {
        if (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            if (task) {
                this.executeTaskOnWorker(workerIndex, task);
            }
        }
    }

    private executeTaskOnWorker(index: number, task: { job: any, resolve: (val: any) => void, reject: (err: any) => void }) {
        this.workerBusy[index] = true;
        this.workerResolvers.set(index, { resolve: task.resolve, reject: task.reject });
        this.workers[index].postMessage(task.job);
    }

    private async runWorker(job: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const freeIndex = this.workerBusy.findIndex(busy => !busy);
            if (freeIndex !== -1) {
                this.executeTaskOnWorker(freeIndex, { job, resolve, reject });
            } else {
                this.taskQueue.push({ job, resolve, reject });
            }
        });
    }

    public async getStoragePath(albumId: string, photoId: string, originalFilename: string) {
        const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
        const albumDir = path.join(this.uploadDir, albumId);

        try {
            await fs.promises.access(albumDir);
        } catch {
            await fs.promises.mkdir(albumDir, { recursive: true });
        }

        return {
            directory: albumDir,
            filename: `${photoId}${ext}`,
            fullPath: path.join(albumDir, `${photoId}${ext}`),
            relativePath: `${albumId}/${photoId}${ext}`
        };
    }

    private async organizeFile(tempFilepath: string, albumId: string, photoId: string, originalFilename: string) {
        const storage = await this.getStoragePath(albumId, photoId, originalFilename);

        try {
            await fs.promises.rename(tempFilepath, storage.fullPath);
        } catch (error: any) {
            if (error.code === 'EXDEV' || error.code === 'EPERM') {
                await fs.promises.copyFile(tempFilepath, storage.fullPath);
                await fs.promises.unlink(tempFilepath).catch(() => { });
            } else {
                throw error;
            }
        }
        return storage;
    }

    public async processPhoto(file: FileUpload, albumId: string, photoId: string): Promise<PhotoMetadata> {
        const tempFilepath = file.filepath;
        try {
            const originalFilename = file.originalFilename || file.newFilename || 'unknown.jpg';
            const ext = path.extname(originalFilename).toLowerCase() || '.jpg';

            if (!albumId) throw new Error('albumId is required');
            if (!photoId) throw new Error('photoId is required');

            // Delegate heavy IO to worker
            const workerResult = await this.runWorker({
                type: 'process',
                filepath: tempFilepath,
                outputDir: path.dirname(tempFilepath),
                photoId,
                ext
            });

            const storage = await this.organizeFile(tempFilepath, albumId, photoId, originalFilename);

            // Move kiosk version if generated
            let kioskUrl = null;
            if (workerResult.kioskFilename) {
                const tempKioskPath = path.join(path.dirname(tempFilepath), workerResult.kioskFilename);
                const finalKioskPath = path.join(storage.directory, workerResult.kioskFilename);
                await fs.promises.rename(tempKioskPath, finalKioskPath).catch(() => { });
                kioskUrl = path.join(albumId, workerResult.kioskFilename);
            }

            return {
                url: storage.relativePath,
                storagePath: storage.fullPath,
                originalFilename: originalFilename,
                fileSize: workerResult.metadata.size || 0,
                mimeType: workerResult.metadata.mimeType || `image/${workerResult.metadata.format}`,
                width: workerResult.metadata.width || null,
                height: workerResult.metadata.height || null,
                fileHash: workerResult.hash,
                kioskUrl: kioskUrl,
                format: workerResult.metadata.format
            };
        } catch (error: any) {
            throw new Error(`Photo processing failed: ${error.message}`);
        }
    }

    public async findDuplicateByHash(fileHash: string, dbManager: DatabaseManager): Promise<any> {
        try {
            return dbManager.get('SELECT id, albumId, url FROM photos WHERE fileHash = ?', [fileHash]) || null;
        } catch (error) { return null; }
    }

    public getFilePath(photoRecord: { url: string }): string {
        return path.join(this.uploadDir, photoRecord.url);
    }
}

export default PhotoProcessor;
