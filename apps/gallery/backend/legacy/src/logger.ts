import fs from 'fs';
import path from 'path';

export type LogLevelStr = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export const LOG_LEVELS: Record<LogLevelStr, number> = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

export class Logger {
    private dataDir: string;
    private logDir: string;
    private logLevel: number;

    constructor(dataDir: string, logLevel: LogLevelStr = 'INFO') {
        this.dataDir = dataDir;
        this.logDir = path.join(dataDir, 'logs');
        this.logLevel = LOG_LEVELS[logLevel] ?? LOG_LEVELS.INFO;
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private getLogFile(level: LogLevelStr): string {
        const today = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${level.toLowerCase()}-${today}.log`);
    }

    private formatLogEntry(level: LogLevelStr, message: string, meta: any = {}): string {
        const timestamp = new Date().toISOString();
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
        }) + '\n';
    }

    private writeLog(level: LogLevelStr, message: string, meta: any = {}): void {
        if (LOG_LEVELS[level] > this.logLevel) {
            return;
        }

        const logEntry = this.formatLogEntry(level, message, meta);
        const logFile = this.getLogFile(level);

        try {
            fs.appendFileSync(logFile, logEntry, 'utf8');
        } catch (error: any) {
            console.error('[Logger] Failed to write log:', error.message);
            console.log(logEntry.trim());
        }

        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
            const consoleMethod = level === 'ERROR' ? console.error :
                level === 'WARN' ? console.warn :
                    console.log;
            consoleMethod(`[${level}] ${message}`, meta && Object.keys(meta).length > 0 ? meta : '');
        }
    }

    error(message: string, meta: any = {}): void {
        this.writeLog('ERROR', message, meta);
    }

    warn(message: string, meta: any = {}): void {
        this.writeLog('WARN', message, meta);
    }

    info(message: string, meta: any = {}): void {
        this.writeLog('INFO', message, meta);
    }

    debug(message: string, meta: any = {}): void {
        this.writeLog('DEBUG', message, meta);
    }
}

export default Logger;
