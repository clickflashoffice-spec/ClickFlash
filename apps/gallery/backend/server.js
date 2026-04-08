const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const rateLimiter = require('./rateLimiter');
const DatabaseManager = require('./db');
const { verifyPassword, hashPassword } = require('./auth');
const { validateRequest, validateLogin } = require('./validation');
const AuditLogger = require('./auditLogger');
const Logger = require('./logger');
const PhotoProcessor = require('./photoProcessor');
const {
    sendError,
    sendValidationError,
    sendAuthError,
    sendNotFoundError,
    sendRateLimitError,
    sendInternalError,
    sendDatabaseError,
    sendFileError,
    sendInvalidInputError,
    ERROR_CODES
} = require('./errorHandler');

// Load environment variables
require('dotenv').config();
let formidable;
try {
    formidable = require('formidable');
} catch (e) {
    // Logger not yet initialized, use console for startup warnings
    console.warn('[Server] formidable not found, file uploads will not work. Run "npm install formidable"');
}

// --- Configuration ---
const PORT = parseInt(process.env.PORT, 10) || 8093;
const DATA_DIR = process.argv[2] || process.env.DATA_DIR || path.join(__dirname, '../pb_data');
const DB_FILE = path.join(DATA_DIR, 'data.db');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const IMPORT_DIR = path.join(DATA_DIR, 'imports');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const AUDIT_LOGS_DIR = path.join(DATA_DIR, 'audit_logs');

// Initialize photo processor for enhanced file handling
const photoProcessor = new PhotoProcessor(UPLOAD_DIR);

