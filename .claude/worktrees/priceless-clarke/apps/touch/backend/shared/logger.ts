// backend/shared/logger.ts
import fs from 'fs';
import path from 'path';

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

export class Logger {
    private dataDir: string;
    private logDir: string;
    private logLevel: number;

    constructor(dataDir: string, logLevel: string = 'INFO') {
        this.dataDir = dataDir;
        this.logDir = path.join(dataDir, 'logs');
        const levelKey = logLevel.toUpperCase() as LogLevel;
        this.logLevel = LOG_LEVELS[levelKey] !== undefined ? LOG_LEVELS[levelKey] : LOG_LEVELS.INFO;
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        this.cleanupOldLogs();
    }

    private cleanupOldLogs(): void {
        try {
            const files = fs.readdirSync(this.logDir);
            const now = Date.now();
            const MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days

            files.forEach(file => {
                if (!file.endsWith('.log')) return;
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > MAX_AGE) {
                    fs.unlinkSync(filePath);
                }
            });
        } catch (e) {
            console.error('[Logger] Failed to clean up old logs:', e);
        }
    }

    private getLogFile(level: LogLevel): string {
        const today = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${level.toLowerCase()}-${today}.log`);
    }

    private formatLogEntry(level: LogLevel, message: string, meta: Record<string, any> = {}): string {
        const timestamp = new Date().toISOString();
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
        }) + '\n';
    }

    private writeLog(level: LogLevel, message: string, meta: Record<string, any> = {}): void {
        if (LOG_LEVELS[level] > this.logLevel) {
            return;
        }

        const logEntry = this.formatLogEntry(level, message, meta);
        const logFile = this.getLogFile(level);

        try {
            fs.appendFileSync(logFile, logEntry, 'utf8');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                try {
                    this.ensureLogDirectory();
                    fs.appendFileSync(logFile, logEntry, 'utf8');
                } catch (retryError: any) {
                    console.error('[Logger] Failed to write log:', retryError.message);
                    console.log(logEntry.trim());
                }
            } else {
                console.error('[Logger] Failed to write log:', error.message);
                console.log(logEntry.trim());
            }
        }

        // Always log to console for important levels to provide process visibility (Apex Protocol)
        const consoleMethod = level === 'ERROR' ? console.error :
            level === 'WARN' ? console.warn :
            level === 'INFO' ? console.log : null;
            
        if (consoleMethod) {
            consoleMethod(`[${level}] ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
        }
    }

    public error(message: string, meta: Record<string, any> = {}): void {
        this.writeLog('ERROR', message, meta);
    }

    public warn(message: string, meta: Record<string, any> = {}): void {
        this.writeLog('WARN', message, meta);
    }

    public info(message: string, meta: Record<string, any> = {}): void {
        this.writeLog('INFO', message, meta);
    }

    public debug(message: string, meta: Record<string, any> = {}): void {
        this.writeLog('DEBUG', message, meta);
    }
}
