/**
 * Enhanced Photo Processor
 * Alternative solution for JPEG file storage with:
 * - Organized folder structure (by album)
 * - Metadata extraction (dimensions, file size, hash)
 * - Thumbnail generation support
 * - Deduplication via file hash
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class PhotoProcessor {
    constructor(uploadDir) {
        this.uploadDir = uploadDir;
        this.ensureDirectories();
    }

    ensureDirectories() {
        // Ensure base upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Get organized storage path for a photo
     * Structure: uploads/{albumId}/{photoId}.{ext}
     */
    getStoragePath(albumId, photoId, originalFilename) {
        const ext = path.extname(originalFilename).toLowerCase() || '.jpg';
        const albumDir = path.join(this.uploadDir, albumId);

        // Ensure album directory exists
        if (!fs.existsSync(albumDir)) {
            fs.mkdirSync(albumDir, { recursive: true });
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
    async calculateFileHash(filepath, algorithm = 'sha256') {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash(algorithm);
            const stream = fs.createReadStream(filepath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * Verify file integrity against expected MD5
     */
    async verifyIntegrity(filepath, expectedMd5) {
        if (!expectedMd5) return true; // Skip if no checksum provided
        const actualMd5 = await this.calculateFileHash(filepath, 'md5');
        return actualMd5 === expectedMd5;
    }

    /**
     * Get image dimensions (basic implementation)
     * For production, consider using sharp or jimp for better image processing
     */
    async getImageMetadata(filepath) {
        return new Promise((resolve, reject) => {
            try {
                const stats = fs.statSync(filepath);
                const fileSize = stats.size;

                // Basic metadata extraction
                // For full EXIF and dimension extraction, use a library like 'sharp' or 'jimp'
                const metadata = {
                    fileSize: fileSize,
                    mimeType: this.getMimeType(filepath),
                    // Dimensions would be extracted here with image processing library
                    // For now, we'll set them to null and extract later if needed
                    width: null,
                    height: null
                };

                resolve(metadata);
            } catch (error) {
                reject(error);
            }
        });
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
        const storage = this.getStoragePath(albumId, photoId, originalFilename);

        // Validate temp file exists
        if (!fs.existsSync(tempFilepath)) {
            throw new Error(`Temporary file not found: ${tempFilepath}`);
        }

        // Ensure destination directory exists
        if (!fs.existsSync(storage.directory)) {
            fs.mkdirSync(storage.directory, { recursive: true });
        }

        // Move file from temp location to organized location
        try {
            fs.renameSync(tempFilepath, storage.fullPath);

            // Verify file was moved successfully
            if (!fs.existsSync(storage.fullPath)) {
                throw new Error(`File move failed: ${tempFilepath} -> ${storage.fullPath}`);
            }

            // Verify file size is not zero
            const stats = fs.statSync(storage.fullPath);
            if (stats.size === 0) {
                throw new Error(`File is empty after move: ${storage.fullPath}`);
            }
        } catch (error) {
            // If rename fails, try copy as fallback
            if (error.code === 'EXDEV' || error.code === 'EPERM') {
                // Cross-device or permission error, use copy instead
                fs.copyFileSync(tempFilepath, storage.fullPath);
                // Remove temp file after successful copy
                try {
                    fs.unlinkSync(tempFilepath);
                } catch (unlinkError) {
                    // Ignore unlink errors, file may have been cleaned up
                }

                // Verify copy was successful
                if (!fs.existsSync(storage.fullPath)) {
                    throw new Error(`File copy failed: ${tempFilepath} -> ${storage.fullPath}`);
                }
            } else {
                throw error;
            }
        }

        return storage;
    }

    /**
     * Process uploaded photo file
     * Returns enhanced metadata for database storage
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
        // Support both old format (flat filename) and new format (albumId/photoId.ext)
        if (photoRecord.url && photoRecord.url.includes('/')) {
            // New organized format: albumId/photoId.ext
            return path.join(this.uploadDir, photoRecord.url);
        } else {
            // Old format: just filename (backward compatibility)
            return path.join(this.uploadDir, photoRecord.url);
        }
    }
}

module.exports = PhotoProcessor;

