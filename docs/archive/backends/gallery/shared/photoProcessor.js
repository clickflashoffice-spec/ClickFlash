/**
 * Enhanced Photo Processor
 * Alternative solution for JPEG file storage with:
 * - Organized folder structure (by album)
 * - Metadata extraction (dimensions, file size, hash)
 * - Thumbnail generation support
 * - Deduplication via file hash
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');

/**
 * PhotoProcessor Class
 * 
 * Handles photo file processing, organization, and metadata extraction.
 * 
 * Features:
 * - File organization by album and date
 * - File hash calculation for deduplication
 * - Image metadata extraction (dimensions, size, MIME type)
 * - Duplicate detection
 * - File validation and verification
 * 
 * @class PhotoProcessor
 */
class PhotoProcessor {
    /**
     * Create a new PhotoProcessor instance
     * 
     * @param {string} uploadDir - Base directory for photo uploads
     */
    constructor(uploadDir) {
        this.uploadDir = uploadDir;

        // --- Worker Pool State (Law 13: Zero-Block IO) ---
        this.workers = [];
        this.workerBusy = [];
        this.workerResolvers = new Map();
        this.taskQueue = [];
        this.maxConcurrency = os.cpus().length || 4;
        // -------------------------

        this.ensureDirectories();
        this.initializeWorkerPool();

        console.log(`[Gallery] Persistent Worker Pool Initialized (Size: ${this.maxConcurrency})`);
    }

    initializeWorkerPool() {
        const { Worker } = require('worker_threads');
        const workerPath = path.resolve(__dirname, '../workers/watermarkWorker.js');

        if (!fs.existsSync(workerPath)) {
            console.warn(`[PhotoProcessor] Watermark worker not found: ${workerPath}`);
            return;
        }

        for (let i = 0; i < this.maxConcurrency; i++) {
            const worker = new Worker(workerPath);
            const workerIndex = i;
            this.workerBusy[i] = false;

            worker.on('message', (result) => {
                this.handleWorkerCompletion(workerIndex, result);
            });

            worker.on('error', (err) => {
                console.error(`[PhotoProcessor] Worker ${workerIndex} Error:`, err);
                this.handleWorkerError(workerIndex, err);
            });

            this.workers.push(worker);
        }
    }

    handleWorkerCompletion(index, result) {
        const resolver = this.workerResolvers.get(index);
        if (resolver) {
            if (result && result.error) {
                resolver.reject(new Error(result.error));
            } else {
                resolver.resolve(result);
            }
            this.workerResolvers.delete(index);
        }
        this.workerBusy[index] = false;
        this.processNextTask(index);
    }

    handleWorkerError(index, err) {
        const resolver = this.workerResolvers.get(index);
        if (resolver) {
            resolver.reject(err);
            this.workerResolvers.delete(index);
        }
        this.workerBusy[index] = false;
        this.processNextTask(index);
    }

    processNextTask(workerIndex) {
        if (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            if (task) {
                this.executeTaskOnWorker(workerIndex, task);
            }
        }
    }

    executeTaskOnWorker(index, task) {
        this.workerBusy[index] = true;
        this.workerResolvers.set(index, { resolve: task.resolve, reject: task.reject });
        this.workers[index].postMessage(task.job);
    }

    async runWorker(job) {
        return new Promise((resolve, reject) => {
            const freeIndex = this.workerBusy.findIndex(busy => !busy);
            if (freeIndex !== -1 && freeIndex < this.workers.length) {
                this.executeTaskOnWorker(freeIndex, { job, resolve, reject });
            } else {
                this.taskQueue.push({ job, resolve, reject });
            }
        });
    }