// Windows file copy helper using PowerShell
const copyFileWindows = async (sourcePath, destPath) => {
    return new Promise((resolve, reject) => {
        // Convert to absolute paths and normalize for Windows
        const absSource = path.resolve(sourcePath);
        const absDest = path.resolve(destPath);

        // Escape single quotes in paths for PowerShell by doubling them
        const escapedSource = absSource.replace(/'/g, "''");
        const escapedDest = absDest.replace(/'/g, "''");

        // Use PowerShell Copy-Item command with error handling
        // -Force: Overwrite if exists
        // -ErrorAction Stop: Treat errors as terminating errors
        const powershellCommand = `powershell -Command "Copy-Item -LiteralPath '${escapedSource}' -Destination '${escapedDest}' -Force -ErrorAction Stop"`;

        exec(powershellCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Windows copy failed: ${error.message}\nCommand: ${powershellCommand}\nStderr: ${stderr}`));
                return;
            }
            // PowerShell may write informational messages to stderr even on success
            // Only treat as error if exit code indicates failure (handled above)
            resolve();
        });
    });
};

// Security Configuration
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    // Logger not yet initialized, use console for startup warnings
    console.warn('[Security] Using generated JWT secret. Sessions will invalidate on restart. Set JWT_SECRET in .env');
    return 'CHANGE_ME_IN_PRODUCTION_' + crypto.randomBytes(32).toString('hex');
})();

// CORS Configuration - Allow environment variable override
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:5173',
        'http://localhost:5177',
        'http://localhost:5179',
        'http://localhost:8000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5177',
        'http://127.0.0.1:5179',
        'http://127.0.0.1:8000'
    ];

// Web Root - Unified Distribution Folder
const IS_PROD = path.basename(path.dirname(__dirname)) === 'resources';
const WEB_ROOT = path.join(__dirname, '../dist'); // Always sibling in Docker and Local Source

// --- Startup Diagnostics ---
console.log('');
console.log('========================================');
console.log('Star Master Photography OS - Backend Server');
console.log('========================================');
console.log(`[Startup] Node.js: ${process.version}`);
console.log(`[Startup] Port: ${PORT}`);
console.log(`[Startup] Data Directory: ${DATA_DIR}`);
console.log(`[Startup] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');

// --- Initialization ---
// Finalize pb_data directory structure - ensure all required directories exist
try {
    const requiredDirs = [
        DATA_DIR,           // Main data directory
        UPLOAD_DIR,        // Photo uploads
        IMPORT_DIR,        // Import staging
        BACKUP_DIR,        // Database backups
        LOGS_DIR,          // Application logs
        AUDIT_LOGS_DIR     // Security audit logs
    ];

    let dirsCreated = 0;
    requiredDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
                dirsCreated++;
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[Init] Created directory: ${dir}`);
                }
            } catch (mkdirErr) {
                console.error(`[Fatal] Failed to create directory: ${dir}`);
                console.error(`[Fatal] Error: ${mkdirErr.message}`);
                throw mkdirErr;
            }
        }
    });

    if (dirsCreated > 0 && process.env.NODE_ENV === 'development') {
        console.log(`[Init] Created ${dirsCreated} directory(ies)`);
    }

    // Verify write permissions
    try {
        const testFile = path.join(DATA_DIR, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('[Init] Write permissions verified');
    } catch (permErr) {
        console.error(`[Fatal] Write permission denied in data directory: ${DATA_DIR}`);
        console.error(`[Fatal] Error: ${permErr.message}`);
        console.error('[Fatal] Please check folder permissions or run as administrator');
        process.exit(1);
    }

    // Check disk space (warn if less than 100MB free)
    try {
        const stats = fs.statSync(DATA_DIR);
        // Note: This is a basic check, actual free space requires platform-specific code
        console.log('[Init] Directory structure verified');
    } catch (statErr) {
        console.warn(`[Warning] Could not verify directory stats: ${statErr.message}`);
    }

} catch (err) {
    // Logger not yet initialized, use console for fatal errors
    console.error('');
    console.error('========================================');
    console.error('[Fatal] Storage Access Error');
    console.error('========================================');
    console.error(`Error: ${err.message}`);
    console.error(`Path: ${err.path || DATA_DIR}`);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Run: .\\diagnose-server.bat');
    console.error('  2. Check folder permissions');
    console.error('  3. Ensure adequate disk space');
    console.error('  4. See: TROUBLESHOOTING.md');
    console.error('');
    process.exit(1);
}

// --- Database Layer ---
console.log('[Init] Initializing database...');
let dbManager;
try {
    dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect();
    console.log(`[Init] Database connected: ${DB_FILE}`);

    // Initialize default user if database is empty (async, non-blocking)
    setImmediate(async () => {
        try {
            const { initDefaultUser } = require('./init-default-user');
            await initDefaultUser(dbManager);
        } catch (initErr) {
            console.warn('[Init] Could not initialize default user:', initErr.message);
            // Non-fatal - continue server startup
        }
    });
} catch (dbErr) {
    console.error('');
    console.error('========================================');
    console.error('[Fatal] Database Connection Error');
    console.error('========================================');
    console.error(`Error: ${dbErr.message}`);
    console.error(`Database: ${DB_FILE}`);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Check if database file is locked by another process');
    console.error('  2. Verify write permissions in data directory');
    console.error('  3. Run: .\\diagnose-server.bat');
    console.error('  4. See: TROUBLESHOOTING.md');
    console.error('');
    process.exit(1);
}

// --- Logging ---
console.log('[Init] Initializing logging...');
let logger, auditLogger;
try {
    logger = new Logger(DATA_DIR, process.env.LOG_LEVEL || 'INFO');
    auditLogger = new AuditLogger(DATA_DIR);
    rateLimiter.setAuditLogger(auditLogger);
    console.log(`[Init] Logging initialized (Level: ${process.env.LOG_LEVEL || 'INFO'})`);
} catch (logErr) {
    console.error(`[Warning] Logging initialization failed: ${logErr.message}`);
    console.error('[Warning] Continuing without advanced logging...');
    // Create minimal logger fallback
    logger = {
        info: () => { },
        warn: console.warn,
        error: console.error
    };
    auditLogger = {
        logLoginAttempt: () => { },
        logUnauthorizedAccess: () => { },
        logError: () => { }
    };
}

// Helper to map collection names to table names (if they differ)
const TABLE_MAP = {
    'users': 'users',
    'albums': 'albums',
    'photos': 'photos',
    'orders': 'orders',
    'products': 'products',
    'kiosks': 'kiosks',
    'settings': 'settings',
    'destinations': 'destinations',
    'session_types': 'session_types',
    'packs': 'packs',
    'bookings': 'bookings',
    'assets': 'archived_photos',
    'archived_photos': 'archived_photos'
};

// Columns that should be stored as JSON strings
const JSON_COLUMNS = {
    users: ['workingHours'],
    albums: ['categories'],
    photos: ['manualEdits'],
    orders: ['items'],
    kiosks: ['settings'],
    settings: ['value'],
    destinations: ['featuresJSON'],
    packs: ['productsJSON'],
    archived_photos: ['metadata']
};

// Column Aliases for mapping frontend terms to DB columns
const COLUMN_MAP = {
    'created': 'created_at',
    'updated': 'updated_at',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
};

// Whitelist of allowed columns for filtering/sorting (SQL Injection Prevention)
const ALLOWED_COLUMNS = {
    users: ['id', 'name', 'email', 'role', 'status', 'created_at', 'updated_at'],
    albums: ['id', 'title', 'date', 'status', 'photographerId', 'eventType', 'roomNumber', 'source', 'created_at', 'updated_at'],
    orders: ['id', 'date', 'status', 'clientName', 'albumId', 'totalAmount', 'created_at', 'updated_at'],
    photos: ['id', 'albumId', 'url', 'created_at', 'updated_at'],
    products: ['id', 'name', 'price', 'category', 'status', 'created_at', 'updated_at'],
    kiosks: ['id', 'name', 'status', 'lastHeartbeat', 'created_at', 'updated_at'],
    settings: ['id', 'key', 'value', 'created_at', 'updated_at'],
    session_types: ['id', 'name', 'numberOfPhotos', 'price', 'created_at', 'updated_at'],
    packs: ['id', 'name', 'price', 'description', 'created_at', 'updated_at'],
    bookings: ['id', 'clientName', 'bookingDate', 'status', 'photographerId', 'destinationId', 'created_at', 'updated_at'],
    archived_photos: ['id', 'original_photo_id', 'album_id', 'access_code', 'url', 'thumbnail_url', 'status', 'archived_at', 'expires_at']
};

// --- Static File Serving Helper ---
const serveStatic = (res, baseDir, urlPath) => {
    let safePath = urlPath.replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '') safePath = 'index.html';

    let targetPath = path.join(baseDir, safePath);

    // Security check
    if (!targetPath.startsWith(baseDir)) {
        res.writeHead(403); res.end(); return;
    }

    // SPA Fallback: If file not found, serve index.html
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
        targetPath = path.join(baseDir, 'index.html');
    }

    if (fs.existsSync(targetPath)) {
        const ext = path.extname(targetPath).toLowerCase();
        const mime = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        }[ext] || 'application/octet-stream';

        const headers = { 'Content-Type': mime };
        // Add CSP header for HTML files to allow unsafe-eval (needed for Vite dev server and React)
        // CSP must match the HTML meta tag exactly to avoid conflicts
        if (ext === '.html') {
            headers['Content-Security-Policy'] = "script-src 'unsafe-eval' 'unsafe-inline' 'self' http://localhost:* http://127.0.0.1:* https://cdn.tailwindcss.com data: blob:; style-src 'unsafe-inline' 'self' https://cdn.tailwindcss.com; object-src 'none'; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://starmaster.cloud; img-src 'self' data: blob: https: http:;";
        }
        res.writeHead(200, headers);
        fs.createReadStream(targetPath).pipe(res);
    } else {
        sendNotFoundError(res, 'Page');
    }
};

// --- Authentication Middleware ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const clientIp = req.socket.remoteAddress || 'unknown';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        auditLogger.logUnauthorizedAccess(req.url, clientIp, 'NO_TOKEN');
        sendAuthError(res, 'Authentication required. Please provide a valid token in the Authorization header.');
        return false;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
        return true;
    } catch (e) {
        auditLogger.logUnauthorizedAccess(req.url, clientIp, 'INVALID_TOKEN');
        const message = e.name === 'TokenExpiredError'
            ? 'Your session has expired. Please log in again.'
            : 'Invalid authentication token. Please log in again.';
        sendAuthError(res, message);
        return false;
    }
};

/**
 * Process record creation/update (POST/PATCH)
 * Validates data, hashes passwords for users, and saves to database
 * @param {http.IncomingMessage} req - HTTP request object
 * @param {http.ServerResponse} res - HTTP response object
 * @param {string} table - Database table name
 * @param {Object} data - Record data to create/update
 * @param {string} pathName - Request path for error context
 * @returns {Promise<void>}
 */
const processRecordCreation = async (req, res, table, data, pathName) => {
    const saveStartTime = Date.now();

    try {
        // Log incoming data for debugging
        if (table === 'users' || table === 'destinations') {
            logger.info(`Processing ${table} update/create`, {
                method: req.method,
                hasId: !!data.id,
                id: data.id,
                dataKeys: Object.keys(data),
                endpoint: pathName,
                data: table === 'users' ? { ...data, password: data.password ? '[HIDDEN]' : undefined } : data
            });
        }

        // Determine if this is an update (PATCH) or create (POST)
        const isUpdate = req.method === 'PATCH' || (data.id && dbManager.get(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`, [data.id]));

        // Validate request body - use partial schema for updates
        const validation = validateRequest(data, table, isUpdate);
        if (!validation.success) {
            logger.error('Validation failed', {
                table,
                error: validation.error,
                details: validation.details,
                data: table === 'users' ? { ...data, password: data.password ? '[HIDDEN]' : undefined } : data,
                endpoint: pathName
            });
            sendValidationError(res, `Validation failed for ${table} record: ${validation.error}`, validation.details);
            return;
        }

        const validData = validation.data;
        // Generate UUID for tables that use text IDs, skip for auto-increment (users)
        if (!validData.id && table !== 'users') validData.id = crypto.randomUUID();

        // Log validated data before insert (for debugging)
        if (table === 'photos') {
            logger.info('Validated photo data before insert', {
                id: validData.id,
                albumId: validData.albumId,
                photographerId: validData.photographerId,
                title: validData.title,
                url: validData.url ? '[FILE]' : undefined,
                endpoint: pathName
            });
        }

        // Data integrity checks before save
        // Check foreign key constraints
        if (table === 'photos' && validData.albumId) {
            const albumExists = dbManager.get(`SELECT 1 FROM albums WHERE id = ?`, [validData.albumId]);
            if (!albumExists) {
                logger.error('Foreign key constraint violation', {
                    table,
                    field: 'albumId',
                    value: validData.albumId,
                    endpoint: pathName
                });
                sendInvalidInputError(res, `Album with ID '${validData.albumId}' does not exist.`);
                return;
            }
        }

        if (table === 'photos' && validData.photographerId) {
            const photographerExists = dbManager.get(`SELECT 1 FROM users WHERE id = ?`, [validData.photographerId]);
            if (!photographerExists) {
                logger.error('Foreign key constraint violation', {
                    table,
                    field: 'photographerId',
                    value: validData.photographerId,
                    endpoint: pathName
                });
                sendInvalidInputError(res, `Photographer with ID '${validData.photographerId}' does not exist.`);
                return;
            }
        }

        if (table === 'albums' && validData.photographerId) {
            const photographerExists = dbManager.get(`SELECT 1 FROM users WHERE id = ?`, [validData.photographerId]);
            if (!photographerExists) {
                logger.error('Foreign key constraint violation', {
                    table,
                    field: 'photographerId',
                    value: validData.photographerId,
                    endpoint: pathName
                });
                sendInvalidInputError(res, `Photographer with ID '${validData.photographerId}' does not exist.`);
                return;
            }
        }

        // Security: Hash password for users if present
        if (table === 'users' && validData.password) {
            validData.password = await hashPassword(validData.password);
        }

        // Handle JSON serialization
        const jsonCols = JSON_COLUMNS[table] || [];
        const rowData = { ...validData };

        // First, stringify known JSON columns
        jsonCols.forEach(c => {
            if (rowData[c] !== undefined && rowData[c] !== null) {
                if (typeof rowData[c] === 'object') {
                    rowData[c] = JSON.stringify(rowData[c]);
                }
            }
        });

        // Second, check ALL fields to ensure no objects are being passed to SQLite
        // SQLite can only bind: numbers, strings, bigints, buffers, and null
        Object.keys(rowData).forEach(key => {
            const value = rowData[key];
            if (value !== null && value !== undefined) {
                const valueType = typeof value;

                // If it's an object (including arrays) and NOT a Buffer, it needs to be stringified
                if (valueType === 'object' && !Buffer.isBuffer(value)) {
                    logger.warn('Found object value in rowData that needs serialization', {
                        table,
                        field: key,
                        valueType: Array.isArray(value) ? 'array' : 'object',
                        isInJsonCols: jsonCols.includes(key),
                        endpoint: pathName
                    });

                    // Stringify it to prevent SQLite binding error
                    rowData[key] = JSON.stringify(value);
                }
                // Check for other invalid types
                else if (valueType !== 'string' && valueType !== 'number' && valueType !== 'bigint' && valueType !== 'boolean') {
                    logger.error('Invalid value type for SQLite binding', {
                        table,
                        field: key,
                        valueType,
                        value: String(value).substring(0, 100),
                        endpoint: pathName
                    });
                    throw new Error(`Invalid value type for field '${key}': ${valueType}. SQLite can only bind numbers, strings, bigints, buffers, and null.`);
                }
            }
        });

        // Use transaction for data consistency
        const saved = dbManager.transaction(() => {
            // Check if exists
            const existing = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [validData.id]);

            if (existing) {
                // Update with conflict detection
                const keys = Object.keys(rowData).filter(k => k !== 'id');

                // Filter out undefined and null values for updates (except for explicit nulls that should clear fields)
                const updateData = { id: rowData.id };
                keys.forEach(k => {
                    if (rowData[k] !== undefined) {
                        updateData[k] = rowData[k];
                    }
                });

                const updateKeys = Object.keys(updateData).filter(k => k !== 'id');

                if (updateKeys.length > 0) {
                    const setClause = updateKeys.map(k => `${k} = @${k}`).join(', ');

                    if (table === 'users') {
                        logger.info('Updating user', {
                            userId: validData.id,
                            updateKeys,
                            endpoint: pathName
                        });
                    }

                    const updateResult = dbManager.run(`UPDATE ${table} SET ${setClause} WHERE id = @id`, updateData);

                    // Verify update affected a row (conflict detection)
                    if (updateResult.changes === 0) {
                        throw new Error('Update conflict: Record may have been modified or deleted by another operation');
                    }
                } else {
                    logger.warn('No fields to update', { table, id: validData.id, endpoint: pathName });
                }
            } else {
                // Insert
                const keys = Object.keys(rowData);
                const cols = keys.join(', ');
                const vals = keys.map(k => `@${k}`).join(', ');

                // Log SQL for debugging photos
                if (table === 'photos') {
                    logger.info('Inserting photo', {
                        sql: `INSERT INTO ${table} (${cols}) VALUES (${vals})`,
                        rowData: { ...rowData, url: rowData.url ? '[FILE]' : undefined },
                        endpoint: pathName
                    });
                }

                const info = dbManager.run(`INSERT INTO ${table} (${cols}) VALUES (${vals})`, rowData);

                // If ID was auto-generated by DB, add it to response
                if (!validData.id && info.lastInsertRowid) {
                    validData.id = Number(info.lastInsertRowid);
                }
            }

            // Data integrity verification after save
            const saved = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [validData.id]);
            if (!saved) {
                throw new Error('Data integrity check failed: Record was not saved correctly');
            }

            // Verify foreign key relationships still exist
            if (table === 'photos' && saved.albumId) {
                const albumStillExists = dbManager.get(`SELECT 1 FROM albums WHERE id = ?`, [saved.albumId]);
                if (!albumStillExists) {
                    throw new Error('Data integrity check failed: Referenced album no longer exists');
                }
            }

            return saved;
        });

        // Verify the insert worked (for photos)
        if (table === 'photos') {
            logger.info('Photo inserted, verifying', {
                photoId: validData.id,
                albumId: saved?.albumId,
                found: !!saved,
                endpoint: pathName
            });
        }

        // Remove password from response
        if (validData.password) delete validData.password;

        // Parse JSON columns in response
        const jsonColsResponse = JSON_COLUMNS[table] || [];
        const responseData = { ...validData };
        jsonColsResponse.forEach(c => {
            if (saved[c] && typeof saved[c] === 'string') {
                try {
                    responseData[c] = JSON.parse(saved[c]);
                } catch (e) {
                    // Keep original if parsing fails
                }
            }
        });

        // Performance logging
        const saveDuration = Date.now() - saveStartTime;
        logger.info('Save operation completed', {
            table,
            operation: isUpdate ? 'UPDATE' : 'INSERT',
            recordId: validData.id,
            duration: `${saveDuration}ms`,
            endpoint: pathName
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseData));
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));

        // Transaction rollback is automatic in better-sqlite3 if error is thrown
        logger.error(`CRUD Error for ${pathName}`, {
            error: error.message,
            stack: error.stack,
            endpoint: pathName,
            operation: req.method,
            table,
            duration: `${Date.now() - saveStartTime}ms`
        });
        auditLogger.logError(error, { endpoint: pathName, operation: req.method, table });

        if (error.message.includes('UNIQUE constraint') || error.message.includes('already exists')) {
            sendError(res, 409, 'Conflict', `A record with this identifier already exists.`, ERROR_CODES.CONFLICT);
        } else if (error.message.includes('FOREIGN KEY constraint') || error.message.includes('does not exist')) {
            sendInvalidInputError(res, error.message || 'Invalid reference. The referenced record does not exist.');
        } else if (error.message.includes('conflict') || error.message.includes('modified or deleted')) {
            sendError(res, 409, 'Conflict', error.message, ERROR_CODES.CONFLICT);
        } else if (error.message.includes('Data integrity check failed')) {
            sendDatabaseError(res, error, `data integrity verification for ${table}`);
        } else {
            sendDatabaseError(res, error, `${req.method} operation on ${table}`);
        }
    }
};

