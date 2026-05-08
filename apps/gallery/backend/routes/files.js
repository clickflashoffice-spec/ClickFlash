const express = require('express');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../config');
const { sendFileError, sendNotFoundError, ERROR_CODES } = require('../errorHandler');
const router = express.Router();

/**
 * Serve static files from UPLOAD_DIR
 * Expected: /api/files/:collection/:recordId/:filePath(*)
 */
router.get('/:collection/:recordId/:filePath(*)', (req, res) => {
    const { collection, recordId, filePath } = req.params;
    const logger = req.app.get('logger');

    if (!filePath || filePath.includes('..')) {
        return sendFileError(res, 'Invalid file path. Directory traversal is not allowed.', ERROR_CODES.AUTHORIZATION_ERROR);
    }

    const fullPath = path.join(UPLOAD_DIR, filePath);
    const normalizedTargetDir = path.normalize(UPLOAD_DIR);
    const normalizedFilepath = path.normalize(fullPath);

    if (!normalizedFilepath.startsWith(normalizedTargetDir)) {
        return sendFileError(res, 'Invalid file path. Security check failed.', ERROR_CODES.AUTHORIZATION_ERROR);
    }

    if (fs.existsSync(fullPath)) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        fs.createReadStream(fullPath).pipe(res);
    } else {
        if (logger) logger.warn('File not found', { fullPath, filePath });
        sendNotFoundError(res, `File '${filePath}'`);
    }
});

module.exports = router;
