// backend/shared/auditLogger.ts
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const RETENTION_DAYS = 30;
const MAX_LOG_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB per day file

class AuditLogger {
    private dataDir: string;
    private logDir: string;

    constructor(dataDir: string) {
        this.dataDir = dataDir;
        this.logDir = path.join(dataDir, 'audit_logs');
        this.ensureLogDirectory();
        this.rotateLogs();
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private rotateLogs(): void {
        try {
            const files = fs.readdirSync(this.logDir);
            const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
            for (const file of files) {
                if (!file.startsWith('audit-') || !file.endsWith('.log')) continue;
                const filePath = path.join(this.logDir, file);
                try {
                    const stat = fs.statSync(filePath);
                    const isExpired = stat.mtimeMs < cutoff;
                    const isOversized = stat.size > MAX_LOG_SIZE_BYTES;
                    if (isExpired || isOversized) {
                        fs.unlinkSync(filePath);
                    }
                } catch {
                    /* skip files we can't stat/delete */
                }
            }
        } catch {
            /* log dir may not exist yet */
        }
    }

    private getLogFile(): string {
        const today = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `audit-${today}.log`);
    }

    private formatLogEntry(level: string, event: string, details: Record<string, any>): string {
        const timestamp = new Date().toISOString();
        return JSON.stringify({
            timestamp,
            level,
            event,
            ...details
        }) + '\n';
    }

    private log(level: string, event: string, details: Record<string, any>): void {
        const logEntry = this.formatLogEntry(level, event, details);
        const logFile = this.getLogFile();

        try {
            fs.appendFileSync(logFile, logEntry, 'utf8');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                try {
                    this.ensureLogDirectory();
                    fs.appendFileSync(logFile, logEntry, 'utf8');
                } catch (retryError: any) {
                    logger.error('[AuditLogger] Failed to write log:', retryError.message);
                }
            } else {
                logger.error('[AuditLogger] Failed to write log:', error.message);
            }
        }
    }

    public logLoginAttempt(email: string, success: boolean, ip: string, reason: string | null = null): void {
        this.log('INFO', 'LOGIN_ATTEMPT', { email, success, ip, reason: reason || (success ? 'SUCCESS' : 'FAILED') });
    }

    public logLogout(userId: string | number, email: string, ip: string): void {
        this.log('INFO', 'LOGOUT', { userId, email, ip });
    }

    public logTokenRefresh(userId: string | number, email: string, ip: string): void {
        this.log('INFO', 'TOKEN_REFRESH', { userId, email, ip });
    }

    public logUnauthorizedAccess(endpoint: string, ip: string, reason: string): void {
        this.log('WARN', 'UNAUTHORIZED_ACCESS', { endpoint, ip, reason });
    }

    public logRateLimitExceeded(ip: string, endpoint: string): void {
        this.log('WARN', 'RATE_LIMIT_EXCEEDED', { ip, endpoint });
    }

    public logSuspiciousActivity(description: string, ip: string, details: Record<string, any> = {}): void {
        this.log('WARN', 'SUSPICIOUS_ACTIVITY', { description, ip, ...details });
    }

    public logDataAccess(userId: string | number, email: string, action: string, resource: string, resourceId: string | number | null = null): void {
        this.log('INFO', 'DATA_ACCESS', { userId, email, action, resource, resourceId });
    }

    public logConfigChange(userId: string | number, email: string, setting: string, oldValue: any, newValue: any): void {
        this.log('INFO', 'CONFIG_CHANGE', { userId, email, setting, oldValue, newValue });
    }

    public logError(error: Error, context: Record<string, any> = {}): void {
        this.log('ERROR', 'SYSTEM_ERROR', { message: error.message, stack: error.stack, ...context });
    }

    public logSecurityEvent(event: string, details: Record<string, any>): void {
        this.log('WARN', event, details);
    }
}

export default AuditLogger;
