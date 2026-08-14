import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sendFileError, sendNotFoundError, ERROR_CODES } from '../shared/errorHandler';

interface FilesContext {
    logger: any;
    UPLOAD_DIR: string;
}

export default function createFilesRouter(context: FilesContext): Router {
    const router = Router();
    const { logger, UPLOAD_DIR } = context;

    /**
     * @route GET /api/files/{collection}/{id}/{filename}
     * @description Serve static files (photos, uploads) from the server
     */
    // Simplified Route Handler to bypass Express 5 / path-to-regexp string compilation issues
    // Using RegExp object directly avoids "Missing parameter name" error in production
    router.get(/^\/(.*)/, (req: Request, res: Response) => {
        // Parse the captured path group
        // If regex is /^\/(.*)/, req.params[0] contains the capture
        const fullPath = req.params[0] || '';
        const parts = fullPath.split('/').filter(Boolean);
        if (parts.length < 3) {
            return sendNotFoundError(res, 'File path incomplete');
        }
        const collection = parts[0];
        const id = parts[1];
        const relativeFilePath = parts.slice(2).join('/');

        if (!relativeFilePath || relativeFilePath.includes('..')) {
            return sendFileError(res, 'Invalid file path. Directory traversal is not allowed.', ERROR_CODES.AUTHORIZATION_ERROR);
        }

        const targetDir = UPLOAD_DIR;
        const filepath = path.join(targetDir, relativeFilePath);

        const normalizedTargetDir = path.normalize(targetDir);
        const normalizedFilepath = path.normalize(filepath);
        if (!normalizedFilepath.startsWith(normalizedTargetDir)) {
            return sendFileError(res, 'Invalid file path. Security check failed.', ERROR_CODES.AUTHORIZATION_ERROR);
        }

        let finalFilepath = filepath;
        let fileFound = fs.existsSync(filepath);

        if (!fileFound) {
            const filename = path.basename(relativeFilePath);
            const flatPath = path.join(targetDir, filename);
            if (fs.existsSync(flatPath)) {
                finalFilepath = flatPath;
                fileFound = true;
            }

            if (!fileFound) {
                try {
                    const subdirs = fs.readdirSync(targetDir, { withFileTypes: true })
                        .filter(dirent => dirent.isDirectory())
                        .map(dirent => dirent.name);

                    for (const subdir of subdirs) {
                        const subPath = path.join(targetDir, subdir, filename);
                        if (fs.existsSync(subPath)) {
                            finalFilepath = subPath;
                            fileFound = true;
                            break;
                        }
                    }
                } catch (err: any) {
                    logger.warn('Deep scan failed', { error: err.message });
                }
            }
        }

        if (fileFound) {
            const stats = fs.statSync(finalFilepath);
            const normalizedFinal = path.normalize(finalFilepath);
            if (!normalizedFinal.startsWith(normalizedTargetDir)) {
                return sendFileError(res, 'Invalid file path. Security check failed.', ERROR_CODES.AUTHORIZATION_ERROR);
            }

            const ext = path.extname(finalFilepath).toLowerCase();
            const mimeTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            const etag = crypto.createHash('md5').update(`${finalFilepath}-${stats.mtime.getTime()}-${stats.size}`).digest('hex');
            const lastModified = stats.mtime.toUTCString();

            const ifNoneMatch = req.headers['if-none-match'];
            const ifModifiedSince = req.headers['if-modified-since'];

            if (ifNoneMatch === etag || ifModifiedSince === lastModified) {
                res.writeHead(304, {
                    'ETag': etag,
                    'Last-Modified': lastModified,
                    'Cache-Control': 'public, max-age=86400'
                });
                return res.end();
            }

            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': stats.size,
                'ETag': etag,
                'Last-Modified': lastModified,
                'Cache-Control': 'public, max-age=86400',
                'Accept-Ranges': 'bytes'
            });

            fs.createReadStream(finalFilepath).pipe(res);
        } else {
            // Only log at debug level to avoid spam for old deleted photos
            if (logger && logger.debug) {
                logger.debug('File not found after deep scan', {
                    filepath,
                    relativeFilePath,
                    triedFlat: path.join(UPLOAD_DIR, path.basename(relativeFilePath)),
                });
            }
            sendNotFoundError(res, `File '${relativeFilePath}'`);
        }
    });

    return router;
}