const server = http.createServer(async (req, res) => {
    // CORS Configuration - Whitelist only
    const origin = req.headers.origin;

    // Check if origin is in whitelist
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (origin) {
        // In development, allow any localhost port for flexibility
        // Match http://localhost:PORT or http://127.0.0.1:PORT
        const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(origin);
        if (isLocalhost) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
            // Fallback to first allowed origin for non-browser requests
            res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0] || '*');
        }
    } else {
        // No origin header (e.g., same-origin or non-browser request)
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0] || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathName = url.pathname;

    // API Routes
    if (pathName.startsWith('/api/')) {
        // --- Cloud Sync Routes ---
        const { handleSyncRequest } = require('./routes/syncRoutes');
        const handled = await handleSyncRequest(req, res, pathName, { logger, uploadDir: UPLOAD_DIR, dbManager });
        if (handled) return;

        // --- Download / Fulfillment Routes ---
        const { handleDownloadRequest } = require('./routes/downloads');
        const downloadHandled = await handleDownloadRequest(req, res, pathName, {
            logger,
            dbManager,
            uploadDir: UPLOAD_DIR,
            authMiddleware
        });
        if (downloadHandled) return;

        /**
         * @route GET /api/health
         * @description Health check endpoint - returns server status
         * @access Public (no authentication required)
         * @returns {Object} { status: 'online', code: 200, version: string, db: string, security: string }
         */
        if (pathName === '/api/health') {
            try {
                const userCount = dbManager.query('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
                const defaultUserExists = dbManager.get('SELECT * FROM users WHERE email = ?', ['alaeddine@example.com']);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'online',
                    code: 200,
                    version: '4.1.0',
                    db: 'sqlite',
                    security: 'enabled',
                    userCount: userCount,
                    defaultUserExists: !!defaultUserExists
                }));
            } catch (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'online', code: 200, version: '4.1.0', db: 'sqlite', security: 'enabled', error: err.message }));
            }
            return;
        }

        /**
         * @route GET /api/ip
         * @description Network interface discovery endpoint - returns available network interfaces
         * @access Public (no authentication required)
         * @returns {Object} { interfaces: Array<{name: string, ip: string}> } - List of network interfaces with IPv4 addresses
         */
        if (pathName === '/api/ip' && req.method === 'GET') {
            // Debug: Log that we're hitting the endpoint
            logger.info('IP discovery endpoint accessed', { path: pathName, method: req.method });
            try {
                const results = [];
                const nets = os.networkInterfaces();

                for (const name of Object.keys(nets)) {
                    for (const net of nets[name]) {
                        // Only include IPv4 addresses that are not internal (loopback)
                        // Handle both string ('IPv4') and number (4) family formats
                        const isIPv4 = net.family === 'IPv4' || net.family === 4;
                        if (isIPv4 && !net.internal) {
                            results.push({ name: name, ip: net.address });
                        }
                    }
                }

                // If no external interfaces found, include loopback as fallback
                if (results.length === 0) {
                    results.push({ name: 'Loopback', ip: '127.0.0.1' });
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ interfaces: results }));
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error));
                logger.error('IP discovery error', {
                    error: errorObj.message,
                    stack: errorObj.stack,
                    endpoint: '/api/ip'
                });
                // Return loopback as fallback on error
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ interfaces: [{ name: 'Loopback', ip: '127.0.0.1' }] }));
            }
            return;
        }

        /**
         * @route POST /api/init/default-user
         * @description Initialize or reset default admin user
         * @access Public (no authentication required)
         * @query {boolean} force - If true, will delete and recreate the user even if it exists
         * @returns {Object} { success: boolean, message: string }
         */
        if (pathName === '/api/init/default-user' && req.method === 'POST') {
            // Read body (even if empty) to properly handle POST request
            let body = '';
            req.on('data', c => body += c);
            req.on('end', async () => {
                try {
                    const urlObj = new URL(req.url, `http://${req.headers.host}`);
                    const force = urlObj.searchParams.get('force') === 'true';

                    // Check if default user already exists
                    const existingUser = dbManager.get('SELECT * FROM users WHERE email = ?', ['alaeddine@example.com']);

                    // Default user credentials
                    const DEFAULT_USER = {
                        name: 'Alaeddine',
                        email: 'alaeddine@example.com',
                        password: 'DEFAULT_PASSWORD_PLACEHOLDER',
                        role: 'Admin'
                    };

                    // Check if password is properly hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
                    const isPasswordHashed = existingUser?.password && (
                        existingUser.password.startsWith('$2a$') ||
                        existingUser.password.startsWith('$2b$') ||
                        existingUser.password.startsWith('$2y$')
                    );

                    // If user exists and password is valid, and force is not true, just return success
                    if (existingUser && isPasswordHashed && !force) {
                        // Verify password can be verified (test with default password)
                        try {
                            const testPassword = await verifyPassword(DEFAULT_USER.password, existingUser.password);
                            if (testPassword) {
                                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                res.end(JSON.stringify({
                                    success: true,
                                    message: 'Default user already exists and password is valid.',
                                    user: {
                                        email: existingUser.email,
                                        role: existingUser.role
                                    }
                                }));
                                return;
                            }
                        } catch (verifyErr) {
                            logger.warn('Password verification failed, will reset', {
                                error: verifyErr.message,
                                email: existingUser.email
                            });
                            // Continue to reset password below
                        }
                    }

                    // If password is not hashed or invalid, or force is true, reset/recreate user
                    if (existingUser && (!isPasswordHashed || force)) {
                        if (force) {
                            // Delete and recreate
                            dbManager.run('DELETE FROM users WHERE email = ?', ['alaeddine@example.com']);
                            logger.info('Deleted existing default user for recreation', { email: 'alaeddine@example.com' });
                        } else {
                            // Just update password if it's invalid
                            logger.info('Resetting invalid password for existing user', { email: 'alaeddine@example.com' });
                        }
                    }

                    // Create or update default user
                    const hashedPassword = await hashPassword(DEFAULT_USER.password);

                    if (existingUser && !force && isPasswordHashed) {
                        // Update only password for existing user
                        dbManager.run('UPDATE users SET password = ?, name = ?, role = ? WHERE email = ?', [
                            hashedPassword,
                            DEFAULT_USER.name,
                            DEFAULT_USER.role,
                            DEFAULT_USER.email
                        ]);
                        logger.info('Default user password updated via API', { email: DEFAULT_USER.email });
                    } else {
                        // Insert new user
                        const insertSql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
                        dbManager.run(insertSql, [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role]);
                        logger.info('Default user created/reset via API', { email: DEFAULT_USER.email, forced: force });
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({
                        success: true,
                        message: force
                            ? 'Default admin user reset successfully'
                            : (existingUser ? 'Default admin user password reset successfully' : 'Default admin user created successfully'),
                        user: {
                            email: DEFAULT_USER.email,
                            role: DEFAULT_USER.role
                        }
                    }));
                } catch (err) {
                    logger.error('Failed to initialize default user', { error: err.message });
                    sendInternalError(res, 'Failed to initialize default user: ' + err.message);
                }
            });
            return;
        }

        /**
         * @route POST /api/auth/login
         * @description User authentication endpoint - validates credentials and returns JWT token
         * @access Public (no authentication required)
         * @body {Object} { email: string, password: string }
         * @returns {Object} { token: string, user: Object } - JWT token and user object (password excluded)
         * @returns {Object} 400 - Validation failed
         * @returns {Object} 401 - Invalid credentials
         */
        if (pathName === '/api/auth/login' && req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', async () => {
                try {
                    const parsedBody = JSON.parse(body);

                    // Validate login request
                    const validation = validateLogin(parsedBody);
                    if (!validation.success) {
                        sendValidationError(res, 'Invalid login credentials. Please check your email and password format.', validation.details);
                        return;
                    }

                    const { email, password } = validation.data;
                    const clientIp = req.socket.remoteAddress || 'unknown';

                    // Query user from database
                    let user = dbManager.get('SELECT * FROM users WHERE email = ?', [email]);

                    // If user doesn't exist, create default user if credentials match
                    if (!user) {
                        logger.info('Login attempt - user not found', { email, matchingCredentials: email === 'alaeddine@example.com' && password === 'DEFAULT_PASSWORD_PLACEHOLDER' });

                        // Auto-create if credentials match default (regardless of other users)
                        if (email === 'alaeddine@example.com' && password === 'DEFAULT_PASSWORD_PLACEHOLDER') {
                            try {
                                logger.info('Attempting to auto-create default user', { email });
                                const DEFAULT_USER = {
                                    name: 'Alaeddine',
                                    email: 'alaeddine@example.com',
                                    password: 'DEFAULT_PASSWORD_PLACEHOLDER',
                                    role: 'Admin'
                                };

                                const hashedPassword = await hashPassword(DEFAULT_USER.password);
                                const insertSql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
                                const insertResult = dbManager.run(insertSql, [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role]);

                                logger.info('Default user auto-created during login', { email: DEFAULT_USER.email, insertId: insertResult.lastInsertRowid });

                                // Fetch the newly created user
                                user = dbManager.get('SELECT * FROM users WHERE email = ?', [email]);

                                if (!user) {
                                    logger.error('User was created but could not be retrieved', { email, insertId: insertResult.lastInsertRowid });
                                } else {
                                    logger.info('User retrieved after creation', { email, userId: user.id });
                                }
                            } catch (createErr) {
                                logger.error('Failed to auto-create default user during login', { error: createErr.message, stack: createErr.stack });
                                // Continue to show error below
                            }
                        }

                        // If still no user, show error
                        if (!user) {
                            auditLogger.logLoginAttempt(email, false, clientIp, 'USER_NOT_FOUND');
                            sendAuthError(res, 'Invalid email or password. Please check your credentials and try again.');
                            return;
                        }
                    }

                    // Verify password using bcrypt
                    let isValidPassword = false;

                    // Check if user has a password
                    if (!user.password) {
                        logger.warn('User has no password set', {
                            email,
                            userId: user.id
                        });
                        isValidPassword = false;
                    } else {
                        // Check if password hash is valid (bcrypt hashes start with $2a$, $2b$, or $2y$)
                        const isPasswordHashed = user.password && (
                            user.password.startsWith('$2a$') ||
                            user.password.startsWith('$2b$') ||
                            user.password.startsWith('$2y$')
                        );

                        if (isPasswordHashed) {
                            // Password is hashed, verify using bcrypt
                            try {
                                isValidPassword = await verifyPassword(password, user.password);
                                if (!isValidPassword) {
                                    logger.info('Password verification failed', {
                                        email,
                                        userId: user.id
                                    });
                                }
                            } catch (verifyErr) {
                                logger.error('Password verification error', {
                                    error: verifyErr.message,
                                    email,
                                    userId: user.id,
                                    passwordHashLength: user.password?.length,
                                    stack: verifyErr.stack
                                });
                                isValidPassword = false;
                            }
                        } else {
                            // Password is not hashed (legacy or corrupted), treat as invalid
                            logger.warn('User password is not properly hashed', {
                                email,
                                userId: user.id,
                                passwordLength: user.password?.length,
                                passwordPrefix: user.password?.substring(0, 10)
                            });
                            isValidPassword = false;
                        }
                    }

                    // If password is invalid but credentials match default, reset the password
                    if (!isValidPassword && email === 'alaeddine@example.com' && password === 'DEFAULT_PASSWORD_PLACEHOLDER') {
                        try {
                            logger.info('Password invalid but credentials match default, resetting password', {
                                email,
                                userId: user.id,
                                wasHashed: user.password?.startsWith('$2') || false,
                                hasPassword: !!user.password
                            });
                            const hashedPassword = await hashPassword(password);
                            dbManager.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
                            logger.info('Password reset successfully', { email });
                            // Re-fetch user to get updated data
                            user = dbManager.get('SELECT * FROM users WHERE email = ?', [email]);
                            if (user && user.password) {
                                // Verify the newly hashed password
                                try {
                                    isValidPassword = await verifyPassword(password, user.password);
                                    if (isValidPassword) {
                                        logger.info('Password reset and verified successfully', { email });
                                    } else {
                                        logger.error('Password reset but verification failed - retrying with new hash', { email });
                                        // If verification still fails, try one more time with a fresh hash
                                        const retryHash = await hashPassword(password);
                                        dbManager.run('UPDATE users SET password = ? WHERE email = ?', [retryHash, email]);
                                        user = dbManager.get('SELECT * FROM users WHERE email = ?', [email]);
                                        isValidPassword = await verifyPassword(password, user.password);
                                        if (isValidPassword) {
                                            logger.info('Password reset successful on retry', { email });
                                        } else {
                                            logger.error('Password reset failed even after retry', { email });
                                        }
                                    }
                                } catch (verifyErr) {
                                    logger.error('Password reset but verification error', {
                                        error: verifyErr.message,
                                        email
                                    });
                                    // Try one more time
                                    try {
                                        const retryHash = await hashPassword(password);
                                        dbManager.run('UPDATE users SET password = ? WHERE email = ?', [retryHash, email]);
                                        user = dbManager.get('SELECT * FROM users WHERE email = ?', [email]);
                                        isValidPassword = await verifyPassword(password, user.password);
                                    } catch (retryErr) {
                                        logger.error('Retry also failed', { error: retryErr.message, email });
                                    }
                                }
                            } else {
                                logger.error('User not found or has no password after reset', { email });
                            }
                        } catch (resetErr) {
                            logger.error('Failed to reset password', {
                                error: resetErr.message,
                                stack: resetErr.stack,
                                email
                            });
                            // Continue with invalid password error
                        }
                    }

                    if (!isValidPassword) {
                        auditLogger.logLoginAttempt(email, false, clientIp, 'INVALID_PASSWORD');
                        sendAuthError(res, 'Invalid email or password. Please check your credentials and try again.');
                        return;
                    }

                    // Log successful login
                    auditLogger.logLoginAttempt(email, true, clientIp);

                    // Generate JWT token
                    const token = jwt.sign(
                        { id: user.id, email: user.email, role: user.role },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    // Remove password from response
                    delete user.password;

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ token, user }));
                } catch (e) {
                    const error = e instanceof Error ? e : new Error(String(e));
                    const clientIp = req.socket.remoteAddress || 'unknown';
                    logger.error('Login error', {
                        error: error.message,
                        stack: error.stack,
                        endpoint: '/api/auth/login',
                        ip: clientIp
                    });
                    auditLogger.logError(error, { endpoint: '/api/auth/login', ip: clientIp });

                    if (error instanceof SyntaxError) {
                        sendInvalidInputError(res, 'Invalid request format. Please ensure your request is valid JSON.');
                    } else {
                        sendInternalError(res, error, 'login endpoint');
                    }
                }
            });
            return;
        }

        /**
         * @route GET /api/orders/by-credentials
         * @description Get order by orderId and email (for customer portal login)
         * @access Public (no authentication required)
         * @query {string} orderId - Order ID
         * @query {string} email - Customer email
         * @returns {Object} Order object with items or null if not found
         */
        if (pathName === '/api/orders/by-credentials' && req.method === 'GET') {
            try {
                const urlObj = new URL(req.url, `http://${req.headers.host}`);

                // Query order from database (case-insensitive email comparison)
                const order = dbManager.get('SELECT * FROM orders WHERE id = ? AND LOWER(TRIM(email)) = ?', [orderId, email]);

                if (!order) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(null));
                    return;
                }

                // Parse items JSON
                let items = [];
                try {
                    if (order.items && typeof order.items === 'string') {
                        items = JSON.parse(order.items);
                    } else if (Array.isArray(order.items)) {
                        items = order.items;
                    }
                } catch (parseError) {
                    logger.warn('Failed to parse order items JSON', { orderId, error: parseError });
                    items = [];
                }

                // Format order response
                const orderResponse = {
                    id: order.id,
                    date: order.date,
                    clientName: order.clientName,
                    email: order.email,
                    status: order.status,
                    total: order.total,
                    photographerId: order.photographerId,
                    destinationId: order.destinationId,
                    appliedDiscount: order.appliedDiscount || 0,
                    items: items
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(orderResponse));
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error));
                logger.error('Order lookup error', {
                    error: errorObj.message,
                    stack: errorObj.stack,
                    endpoint: pathName
                });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
            return;
        }

        // All other API routes require authentication
        // Apply rate limiting before authentication
        const rateOk = rateLimiter(req, res, () => { });
        if (!rateOk) return; // Rate limit exceeded, response already sent
        const authResult = authMiddleware(req, res, () => { });
        if (!authResult) return; // Authentication failed, response already sent

        /**
         * @route POST /api/data/refresh
         * @description Refresh data for specified collections or all collections
         * @access Protected (requires authentication)
         * @body {Object} { collections?: string[], incremental?: boolean }
         * @returns {Object} { success: boolean, refreshed: string[], status: Object }
         */
        if (pathName === '/api/data/refresh' && req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', async () => {
                try {
                    const refreshStartTime = Date.now();
                    const requestData = body ? JSON.parse(body) : {};
                    const collections = requestData.collections || null; // null means all collections
                    const incremental = requestData.incremental !== false; // default true

                    logger.info('Data refresh requested', {
                        collections: collections || 'all',
                        incremental,
                        endpoint: pathName
                    });

                    // Track refresh status
                    const refreshStatus = {
                        startTime: new Date().toISOString(),
                        collections: {},
                        errors: []
                    };

                    // Available collections
                    const availableCollections = Object.keys(TABLE_MAP);
                    const collectionsToRefresh = collections
                        ? collections.filter(c => availableCollections.includes(c))
                        : availableCollections;

                    // Refresh each collection
                    for (const collection of collectionsToRefresh) {
                        try {
                            const table = TABLE_MAP[collection] || collection;

                            if (incremental) {
                                // Incremental refresh: only get records modified since last refresh
                                // For now, we'll just verify the collection exists and is accessible
                                const count = dbManager.query(`SELECT COUNT(*) as count FROM ${table}`)[0]?.count || 0;
                                refreshStatus.collections[collection] = {
                                    status: 'refreshed',
                                    recordCount: count,
                                    incremental: true
                                };
                            } else {
                                // Full refresh: get all records
                                const count = dbManager.query(`SELECT COUNT(*) as count FROM ${table}`)[0]?.count || 0;
                                refreshStatus.collections[collection] = {
                                    status: 'refreshed',
                                    recordCount: count,
                                    incremental: false
                                };
                            }

                            logger.info('Collection refreshed', {
                                collection,
                                table,
                                recordCount: refreshStatus.collections[collection].recordCount
                            });
                        } catch (collectionError) {
                            const error = collectionError instanceof Error ? collectionError : new Error(String(collectionError));
                            refreshStatus.errors.push({
                                collection,
                                error: error.message
                            });
                            logger.error('Collection refresh failed', {
                                collection,
                                error: error.message,
                                stack: error.stack
                            });
                        }
                    }

                    const refreshDuration = Date.now() - refreshStartTime;
                    refreshStatus.endTime = new Date().toISOString();
                    refreshStatus.duration = `${refreshDuration}ms`;
                    refreshStatus.success = refreshStatus.errors.length === 0;

                    logger.info('Data refresh completed', {
                        collectionsRefreshed: collectionsToRefresh.length,
                        errors: refreshStatus.errors.length,
                        duration: refreshStatus.duration
                    });

                    if (!res.headersSent) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: refreshStatus.success,
                            refreshed: collectionsToRefresh,
                            status: refreshStatus
                        }));
                    }
                } catch (e) {
                    const error = e instanceof Error ? e : new Error(String(e));
                    logger.error('Data refresh error', {
                        error: error.message,
                        stack: error.stack,
                        endpoint: pathName
                    });
                    auditLogger.logError(error, { endpoint: pathName, operation: 'POST' });
                    if (!res.headersSent) {
                        sendInternalError(res, error, 'data refresh');
                    }
                }
            });
            return;
        }

        /**
         * @route POST /api/system/erase-customer-data
         * @description GDPR Article 17 — Right to Erasure. Deletes all PII for a specific customer.
         * @access Protected (requires authentication)
         * @body { email: string } — customer email to erase
         * @returns {Object} { success: boolean, deleted: object }
         */
        if (pathName === '/api/system/erase-customer-data' && req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', async () => {
                try {
                    const { email } = JSON.parse(body || '{}');
                    if (!email) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: false, error: 'email is required' }));
                    }
                    logger.warn('GDPR erasure requested', { email, requestedBy: authResult.user?.email });

                    // Find all orders + gallery tokens for this email
                    const deletedOrders = db.run('DELETE FROM orders WHERE email = ?', [email]);
                    const deletedTokens = db.run('DELETE FROM gallery_tokens WHERE customer_email = ?', [email]);
                    const deletedBookings = db.run('DELETE FROM bookings WHERE email = ?', [email]);

                    const deleted = {
                        orders: deletedOrders.changes || 0,
                        gallery_tokens: deletedTokens.changes || 0,
                        bookings: deletedBookings.changes || 0,
                    };

                    auditLogger.logError(new Error('GDPR erasure executed'), {
                        endpoint: pathName,
                        email,
                        deleted,
                        requestedBy: authResult.user?.email
                    });

                    logger.info('GDPR erasure completed', { email, deleted });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, deleted }));
                } catch (e) {
                    const error = e instanceof Error ? e : new Error(String(e));
                    logger.error('GDPR erasure error', { error: error.message });
                    sendInternalError(res, error, 'gdpr erasure');
                }
            });
            return;
        }

        /**
         * @route POST /api/reset
         * @description Factory reset - Delete all data from all tables (destructive operation)
         * @access Protected (requires authentication)
         * @returns {Object} { success: boolean, message: string }
         */
        if (pathName === '/api/reset' && req.method === 'POST') {
            let body = '';
            req.on('data', c => body += c);
            req.on('end', async () => {
                try {
                    logger.warn('Factory reset requested', {
                        endpoint: pathName,
                        user: authResult.user?.email || 'unknown'
                    });

                    // Get all tables to reset (in order to respect foreign key constraints)
                    // Delete in reverse dependency order
                    const tablesToReset = [
                        'photos',        // Depends on albums
                        'orders',        // May reference albums/users
                        'bookings',      // May reference users/destinations
                        'albums',        // May reference users
                        'packs',
                        'products',
                        'destinations',
                        'session_types',
                        'kiosks',
                        'settings',
                        'users'         // Delete users last (but we'll recreate default user)
                    ];

                    let deletedCounts = {};
                    let errors = [];

                    // Delete all data from each table
                    for (const table of tablesToReset) {
                        try {
                            const result = dbManager.run(`DELETE FROM ${table}`);
                            const deleted = result.changes || 0;
                            deletedCounts[table] = deleted;
                            logger.info(`Reset: Deleted ${deleted} records from ${table}`);
                        } catch (tableError) {
                            const error = tableError instanceof Error ? tableError : new Error(String(tableError));
                            errors.push({ table, error: error.message });
                            logger.error(`Reset: Failed to delete from ${table}`, {
                                error: error.message,
                                stack: error.stack
                            });
                        }
                    }

                    // Recreate default admin user
                    try {
                        const DEFAULT_USER = {
                            name: 'Alaeddine',
                            email: 'alaeddine@example.com',
                            password: 'DEFAULT_PASSWORD_PLACEHOLDER',
                            role: 'Admin'
                        };

                        const hashedPassword = await hashPassword(DEFAULT_USER.password);
                        const insertSql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
                        dbManager.run(insertSql, [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role]);
                        logger.info('Reset: Recreated default admin user');
                    } catch (userError) {
                        const error = userError instanceof Error ? userError : new Error(String(userError));
                        errors.push({ table: 'users (recreate)', error: error.message });
                        logger.error('Reset: Failed to recreate default user', {
                            error: error.message,
                            stack: error.stack
                        });
                    }

                    // Log the reset operation
                    auditLogger.logError(new Error('Factory reset executed'), {
                        endpoint: pathName,
                        operation: 'POST',
                        deletedCounts,
                        errors: errors.length > 0 ? errors : undefined
                    });

                    if (errors.length > 0) {
                        logger.warn('Factory reset completed with errors', { errors });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            message: 'Reset completed with some errors. Check logs for details.',
                            deletedCounts,
                            errors
                        }));
                    } else {
                        logger.info('Factory reset completed successfully', { deletedCounts });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            message: 'Database reset successfully. All data has been deleted and default user recreated.',
                            deletedCounts
                        }));
                    }
                } catch (e) {
                    const error = e instanceof Error ? e : new Error(String(e));
                    logger.error('Factory reset error', {
                        error: error.message,
                        stack: error.stack,
                        endpoint: pathName
                    });
                    auditLogger.logError(error, { endpoint: pathName, operation: 'POST' });
                    sendInternalError(res, error, 'factory reset');
                }
            });
            return;
        }

        /**
         * @route GET /api/files/{collection}/{id}/{filename}
         * @description Serve static files (photos, uploads) from the server
         * @access Protected (requires authentication)
         * @param {string} collection - Collection name (e.g., 'photos')
         * @param {string} id - Record ID
         * @param {string} filename - File name to retrieve
         * @returns {Stream} File content
         * @returns {number} 403 - Forbidden (directory traversal attempt)
         * @returns {number} 404 - File not found
         */
        if (pathName.startsWith('/api/files/')) {
            const parts = pathName.split('/').filter(p => p); // Filter empty strings
            // Expected format: /api/files/{collection}/{id}/{filename}
            // For organized photos: /api/files/photos/{id}/albumId/photoId.ext
            // After split and filter: ['api', 'files', 'photos', 'id', 'albumId', 'photoId.ext']
            if (parts.length < 5 || parts[0] !== 'api' || parts[1] !== 'files') {
                sendFileError(res, 'Invalid file path format. Expected: /api/files/{collection}/{id}/{filename}', ERROR_CODES.AUTHORIZATION_ERROR);
                return;
            }

            const collection = parts[2];
            const recordId = parts[3];
            // Join all parts after the recordId to handle paths like "albumId/photoId.ext"
            const filePathParts = parts.slice(4);
            const relativeFilePath = filePathParts.join('/');

            // Security: Protection against directory traversal (only check for '..', allow '/' for organized paths)
            if (!relativeFilePath || relativeFilePath.includes('..')) {
                sendFileError(res, 'Invalid file path. Directory traversal is not allowed.', ERROR_CODES.AUTHORIZATION_ERROR);
                return;
            }

            // All files (including photos) are served from UPLOAD_DIR (pb_data/uploads)
            // Support both old format (flat filename) and new organized format (albumId/photoId.ext)
            const targetDir = UPLOAD_DIR;
            const filepath = path.join(targetDir, relativeFilePath);

            // Verify file exists and is within the target directory (additional security)
            // Normalize paths to handle different path separators
            const normalizedTargetDir = path.normalize(targetDir);
            const normalizedFilepath = path.normalize(filepath);
            if (!normalizedFilepath.startsWith(normalizedTargetDir)) {
                sendFileError(res, 'Invalid file path. Security check failed.', ERROR_CODES.AUTHORIZATION_ERROR);
                return;
            }

            if (fs.existsSync(filepath)) {
                // Set appropriate content type for images
                const ext = path.extname(relativeFilePath).toLowerCase();
                const mimeTypes = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp'
                };
                const contentType = mimeTypes[ext] || 'application/octet-stream';

                res.writeHead(200, { 'Content-Type': contentType });
                fs.createReadStream(filepath).pipe(res);
            } else {
                logger.warn('File not found', { filepath, collection, recordId, relativeFilePath, endpoint: pathName });
                sendNotFoundError(res, `File '${relativeFilePath}'`);
            }
            return;
        }

        /**
         * @route GET|POST|PATCH|DELETE /api/collections/{collection}/records
         * @description CRUD operations for database collections
         * @access Protected (requires authentication)
         * @param {string} collection - Collection/table name (users, albums, photos, orders, products, kiosks, settings)
         * 
         * GET - List records with optional filtering, sorting, pagination
         * @query {string} filter - Filter expression (e.g., "status='Pending'")
         * @query {string} sort - Sort expression (e.g., "-created" for DESC, "+created" for ASC)
         * @query {string} expand - Expand relations (e.g., "photos_via_album")
         * @query {number} page - Page number for pagination (default: 1)
         * @query {number} perPage - Items per page (default: all, max: 500)
         * @returns {Object} { items: Array, page?: number, perPage?: number, totalItems?: number, totalPages?: number }
         * 
         * POST - Create new record
         * @body {Object} Record data (validated against schema)
         * @returns {Object} Created record
         * 
         * PATCH - Update existing record
         * @body {Object} Partial record data
         * @returns {Object} Updated record
         * 
         * DELETE - Delete record
         * @param {string} id - Record ID in query string or body
         * @returns {number} 204 - Success
         */
        if (pathName.includes('/records')) {
            const col = pathName.split('/')[3]; // /api/collections/:col/records
            const table = TABLE_MAP[col] || col;

            // Check if table exists (basic check)
            try {
                dbManager.query(`SELECT 1 FROM ${table} LIMIT 1`);
            } catch (e) {
                // Table might not exist or not be mapped
                const errorMsg = e instanceof Error ? e.message : String(e);
                logger.error(`Table access error for '${table}'`, {
                    table,
                    collection: col,
                    endpoint: pathName,
                    error: errorMsg,
                    suggestion: errorMsg.includes('no such table') ? 'Table does not exist. Run migrations or restart server.' : 'Unknown error'
                });

                if (errorMsg.includes('no such table')) {
                    sendError(res, 500, 'Database Error', `Table '${table}' does not exist. Please restart the server to run migrations.`, ERROR_CODES.DATABASE_ERROR);
                } else {
                    sendNotFoundError(res, `Collection '${col}' (${errorMsg})`);
                }
                return;
            }

            if (req.method === 'GET') {
                try {
                    const urlObj = new URL(req.url, `http://${req.headers.host}`);
                    const filterParam = urlObj.searchParams.get('filter');
                    const sortParam = urlObj.searchParams.get('sort');
                    const expandParam = urlObj.searchParams.get('expand');
                    const pageParam = urlObj.searchParams.get('page');
                    const perPageParam = urlObj.searchParams.get('perPage');

                    // Pagination defaults
                    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
                    const perPage = perPageParam ? Math.min(500, Math.max(1, parseInt(perPageParam, 10))) : null; // Max 500 per page

                    let sql = `SELECT * FROM ${table}`;
                    let params = [];
                    let countSql = `SELECT COUNT(*) as total FROM ${table}`;
                    let countParams = [];

                    // 1. Basic Filtering (SQL Injection Prevention)
                    let whereClause = '';
                    if (filterParam) {
                        // Log raw filter parameter for debugging
                        if (table === 'photos') {
                            logger.info('Raw filter parameter received', { filter: filterParam, table, endpoint: pathName });
                        }

                        // Handle: albumId="abc123" or status='Finalized' or photographerId=1
                        // Support both quoted and unquoted values
                        let match = filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*"([^"]+)"/); // Double quotes
                        if (!match) {
                            match = filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*'([^']+)'/); // Single quotes
                        }
                        if (!match) {
                            match = filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*([^"'\s]+)/); // No quotes
                        }

                        if (match) {
                            let key = match[1];
                            const val = match[2];

                            // Apply mapping
                            key = COLUMN_MAP[key] || key;

                            // Whitelist validation - CRITICAL SECURITY CHECK
                            if (!ALLOWED_COLUMNS[table] || !ALLOWED_COLUMNS[table].includes(key)) {
                                sendInvalidInputError(res, `Invalid filter column '${key}'. Allowed columns: ${ALLOWED_COLUMNS[table]?.join(', ') || 'none'}`);
                                return;
                            }

                            whereClause = ` WHERE ${key} = ?`;
                            sql += whereClause;
                            countSql += whereClause;
                            params.push(val);
                            countParams.push(val);

                            // Log filter for debugging
                            if (table === 'photos') {
                                logger.info('Filter parsed successfully', {
                                    originalFilter: filterParam,
                                    key,
                                    val,
                                    sql,
                                    params,
                                    endpoint: pathName
                                });
                            }
                        } else {
                            logger.warn('Filter parsing failed', {
                                filter: filterParam,
                                table,
                                endpoint: pathName,
                                filterLength: filterParam.length,
                                filterChars: filterParam.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' ')
                            });
                        }
                    }

                    // 2. Sorting (SQL Injection Prevention)
                    if (sortParam) {
                        // Handle: -created, +created, created
                        const desc = sortParam.startsWith('-');
                        let key = sortParam.replace(/^[+-]/, '');

                        // Apply mapping
                        key = COLUMN_MAP[key] || key;

                        // Whitelist validation - CRITICAL SECURITY CHECK
                        if (ALLOWED_COLUMNS[table] && ALLOWED_COLUMNS[table].includes(key)) {
                            sql += ` ORDER BY ${key} ${desc ? 'DESC' : 'ASC'}`;
                        } else {
                            sendInvalidInputError(res, `Invalid sort column '${key}'. Allowed columns: ${ALLOWED_COLUMNS[table]?.join(', ') || 'none'}`);
                            return;
                        }
                    }

                    // 3. Pagination
                    let totalItems = null;
                    if (perPage !== null) {
                        // Get total count for pagination metadata
                        const countResult = dbManager.query(countSql, countParams);
                        totalItems = countResult[0]?.total || 0;

                        // Apply LIMIT and OFFSET
                        const offset = (page - 1) * perPage;
                        sql += ` LIMIT ? OFFSET ?`;
                        params.push(perPage, offset);
                    }

                    // Track fetch performance
                    const fetchStartTime = Date.now();

                    let rows = dbManager.query(sql, params);

                    // Log query results for debugging
                    if (table === 'photos') {
                        logger.info('Photos query result', {
                            sql,
                            params,
                            rowCount: rows.length,
                            endpoint: pathName
                        });
                    }

                    // 3. Expansion (Manual handling for known relations)
                    if (expandParam && expandParam.includes('photos_via_album') && table === 'albums') {
                        rows = rows.map(album => {
                            const photos = dbManager.query(`SELECT * FROM photos WHERE albumId = ?`, [album.id]);
                            logger.info('Expanded photos for album', { albumId: album.id, photoCount: photos.length });
                            return { ...album, expand: { photos_via_album: photos } };
                        });
                    }

                    // Parse JSON columns back to objects with enhanced error handling
                    const parsedRows = rows.map((row, index) => {
                        try {
                            const jsonCols = JSON_COLUMNS[table] || [];
                            const parsedRow = { ...row };

                            jsonCols.forEach(c => {
                                if (parsedRow[c] && typeof parsedRow[c] === 'string') {
                                    try {
                                        parsedRow[c] = JSON.parse(parsedRow[c]);
                                    } catch (parseError) {
                                        logger.warn('Failed to parse JSON column', {
                                            table,
                                            column: c,
                                            rowIndex: index,
                                            rowId: row.id,
                                            error: parseError instanceof Error ? parseError.message : String(parseError)
                                        });
                                        // Keep original value if parsing fails
                                    }
                                }
                            });

                            // Data consistency check - verify required fields exist
                            if (table === 'photos' && !parsedRow.albumId) {
                                logger.warn('Photo missing albumId', { photoId: parsedRow.id, rowIndex: index });
                            }
                            if (table === 'albums' && !parsedRow.id) {
                                logger.warn('Album missing id', { rowIndex: index });
                            }

                            return parsedRow;
                        } catch (rowError) {
                            logger.error('Error processing row', {
                                table,
                                rowIndex: index,
                                rowId: row?.id,
                                error: rowError instanceof Error ? rowError.message : String(rowError)
                            });
                            // Return row as-is if processing fails
                            return row;
                        }
                    });

                    // Performance logging
                    const fetchDuration = Date.now() - fetchStartTime;
                    logger.info('Fetch operation completed', {
                        table,
                        rowCount: parsedRows.length,
                        duration: `${fetchDuration}ms`,
                        hasPagination: perPage !== null,
                        endpoint: pathName
                    });

                    // Set cache headers for read-only operations (5 minutes cache)
                    const cacheHeaders = {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, max-age=300' // 5 minutes
                    };

                    // Return paginated response if pagination was requested
                    if (perPage !== null && totalItems !== null) {
                        res.writeHead(200, cacheHeaders);
                        res.end(JSON.stringify({
                            items: parsedRows,
                            page: page,
                            perPage: perPage,
                            totalItems: totalItems,
                            totalPages: Math.ceil(totalItems / perPage)
                        }));
                    } else {
                        // Return simple array for backward compatibility
                        res.writeHead(200, cacheHeaders);
                        res.end(JSON.stringify({ items: parsedRows }));
                    }
                } catch (e) {
                    const error = e instanceof Error ? e : new Error(String(e));
                    logger.error(`GET Error for ${pathName}`, {
                        error: error.message,
                        stack: error.stack,
                        endpoint: pathName,
                        operation: 'GET',
                        table
                    });
                    auditLogger.logError(error, { endpoint: pathName, operation: 'GET' });
                    sendDatabaseError(res, error, `fetching records from ${table}`);
                }
                return;
            }

            if (req.method === 'POST') {
                const contentType = req.headers['content-type'] || '';

                // Handle Multipart/Form-Data (File Uploads)
                if (contentType.includes('multipart/form-data') && formidable) {
                    // All files (including imported photos) are stored in UPLOAD_DIR (pb_data/uploads) - the main database folder
                    const targetDir = UPLOAD_DIR;

                    const form = formidable({
                        multiples: true,
                        uploadDir: targetDir, // Upload directly to target directory
                        keepExtensions: true,
                        maxFileSize: 500 * 1024 * 1024, // 500MB
                    });

                    form.parse(req, (err, fields, files) => {
                        if (err) {
                            logger.error('File upload error', {
                                error: err.message,
                                stack: err.stack,
                                endpoint: pathName,
                                operation: 'file upload'
                            });
                            auditLogger.logError(err, { endpoint: pathName, operation: 'file upload' });
                            sendFileError(res, `File upload failed: ${err.message}`);
                            return;
                        }

                        // Flatten fields (Formidable v3 returns arrays)
                        const data = {};
                        Object.keys(fields).forEach(key => {
                            const val = fields[key];
                            const fieldValue = Array.isArray(val) && val.length === 1 ? val[0] : val;

                            // Convert numeric fields from FormData strings to numbers
                            if (table === 'photos' && (key === 'photographerId' || key === 'albumId')) {
                                // Keep albumId as string (it's TEXT in DB), but convert photographerId to number
                                if (key === 'photographerId' && fieldValue) {
                                    data[key] = parseInt(fieldValue, 10) || 0;
                                } else if (key === 'albumId') {
                                    // Ensure albumId is a string
                                    data[key] = String(fieldValue || '');
                                } else {
                                    data[key] = fieldValue;
                                }
                            } else if (table === 'albums' && key === 'photographerId' && fieldValue) {
                                data[key] = parseInt(fieldValue, 10) || 0;
                            } else {
                                data[key] = fieldValue;
                            }
                        });

                        // Log all fields for debugging
                        if (table === 'photos') {
                            logger.info('FormData fields extracted', {
                                fields: Object.keys(fields),
                                data: { ...data, url: data.url ? '[FILE]' : undefined },
                                endpoint: pathName
                            });
                        }

                        // Handle files with enhanced photo processing
                        const fileProcessingPromises = [];

                        Object.keys(files).forEach(key => {
                            const fileArr = files[key];
                            const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;

                            if (file) {
                                if ((table === 'photos' || table === 'archived_photos') && (key === 'url' || key === 'preview_file' || key === 'file')) {
                                    // Enhanced photo processing for photos/archived_photos table
                                    const albumId = data.albumId || data.album_id || (Array.isArray(fields.albumId) ? fields.albumId[0] : (Array.isArray(fields.album_id) ? fields.album_id[0] : fields.albumId));
                                    const photoId = data.id || data.original_id || crypto.randomUUID();

                                    // Support original_id for mapping to id
                                    if (!data.id && data.original_id) data.id = data.original_id;
                                    if (!data.album_id && data.albumId) data.album_id = data.albumId;

                                    // Ensure photoId is set in data for consistency
                                    if (!data.id) {
                                        data.id = photoId;
                                    }

                                    // Copy photo to data import folder before processing
                                    // This simulates copying from source to import folder
                                    const copyToImportFolder = async () => {
                                        try {
                                            // Verify source file exists before copying
                                            if (!file || !file.filepath || !fs.existsSync(file.filepath)) {
                                                throw new Error(`Source file not found: ${file?.filepath || 'undefined'}`);
                                            }

                                            // Ensure import directory exists
                                            if (!fs.existsSync(IMPORT_DIR)) {
                                                fs.mkdirSync(IMPORT_DIR, { recursive: true });
                                                logger.info('Created import directory', { importDir: IMPORT_DIR });
                                            }

                                            // Organize imports by date (YYYY-MM-DD format)
                                            const today = new Date();
                                            const dateFolder = today.toISOString().split('T')[0]; // YYYY-MM-DD
                                            const dateImportDir = path.join(IMPORT_DIR, dateFolder);

                                            // Ensure date folder exists
                                            if (!fs.existsSync(dateImportDir)) {
                                                fs.mkdirSync(dateImportDir, { recursive: true });
                                                logger.debug('Created date import directory', { dateImportDir });
                                            }

                                            // Optionally organize by album if albumId is available
                                            let finalImportDir = dateImportDir;
                                            if (albumId) {
                                                const albumImportDir = path.join(dateImportDir, albumId);
                                                if (!fs.existsSync(albumImportDir)) {
                                                    fs.mkdirSync(albumImportDir, { recursive: true });
                                                    logger.debug('Created album import directory', { albumImportDir });
                                                }
                                                finalImportDir = albumImportDir;
                                            }

                                            // Create a copy in the import folder with original filename
                                            const originalFilename = file.originalFilename || file.newFilename || 'photo.jpg';
                                            const importFilePath = path.join(finalImportDir, originalFilename);

                                            // Handle duplicate filenames by adding a timestamp
                                            let finalImportPath = importFilePath;
                                            if (fs.existsSync(finalImportPath)) {
                                                const ext = path.extname(importFilePath);
                                                const name = path.basename(importFilePath, ext);
                                                const timestamp = Date.now();
                                                finalImportPath = path.join(finalImportDir, `${name}_${timestamp}${ext}`);
                                            }

                                            // Ensure the destination directory exists before copying
                                            const destDir = path.dirname(finalImportPath);
                                            if (!fs.existsSync(destDir)) {
                                                fs.mkdirSync(destDir, { recursive: true });
                                            }

                                            // Copy file to import folder using Windows command
                                            await copyFileWindows(file.filepath, finalImportPath);

                                            // Verify copy was successful
                                            if (!fs.existsSync(finalImportPath)) {
                                                throw new Error(`Failed to verify copied file: ${finalImportPath}`);
                                            }

                                            const fileStats = fs.statSync(finalImportPath);

                                            logger.info('Photo copied to data import folder', {
                                                source: file.filepath,
                                                destination: finalImportPath,
                                                originalFilename: originalFilename,
                                                photoId: photoId,
                                                albumId: albumId,
                                                importDate: dateFolder,
                                                fileSize: fileStats.size
                                            });
                                        } catch (copyError) {
                                            // Log error with full details but don't fail the import
                                            logger.error('Failed to copy photo to import folder', {
                                                error: copyError.message,
                                                stack: copyError.stack,
                                                filepath: file?.filepath,
                                                originalFilename: file?.originalFilename,
                                                photoId: photoId,
                                                albumId: albumId,
                                                importDir: IMPORT_DIR
                                            });
                                            // Don't re-throw - allow import to continue even if copy fails
                                        }
                                    };

                                    fileProcessingPromises.push(
                                        copyToImportFolder().then(() =>
                                            photoProcessor.processPhoto(file, albumId, photoId)
                                        )
                                            .then(photoData => {
                                                // Store enhanced metadata
                                                data.url = photoData.url; // Relative path: albumId/photoId.ext

                                                // Support PocketBase/Master App field names for archived_photos
                                                if (table === 'archived_photos') {
                                                    // For archived_photos, url is the main field for the photo path
                                                    data.url = photoData.url;

                                                    // Map other potential fields
                                                    if (!data.original_photo_id) data.original_photo_id = photoId;
                                                    if (!data.album_id) data.album_id = albumId;
                                                }

                                                data.originalFilename = photoData.originalFilename;
                                                data.fileSize = photoData.fileSize;
                                                data.mimeType = photoData.mimeType;
                                                data.width = photoData.width;
                                                data.height = photoData.height;
                                                data.fileHash = photoData.fileHash;

                                                // Set title from original filename if missing
                                                if (!data.title) {
                                                    const nameWithoutExt = path.parse(photoData.originalFilename).name;
                                                    data.title = nameWithoutExt;
                                                }

                                                logger.info('Photo processed and saved successfully', {
                                                    table,
                                                    photoId: photoId,
                                                    albumId: albumId,
                                                    url: photoData.url,
                                                    storagePath: photoData.storagePath,
                                                    originalFilename: photoData.originalFilename,
                                                    endpoint: pathName
                                                });

                                                // Verify file exists on disk
                                                if (photoData.storagePath && fs.existsSync(photoData.storagePath)) {
                                                    const stats = fs.statSync(photoData.storagePath);
                                                    logger.info('Photo file verified on disk', {
                                                        photoId: photoId,
                                                        filePath: photoData.storagePath,
                                                        fileSize: stats.size,
                                                        exists: true
                                                    });
                                                } else {
                                                    logger.error('Photo file NOT found on disk after processing', {
                                                        photoId: photoId,
                                                        expectedPath: photoData.storagePath,
                                                        exists: false
                                                    });
                                                }
                                            })
                                            .catch(error => {
                                                logger.error('Enhanced photo processing failed', {
                                                    error: error.message,
                                                    stack: error.stack,
                                                    photoId: photoId,
                                                    albumId: albumId,
                                                    tempFilepath: file.filepath,
                                                    originalFilename: file.originalFilename,
                                                    endpoint: pathName
                                                });
                                                // Don't fallback silently - throw error to prevent database record without file
                                                throw error;
                                            })
                                    );
                                } else {
                                    // Basic file handling for non-photo files
                                    const storedFilename = file.newFilename;
                                    data[key] = storedFilename;

                                    logger.info('File saved', {
                                        filename: storedFilename,
                                        directory: targetDir,
                                        endpoint: pathName
                                    });
                                }
                            }
                        });

                        // Wait for all photo processing to complete, then create database record
                        // If no files to process, proceed immediately
                        if (fileProcessingPromises.length === 0) {
                            // No files to process, create record directly
                            processRecordCreation(req, res, table, data, pathName).catch(processErr => {
                                logger.error('Record creation error', {
                                    error: processErr.message,
                                    stack: processErr.stack,
                                    endpoint: pathName,
                                    operation: req.method,
                                    table
                                });
                                auditLogger.logError(processErr, { endpoint: pathName, operation: req.method, table });
                                sendDatabaseError(res, processErr, `${req.method} operation on ${table}`);
                            });
                            return;
                        }

                        Promise.all(fileProcessingPromises).then(() => {
                            // Log photo creation data for debugging
                            if (table === 'photos') {
                                logger.info('All photos processed successfully, creating database record', {
                                    albumId: data.albumId,
                                    photographerId: data.photographerId,
                                    url: data.url,
                                    title: data.title,
                                    fileSize: data.fileSize,
                                    fileHash: data.fileHash ? data.fileHash.substring(0, 8) + '...' : 'N/A',
                                    endpoint: pathName
                                });
                            }

                            // Process the record creation
                            processRecordCreation(req, res, table, data, pathName).catch(processErr => {
                                logger.error('Record creation error after file upload', {
                                    error: processErr.message,
                                    stack: processErr.stack,
                                    endpoint: pathName,
                                    operation: req.method,
                                    table
                                });
                                auditLogger.logError(processErr, { endpoint: pathName, operation: req.method, table });
                                // Clean up uploaded files if record creation fails
                                Object.keys(files).forEach(key => {
                                    const fileArr = files[key];
                                    const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
                                    if (file) {
                                        const filePath = file.filepath || path.join(targetDir, file.newFilename);
                                        if (fs.existsSync(filePath)) {
                                            try {
                                                fs.unlinkSync(filePath);
                                            } catch (unlinkErr) {
                                                logger.error('Failed to clean up file after error', {
                                                    error: unlinkErr.message,
                                                    filepath: filePath
                                                });
                                            }
                                        }
                                    }
                                });
                                sendDatabaseError(res, processErr, `${req.method} operation on ${table}`);
                            });
                        }).catch(error => {
                            logger.error('File processing error', { error: error.message, endpoint: pathName });
                            sendFileError(res, `File processing failed: ${error.message}`);
                        });
                    }); // Close form.parse callback
                    return;
                }

                // Handle JSON Body
                let body = '';
                req.on('data', c => body += c);
                req.on('end', () => {
                    try {
                        const parsedBody = JSON.parse(body);
                        processRecordCreation(req, res, table, parsedBody, pathName);
                    } catch (e) {
                        const error = e instanceof Error ? e : new Error(String(e));
                        logger.error('JSON Parse Error', {
                            error: error.message,
                            stack: error.stack,
                            endpoint: pathName,
                            operation: 'JSON parsing'
                        });
                        auditLogger.logError(error, { endpoint: pathName, operation: 'JSON parsing' });
                        sendInvalidInputError(res, 'Invalid JSON format in request body. Please check your request data.');
                    }
                });
                return;
            }

            if (req.method === 'PATCH') {
                // Handle PATCH requests for updating records
                // URL format: /api/collections/{collection}/records/{id}
                const parts = pathName.split('/');
                const idFromUrl = parts[5]; // /api/collections/users/records/123 -> parts[5] = 123

                if (!idFromUrl) {
                    sendInvalidInputError(res, 'Missing required parameter: ID. PATCH requests require an ID in the URL path.');
                    return;
                }

                // Handle JSON Body
                let body = '';
                req.on('data', c => body += c);
                req.on('end', () => {
                    try {
                        const parsedBody = JSON.parse(body);

                        // Extract ID from URL if not in body
                        if (!parsedBody.id) {
                            parsedBody.id = idFromUrl;
                        }

                        // Ensure the ID from URL matches the ID in body (if present)
                        if (parsedBody.id && parsedBody.id !== idFromUrl) {
                            logger.warn('ID mismatch in PATCH request', {
                                urlId: idFromUrl,
                                bodyId: parsedBody.id,
                                endpoint: pathName
                            });
                            // Use URL ID as source of truth
                            parsedBody.id = idFromUrl;
                        }

                        processRecordCreation(req, res, table, parsedBody, pathName);
                    } catch (e) {
                        const error = e instanceof Error ? e : new Error(String(e));
                        logger.error('JSON Parse Error in PATCH', {
                            error: error.message,
                            stack: error.stack,
                            endpoint: pathName,
                            operation: 'JSON parsing'
                        });
                        auditLogger.logError(error, { endpoint: pathName, operation: 'JSON parsing (PATCH)' });
                        sendInvalidInputError(res, 'Invalid JSON format in request body. Please check your request data.');
                    }
                });
                return;
            }

            if (req.method === 'DELETE') {
                // Extract ID from URL if present (e.g. /records/ID)
                // The current routing logic in original server.js was a bit loose, 
                // it split by '/' and assumed [3] is col. 
                // If URL is /api/collections/users/records/123, then [3]=users, [5]=123
                const parts = pathName.split('/');
                const id = parts[5];

                if (id) {
                    try {
                        dbManager.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch (e) {
                        const error = e instanceof Error ? e : new Error(String(e));
                        logger.error(`DELETE Error for ${pathName}`, {
                            error: error.message,
                            stack: error.stack,
                            endpoint: pathName,
                            operation: 'DELETE',
                            table
                        });
                        auditLogger.logError(error, { endpoint: pathName, operation: 'DELETE', table });
                        sendDatabaseError(res, error, `deleting record from ${table}`);
                    }
                } else {
                    sendInvalidInputError(res, 'Missing required parameter: ID. Please provide a record ID to delete.');
                }
                return;
            }
        }

        sendNotFoundError(res, 'API endpoint');
        return;
    }

    // Serve Web App (Unified Build)
    serveStatic(res, WEB_ROOT, pathName);
});

