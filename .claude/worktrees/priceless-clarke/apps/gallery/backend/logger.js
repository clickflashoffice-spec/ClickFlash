// backend/logger.js
// Structured logging utility for consistent log formatting

const fs = require('fs');
const path = require('path');

/**
 * Log levels
 */
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

/**
 * Logger class for structured logging
 */
class Logger {
    constructor(dataDir, logLevel = 'INFO') {
        this.dataDir = dataDir;
        this.logDir = path.join(dataDir, 'logs');
        this.logLevel = LOG_LEVELS[logLevel.toUpperCase()] || LOG_LEVELS.INFO;
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getLogFile(level) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.logDir, `${level.toLowerCase()}-${today}.log`);
    }

    formatLogEntry(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
        }) + '\n';
    }

    writeLog(level, message, meta = {}) {
        // Check if log level is enabled
        if (LOG_LEVELS[level] > this.logLevel) {
            return;
        }

        const logEntry = this.formatLogEntry(level, message, meta);
        const logFile = this.getLogFile(level);

        try {
            fs.appendFileSync(logFile, logEntry, 'utf8');
        } catch (error) {
            // Fallback to console if file write fails
            console.error('[Logger] Failed to write log:', error.message);
            console.log(logEntry.trim());
        }

        // Also output to console in development
        if (process.env.NODE_ENV === 'development') {
            const consoleMethod = level === 'ERROR' ? console.error : 
                                 level === 'WARN' ? console.warn : 
                                 console.log;
            consoleMethod(`[${level}] ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
        }
    }

    error(message, meta = {}) {
        this.writeLog('ERROR', message, meta);
    }

    warn(message, meta = {}) {
        this.writeLog('WARN', message, meta);
    }

    info(message, meta = {}) {
        this.writeLog('INFO', message, meta);
    }

    debug(message, meta = {}) {
        this.writeLog('DEBUG', message, meta);
    }
}

module.exports = Logger;

