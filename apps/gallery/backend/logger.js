// apps/gallery/backend/logger.js
const pino = require('pino');
const path = require('path');
const fs = require('fs');

/**
 * Enterprise Structured Logger using Pino
 * Optimized for Gallery Backend
 */
class Logger {
    constructor(dataDir, logLevel = 'info') {
        this.dataDir = dataDir;
        this.logDir = path.join(dataDir, 'logs');
        this.ensureLogDirectory();

        const targets = [
            {
                target: 'pino/file',
                options: { destination: path.join(this.logDir, 'gallery.log'), mkdir: true },
                level: logLevel.toLowerCase()
            }
        ];

        // Add console pretty printing in development or if explicitly enabled
        if (process.env.NODE_ENV !== 'production' || process.env.CONSOLE_LOGGING === 'true') {
            targets.push({
                target: 'pino-pretty',
                options: { colorize: true },
                level: logLevel.toLowerCase()
            });
        }

        const transport = pino.transport({ targets });

        this.pino = pino(
            {
                level: logLevel.toLowerCase(),
                base: { 
                    component: 'gallery-backend', 
                    env: process.env.NODE_ENV || 'development',
                    version: process.env.APP_VERSION || '1.0.0'
                },
                timestamp: pino.stdTimeFunctions.isoTime
            },
            transport
        );
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    error(message, meta = {}) {
        this.pino.error(meta, message);
    }

    warn(message, meta = {}) {
        this.pino.warn(meta, message);
    }

    info(message, meta = {}) {
        this.pino.info(meta, message);
    }

    debug(message, meta = {}) {
        this.pino.debug(meta, message);
    }

    log(message, meta = {}) {
        this.info(message, meta);
    }
}

module.exports = Logger;