server.on('error', (err) => {
    console.error('');
    console.error('========================================');
    console.error('[Fatal] Server Startup Error');
    console.error('========================================');

    if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use`);
        console.error('');
        console.error('Troubleshooting:');
        console.error(`  1. Run: .\\clear-ports.bat`);
        console.error(`  2. Or: .\\diagnose-server.ps1 -Fix`);
        console.error(`  3. Or manually stop the process using port ${PORT}`);
        console.error(`  4. Or change PORT in .env file`);
        console.error('');
        console.error('To find the process using the port:');
        console.error(`  PowerShell: Get-NetTCPConnection -LocalPort ${PORT}`);
        console.error(`  CMD: netstat -ano | findstr ":${PORT}"`);
        console.error('');

        if (logger && logger.error) {
            logger.error(`Port ${PORT} is already in use. Please stop the process using this port or use a different port.`, {
                port: PORT,
                error: err.message
            });
        }
    } else if (err.code === 'EACCES') {
        console.error(`Error: Permission denied (Port ${PORT})`);
        console.error('');
        console.error('Troubleshooting:');
        console.error('  1. Port may require administrator privileges');
        console.error('  2. Try running as administrator');
        console.error('  3. Or use a port number > 1024');
        console.error('');

        if (logger && logger.error) {
            logger.error('Server permission error', { error: err.message, stack: err.stack });
        }
    } else {
        console.error(`Error: ${err.message}`);
        console.error(`Code: ${err.code || 'UNKNOWN'}`);
        console.error('');
        console.error('Troubleshooting:');
        console.error('  1. Run: .\\diagnose-server.bat');
        console.error('  2. Check server logs in: pb_data\\logs\\');
        console.error('  3. See: TROUBLESHOOTING.md');
        console.error('');

        if (logger && logger.error) {
            logger.error('Server error', { error: err.message, stack: err.stack });
        }
    }

    console.error('');
    process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('[Success] Server Started Successfully');
    console.log('========================================');
    console.log(`Port: ${PORT}`);
    console.log(`Mode: SQLite`);
    console.log(`Database: ${DB_FILE}`);
    console.log(`Health Check: http://localhost:${PORT}/api/health`);
    console.log(`CORS Origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log('');
    console.log('Server is ready to accept connections.');
    console.log('Press Ctrl+C to stop the server.');
    console.log('');

    if (logger && logger.info) {
        logger.info(`Server running on port ${PORT}`, { port: PORT, mode: 'SQLite', db: DB_FILE });
    }
});