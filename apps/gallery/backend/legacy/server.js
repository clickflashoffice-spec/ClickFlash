require('dotenv').config();
const http = require('http');
const path = require('path');
const fs = require('fs');
const DatabaseManager = require('./db');
const Logger = require('./logger');
const AuditLogger = require('./auditLogger');
const PhotoProcessor = require('./photoProcessor');
const TokenRefreshService = require('./utils/tokenRefresh');
const { initSentry } = require('./utils/sentryService');
const createApp = require('./app');
const { 
    PORT, DB_FILE, DATA_DIR, UPLOAD_DIR, IMPORT_DIR, 
    BACKUP_DIR, LOGS_DIR, AUDIT_LOGS_DIR 
} = require('./config');

/**
 * Star Master Photography OS - Gallery Backend
 * modularized version (Task 1.1)
 */

async function bootstrap() {
    console.log('\n========================================');
    console.log('Star Master Photography OS - Gallery');
    console.log('========================================');
    console.log(`[Startup] Node.js: ${process.version}`);
    console.log(`[Startup] Port: ${PORT}`);
    console.log(`[Startup] Data Directory: ${DATA_DIR}`);

    // 0. Initialize Sentry
    if (process.env.SENTRY_DSN) {
        await initSentry(process.env.SENTRY_DSN, process.env.NODE_ENV || 'development');
        console.log('[Init] Sentry initialized');
    }

    // 1. Ensure directories exist
    const requiredDirs = [DATA_DIR, UPLOAD_DIR, IMPORT_DIR, BACKUP_DIR, LOGS_DIR, AUDIT_LOGS_DIR];
    requiredDirs.forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // 2. Initialize Database
    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect();
    console.log(`[Init] Database connected: ${DB_FILE}`);

    // 3. Initialize Logistics
    const logger = new Logger(DATA_DIR, process.env.LOG_LEVEL || 'INFO');
    const auditLogger = new AuditLogger(DATA_DIR);
    const photoProcessor = new PhotoProcessor(UPLOAD_DIR);
    const tokenRefreshService = new TokenRefreshService(dbManager, logger, auditLogger);

    // 4. Create App
    const app = createApp({
        logger,
        dbManager,
        auditLogger,
        photoProcessor,
        tokenRefreshService,
        UPLOAD_DIR
    });

    const server = http.createServer(app);

    // 5. Graceful Shutdown
    const shutdown = async (signal) => {
        console.log(`\n[Shutdown] Received ${signal}, starting graceful shutdown...`);
        
        server.close(() => {
            console.log('[Shutdown] HTTP server closed.');
            try {
                dbManager.close();
                console.log('[Shutdown] Database connection closed.');
            } catch (e) {
                console.error('[Shutdown] Error closing database:', e.message);
            }
            console.log('[Shutdown] Exit successful.');
            process.exit(0);
        });

        // Forced exit after 15s
        setTimeout(() => {
            console.error('[Shutdown] Forced exit due to timeout.');
            process.exit(1);
        }, 15000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // 6. Start Server
    server.listen(PORT, '0.0.0.0', () => {
        console.log('========================================');
        console.log('[Success] Server Ready');
        console.log('========================================\n');
        logger.info(`Server running on port ${PORT}`, { port: PORT, mode: 'SQLite' });
    });
}

bootstrap().catch(err => {
    console.error('[Fatal] Bootstrap Error:', err);
    process.exit(1);
});