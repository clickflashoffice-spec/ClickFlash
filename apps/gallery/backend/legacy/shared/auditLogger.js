// backend/auditLogger.js
// Audit logging for security events and authentication attempts

const fs = require('fs');
const path = require('path');

class AuditLogger {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.logDir = path.join(dataDir, 'audit_logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        // Ensure base data directory exists first
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        // Then ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getLogFile() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.logDir, `audit-${today}.log`);
    }

    formatLogEntry(level, event, details) {
        const timestamp = new Date().toISOString();
        return JSON.stringify({
            timestamp,
            level,
            event,
            ...details
        }) + '\n';
    }

    log(level, event, details) {
        const logEntry = this.formatLogEntry(level, event, details);
        const logFile = this.getLogFile();

        try {
            fs.appendFileSync(logFile, logEntry, 'utf8');
        } catch (error) {
            // If directory doesn't exist, try to create it and retry
            if (error.code === 'ENOENT') {
                try {
                    this.ensureLogDirectory();
                    fs.appendFileSync(logFile, logEntry, 'utf8');
                } catch (retryError) {
                    console.error('[AuditLogger] Failed to write log:', retryError.message);
                }
            } else {
                console.error('[AuditLogger] Failed to write log:', error.message);
            }
        }
    }

    // Authentication events
    logLoginAttempt(email, success, ip, reason = null) {
        this.log('INFO', 'LOGIN_ATTEMPT', {
            email,
            success,
            ip,
            reason: reason || (success ? 'SUCCESS' : 'FAILED')
        });
    }

    logLogout(userId, email, ip) {
        this.log('INFO', 'LOGOUT', {
            userId,
            email,
            ip
        });
    }

    logTokenRefresh(userId, email, ip) {
        this.log('INFO', 'TOKEN_REFRESH', {
            userId,
            email,
            ip
        });
    }

    // Security events
    logUnauthorizedAccess(endpoint, ip, reason) {
        this.log('WARN', 'UNAUTHORIZED_ACCESS', {
            endpoint,
            ip,
            reason
        });
    }

    logRateLimitExceeded(ip, endpoint) {
        this.log('WARN', 'RATE_LIMIT_EXCEEDED', {
            ip,
            endpoint
        });
    }

    logSuspiciousActivity(description, ip, details = {}) {
        this.log('WARN', 'SUSPICIOUS_ACTIVITY', {
            description,
            ip,
            ...details
        });
    }

    // Data access events
    logDataAccess(userId, email, action, resource, resourceId = null) {
        this.log('INFO', 'DATA_ACCESS', {
            userId,
            email,
            action, // CREATE, READ, UPDATE, DELETE
            resource, // users, albums, photos, orders, etc.
            resourceId
        });
    }

    // Configuration changes
    logConfigChange(userId, email, setting, oldValue, newValue) {
        this.log('INFO', 'CONFIG_CHANGE', {
            userId,
            email,
            setting,
            oldValue,
            newValue
        });
    }

    // Error events
    logError(error, context = {}) {
        this.log('ERROR', 'SYSTEM_ERROR', {
            message: error.message,
            stack: error.stack,
            ...context
        });
    }
}

module.exports = AuditLogger;

