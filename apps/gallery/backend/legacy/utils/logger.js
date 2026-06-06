// apps/gallery/backend/utils/logger.js
const pino = require('pino');
const path = require('path');
const fs = require('fs');

/**
 * Enterprise Structured Logger using Pino
 */
class Logger {
    constructor(dataDir, logLevel = 'info') {
        this.dataDir = dataDir;
        this.logDir = path.join(dataDir, 'logs');
        this.ensureLogDirectory();

        const transport = pino.transport({
            targets: [
                {
                    target: 'pino/file',
                    options: { destination: path.join(this.logDir, 'gallery.log'), mkdir: true },
                    level: logLevel
                },
                {
                    target: 'pino-pretty', // Development friendly output
                    options: { colorize: true },
                    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
                }
            ]
        });

        this.pino = pino(
            {
                level: logLevel.toLowerCase(),
                base: { component: 'gallery-backend', env: process.env.NODE_ENV || 'development' },
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

    // For compatibility with any existing console-like usage
    log(message, meta = {}) {
        this.info(message, meta);
    }
}

module.exports = Logger;
