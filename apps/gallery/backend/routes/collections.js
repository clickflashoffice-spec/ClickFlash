const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { 
    TABLE_MAP, 
    JSON_COLUMNS, 
    COLUMN_MAP, 
    ALLOWED_COLUMNS,
    UPLOAD_DIR,
    IMPORT_DIR
} = require('../config');
const { 
    sendInvalidInputError, 
    sendDatabaseError, 
    sendNotFoundError,
    sendFileError,
    ERROR_CODES 
} = require('../errorHandler');
const collectionController = require('../controllers/collectionController');
const { copyFileWindows } = require('../utils/windowsHelper');
const router = express.Router();

let formidable;
try {
    formidable = require('formidable');
} catch (e) {}

/**
 * List records with filtering, sorting, pagination
 */
router.get('/:col/records', async (req, res) => {
    const col = req.params.col;
    const table = TABLE_MAP[col] || col;
    const dbManager = req.app.get('dbManager');
    const logger = req.app.get('logger');

    try {
        const filterParam = req.query.filter;
        const sortParam = req.query.sort;
        const expandParam = req.query.expand;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const perPage = req.query.perPage ? Math.min(500, parseInt(req.query.perPage)) : null;

        let sql = `SELECT * FROM ${table}`;
        let params = [];
        let countSql = `SELECT COUNT(*) as total FROM ${table}`;
        let countParams = [];

        // Simple filtering (Ported from server.js Regex)
        if (filterParam) {
            let match = filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*"([^"]+)"/) ||
                        filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*'([^']+)'/) ||
                        filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*([^"'\s]+)/);

            if (match) {
                let key = COLUMN_MAP[match[1]] || match[1];
                const val = match[2];

                if (ALLOWED_COLUMNS[table] && ALLOWED_COLUMNS[table].includes(key)) {
                    const whereClause = ` WHERE ${key} = ?`;
                    sql += whereClause;
                    countSql += whereClause;
                    params.push(val);
                    countParams.push(val);
                } else {
                    return sendInvalidInputError(res, `Invalid filter column '${key}'.`);
                }
            }
        }

        // Sorting
        if (sortParam) {
            const desc = sortParam.startsWith('-');
            const key = COLUMN_MAP[sortParam.replace(/^[+-]/, '')] || sortParam.replace(/^[+-]/, '');
            if (ALLOWED_COLUMNS[table] && ALLOWED_COLUMNS[table].includes(key)) {
                sql += ` ORDER BY ${key} ${desc ? 'DESC' : 'ASC'}`;
            }
        }

        // Pagination
        let totalItems = null;
        if (perPage) {
            const countResult = dbManager.query(countSql, countParams);
            totalItems = countResult[0]?.total || 0;
            sql += ` LIMIT ? OFFSET ?`;
            params.push(perPage, (page - 1) * perPage);
        }

        let rows = dbManager.query(sql, params);

        // Expansion
        if (expandParam && expandParam.includes('photos_via_album') && table === 'albums') {
            rows = rows.map(album => {
                const photos = dbManager.query(`SELECT * FROM photos WHERE albumId = ?`, [album.id]);
                return { ...album, expand: { photos_via_album: photos } };
            });
        }

        // Parse JSON columns
        const parsedRows = rows.map(row => {
            const jsonCols = JSON_COLUMNS[table] || [];
            const parsedRow = { ...row };
            jsonCols.forEach(c => {
                if (parsedRow[c] && typeof parsedRow[c] === 'string') {
                    try { parsedRow[c] = JSON.parse(parsedRow[c]); } catch(e) {}
                }
            });
            return parsedRow;
        });

        const response = { items: parsedRows };
        if (perPage) {
            response.page = page;
            response.perPage = perPage;
            response.totalItems = totalItems;
            response.totalPages = Math.ceil(totalItems / perPage);
        }

        res.set('Cache-Control', 'private, max-age=300').json(response);
    } catch (e) {
        sendDatabaseError(res, e, `fetching ${table}`);
    }
});

/**
 * Create record (Multipart or JSON)
 */
router.post('/:col/records', async (req, res) => {
    const col = req.params.col;
    const table = TABLE_MAP[col] || col;
    const logger = req.app.get('logger');
    const photoProcessor = req.app.get('photoProcessor');
    const contentType = req.headers['content-type'] || '';

    // Handle Multipart (File Uploads)
    if (contentType.includes('multipart/form-data') && formidable) {
        const form = formidable({
            multiples: true,
            uploadDir: UPLOAD_DIR,
            keepExtensions: true,
            maxFileSize: 500 * 1024 * 1024,
        });

        form.parse(req, async (err, fields, files) => {
            if (err) return sendFileError(res, `Upload failed: ${err.message}`);

            // Flatten fields
            const data = {};
            Object.keys(fields).forEach(key => {
                const val = fields[key];
                const fieldValue = Array.isArray(val) ? val[0] : val;
                if ((table === 'photos' || table === 'albums') && (key === 'photographerId')) {
                    data[key] = parseInt(fieldValue, 10) || 0;
                } else {
                    data[key] = fieldValue;
                }
            });

            const fileProcessingPromises = [];
            Object.keys(files).forEach(key => {
                const file = Array.isArray(files[key]) ? files[key][0] : files[key];
                if (file && (table === 'photos' || table === 'archived_photos')) {
                    const albumId = data.albumId || data.album_id;
                    const photoId = data.id || crypto.randomUUID();
                    if (!data.id) data.id = photoId;

                    fileProcessingPromises.push(
                        (async () => {
                            // Windows import logic
                            const dateFolder = new Date().toISOString().split('T')[0];
                            const finalImportDir = path.join(IMPORT_DIR, dateFolder, albumId || 'no_album');
                            if (!fs.existsSync(finalImportDir)) fs.mkdirSync(finalImportDir, { recursive: true });
                            
                            const finalImportPath = path.join(finalImportDir, file.originalFilename || 'photo.jpg');
                            await copyFileWindows(file.filepath, finalImportPath);

                            // Process photo with PhotoProcessor
                            const photoData = await photoProcessor.processPhoto(file, albumId, photoId);
                            data.url = photoData.url;
                            data.originalFilename = photoData.originalFilename;
                            data.fileSize = photoData.fileSize;
                            data.mimeType = photoData.mimeType;
                            data.width = photoData.width;
                            data.height = photoData.height;
                            data.fileHash = photoData.fileHash;
                            if (!data.title) data.title = path.parse(photoData.originalFilename).name;
                        })()
                    );
                } else if (file) {
                    data[key] = file.newFilename;
                }
            });

            try {
                await Promise.all(fileProcessingPromises);
                await collectionController.processRecordCreation(req, res, table, data, req.originalUrl);
            } catch (error) {
                sendFileError(res, `Processing failed: ${error.message}`);
            }
        });
        return;
    }

    // Handle JSON
    collectionController.processRecordCreation(req, res, table, req.body, req.originalUrl);
});

/**
 * Update record
 */
router.patch('/:col/records/:id', (req, res) => {
    const col = req.params.col;
    const table = TABLE_MAP[col] || col;
    const data = { ...req.body, id: req.params.id };
    collectionController.processRecordCreation(req, res, table, data, req.originalUrl);
});

/**
 * Delete record
 */
router.delete('/:col/records/:id', (req, res) => {
    const table = TABLE_MAP[req.params.col] || req.params.col;
    const dbManager = req.app.get('dbManager');
    try {
        dbManager.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        sendDatabaseError(res, e, `deleting from ${table}`);
    }
});

module.exports = router;