    async ensureDirectories() {
        // Ensure base upload directory exists
        try {
            await fsPromises.access(this.uploadDir);
        } catch {
            await fsPromises.mkdir(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Get organized storage path for a photo
     * Structure: uploads/{albumId}/{photoId}.{ext}
     */
    async getStoragePath(albumId, photoId, originalFilename) {
        const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
        const albumDir = path.join(this.uploadDir, albumId);

        // Ensure album directory exists
        try {
            await fsPromises.access(albumDir);
        } catch {
            await fsPromises.mkdir(albumDir, { recursive: true });
        }

        return {
            directory: albumDir,
            filename: `${photoId}${ext}`,
            fullPath: path.join(albumDir, `${photoId}${ext}`),
            relativePath: `${albumId}/${photoId}${ext}` // For database storage
        };
    }

    /**
     * Calculate file hash for deduplication
     */
    async calculateFileHash(filepath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filepath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * Get image dimensions (basic implementation)
     * For production, consider using sharp or jimp for better image processing
     */
    async getImageMetadata(filepath) {
        try {
            const stats = await fsPromises.stat(filepath);
            const fileSize = stats.size;

            return {
                fileSize: fileSize,
                mimeType: this.getMimeType(filepath),
                width: null,
                height: null
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get MIME type from file extension
     */
    getMimeType(filepath) {
        const ext = path.extname(filepath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    /**
     * Move file to organized location
     */
    async organizeFile(tempFilepath, albumId, photoId, originalFilename) {
        const storage = await this.getStoragePath(albumId, photoId, originalFilename);

        // Move file from temp location to organized location
        try {
            await fsPromises.rename(tempFilepath, storage.fullPath);

            // Verify file was moved successfully
            const stats = await fsPromises.stat(storage.fullPath);
            if (stats.size === 0) {
                throw new Error(`File is empty after move: ${storage.fullPath}`);
            }
        } catch (error) {
            // If rename fails, try copy as fallback
            if (error.code === 'EXDEV' || error.code === 'EPERM') {
                // Cross-device or permission error, use copy instead
                await fsPromises.copyFile(tempFilepath, storage.fullPath);
                // Remove temp file after successful copy
                try {
                    await fsPromises.unlink(tempFilepath);
                } catch (unlinkError) {
                    // Ignore unlink errors
                }

                // Verify copy was successful
                const stats = await fsPromises.stat(storage.fullPath);
                if (stats.size === 0) {
                    throw new Error(`File is empty after copy: ${storage.fullPath}`);
                }
            } else {
                throw error;
            }
        }

        return storage;
    }

    /**
     * Process uploaded photo file
     * 
     * Handles the complete photo upload workflow:
     * 1. Validates input parameters
     * 2. Calculates file hash for deduplication
     * 3. Extracts image metadata (dimensions, size, MIME type)
     * 4. Organizes file into album-specific directory structure
     * 5. Verifies file was saved correctly
     * 
     * @param {Object} file - File object from formidable (contains filepath, originalFilename, etc.)
     * @param {string} albumId - ID of the album this photo belongs to
     * @param {string} photoId - ID of the photo record (for file naming)
     * @returns {Promise<Object>} Photo metadata object with:
     *   - url: Relative path for database storage
     *   - storagePath: Full file system path
     *   - originalFilename: Original filename
     *   - fileSize: File size in bytes
     *   - mimeType: MIME type (e.g., 'image/jpeg')
     *   - width: Image width in pixels
     *   - height: Image height in pixels
     *   - fileHash: SHA-256 hash for deduplication
     * @throws {Error} If validation fails or file processing fails
     */
    async processPhoto(file, albumId, photoId) {
        try {
            const originalFilename = file.originalFilename || file.newFilename;
            const tempFilepath = file.filepath;

            // Validate inputs
            if (!albumId) {
                throw new Error('albumId is required for photo processing');
            }
            if (!photoId) {
                throw new Error('photoId is required for photo processing');
            }
            if (!tempFilepath || !fs.existsSync(tempFilepath)) {
                throw new Error(`Temporary file path is invalid or file does not exist: ${tempFilepath}`);
            }

            // Calculate file hash for deduplication (before moving file)
            const fileHash = await this.calculateFileHash(tempFilepath);

            // Get file metadata (before moving file)
            const metadata = await this.getImageMetadata(tempFilepath);

            // Organize file into album directory
            const storage = await this.organizeFile(tempFilepath, albumId, photoId, originalFilename);

            // Verify final file exists and has content
            if (!fs.existsSync(storage.fullPath)) {
                throw new Error(`Photo file was not saved to: ${storage.fullPath}`);
            }

            const finalStats = fs.statSync(storage.fullPath);
            if (finalStats.size === 0) {
                throw new Error(`Photo file is empty at: ${storage.fullPath}`);
            }

            return {
                url: storage.relativePath, // Store relative path in database
                storagePath: storage.fullPath, // Full path for serving
                originalFilename: originalFilename,
                fileSize: metadata.fileSize,
                mimeType: metadata.mimeType,
                width: metadata.width,
                height: metadata.height,
                fileHash: fileHash
            };
        } catch (error) {
            throw new Error(`Photo processing failed: ${error.message}`);
        }
    }

    /**
     * Check for duplicate photo by hash
     */
    async findDuplicateByHash(fileHash, dbManager) {
        try {
            const existing = dbManager.get(
                'SELECT id, albumId, url FROM photos WHERE fileHash = ?',
                [fileHash]
            );
            return existing || null;
        } catch (error) {
            // If column doesn't exist yet, return null (migration not run)
            return null;
        }
    }

    /**
     * Get file path for serving
     */
    getFilePath(photoRecord) {
        return path.join(this.uploadDir, photoRecord.url);
    }

    /**
     * Generate a watermarked preview for a photo (Async/Law 13)
     */
    async generateWatermark(photoPath, outputDir, photoId) {
        const result = await this.runWorker({
            type: 'watermark',
            filepath: photoPath,
            outputDir: outputDir,
            photoId: photoId
        });

        if (!result.success) {
            throw new Error(result.error || 'Watermark generation failed');
        }

        return result.wmFilename;
    }
}

module.exports = PhotoProcessor;

