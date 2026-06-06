import fs from 'fs';
import path from 'path';

export type AuditLevel = 'INFO' | 'WARN' | 'ERROR';

export class AuditLogger {
    private dataDir: string;
    private logDir: string;

    constructor(dataDir: string) {
        this.dataDir = dataDir;
        this.logDir = path.join(dataDir, 'audit_logs');
        this.ensureLogDirectory();
    }

    private ensureLogDirectory(): void {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private getLogFile(): string {
        const today = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `audit-${today}.log`);
    }

    private formatLogEntry(level: AuditLevel, event: string, details: any): string {
        const timestamp = new Date().toISOString();
        return JSON.stringify({
            timestamp,
            level,
            event,
            ...details
        }) + '\n';
    }

    private log(level: AuditLevel, event: string, details: any): void {
        const logEntry = this.formatLogEntry(level, event, details);
        const logFile = this.getLogFile();

        try {
            fs.appendFileSync(logFile, logEntry, 'utf8');
        } catch (error: any) {
            console.error('[AuditLogger] Failed to write log:', error.message);
        }
    }

    logLoginAttempt(email: string, success: boolean, ip: string, reason: string | null = null): void {
        this.log('INFO', 'LOGIN_ATTEMPT', {
            email,
            success,
            ip,
            reason: reason || (success ? 'SUCCESS' : 'FAILED')
        });
    }

    logLogout(userId: number | string, email: string, ip: string): void {
        this.log('INFO', 'LOGOUT', {
            userId,
            email,
            ip
        });
    }

    logTokenRefresh(userId: number | string, email: string, ip: string): void {
        this.log('INFO', 'TOKEN_REFRESH', {
            userId,
            email,
            ip
        });
    }

    logUnauthorizedAccess(endpoint: string, ip: string, reason: string): void {
        this.log('WARN', 'UNAUTHORIZED_ACCESS', {
            endpoint,
            ip,
            reason
        });
    }

    logRateLimitExceeded(ip: string, endpoint: string): void {
        this.log('WARN', 'RATE_LIMIT_EXCEEDED', {
            ip,
            endpoint
        });
    }

    logSuspiciousActivity(description: string, ip: string, details: any = {}): void {
        this.log('WARN', 'SUSPICIOUS_ACTIVITY', {
            description,
            ip,
            ...details
        });
    }

    logDataAccess(userId: number | string, email: string, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE', resource: string, resourceId: string | number | null = null): void {
        this.log('INFO', 'DATA_ACCESS', {
            userId,
            email,
            action,
            resource,
            resourceId
        });
    }

    logConfigChange(userId: number | string, email: string, setting: string, oldValue: any, newValue: any): void {
        this.log('INFO', 'CONFIG_CHANGE', {
            userId,
            email,
            setting,
            oldValue,
            newValue
        });
    }

    logError(error: Error, context: any = {}): void {
        this.log('ERROR', 'SYSTEM_ERROR', {
            message: error.message,
            stack: error.stack,
            ...context
        });
    }
}

export default AuditLogger;
