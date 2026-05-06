const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { WEB_ROOT, ALLOWED_ORIGINS } = require('./config');
const authMiddleware = require('./middleware/auth');
const systemRoutes = require('./routes/system');
const authRoutes = require('./routes/auth');
const collectionRoutes = require('./routes/collections');
const fileRoutes = require('./routes/files');

// Import existing routes
const { handleSyncRequest } = require('./routes/syncRoutes');
const { handleDownloadRequest } = require('./routes/downloads');
const paymentRoutes = require('./routes/paymentRoutes');
const moneyTrashRoutes = require('./routes/moneyTrashRoutes');

const createApp = (context) => {
    const app = express();
    const { logger, dbManager, auditLogger, photoProcessor, tokenRefreshService, UPLOAD_DIR } = context;

    // Set shared context
    app.set('logger', logger);
    app.set('dbManager', dbManager);
    app.set('auditLogger', auditLogger);
    app.set('photoProcessor', photoProcessor);
    app.set('tokenRefreshService', tokenRefreshService);

    // Standard Middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
                "connect-src": ["'self'", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*", "https://starmaster.cloud"],
                "img-src": ["'self'", "data:", "blob:", "https:", "http:"],
            },
        },
    }));

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true
    }));

    app.use(cookieParser());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // --- Public Routes ---
    app.use('/api', systemRoutes);
    app.use('/api/auth', authRoutes);

    // --- Wrapper for existing async routes (Legacy compatibility) ---
    app.use('/api/sync', (req, res) => handleSyncRequest(req, res, req.path, { logger, uploadDir: UPLOAD_DIR, dbManager }));
    app.use('/api/downloads', authMiddleware, (req, res) => handleDownloadRequest(req, res, req.path, { logger, dbManager, uploadDir: UPLOAD_DIR, authMiddleware: (req, res, next) => next() }));

    // --- New Express-native Routes ---
    app.use('/api/payments', paymentRoutes);
    app.use('/api/moneytrash', moneyTrashRoutes);
    app.use('/api/collections', authMiddleware, collectionRoutes);
    app.use('/api/files', authMiddleware, fileRoutes);

    // --- Static Frontend Serving ---
    app.use(express.static(WEB_ROOT));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(WEB_ROOT, 'index.html'));
        } else {
            res.status(404).json({ error: 'API endpoint not found' });
        }
    });

    return app;
};

module.exports = createApp;
