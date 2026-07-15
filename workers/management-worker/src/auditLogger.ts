import { logger } from "@clickflash/logger";

export class AuditLogger {
  constructor(dataDir?: string) {}

  private log(level: string, event: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...details,
    };
    if (level === "ERROR") {
      logger.error(String(`[AUDIT] ${level} ${event}`) + ' ' + String(details));
    } else {
      logger.info(String(`[AUDIT] ${level} ${event}`) + ' ' + String(details));
    }
  }

  logLoginAttempt(email: string, success: boolean, ip: string): void {
    this.log("INFO", "LOGIN_ATTEMPT", { email, success, ip });
  }

  logUnauthorizedAccess(path: string, ip: string, reason: string): void {
    this.log("WARN", "UNAUTHORIZED_ACCESS", { path, ip, reason });
  }

  logError(error: Error, meta?: any): void {
    this.log("ERROR", "SYSTEM_ERROR", {
      message: error.message,
      stack: error.stack,
      ...meta,
    });
  }

  logRateLimitExceeded(ip: string, url: string): void {
    this.log("WARN", "RATE_LIMIT_EXCEEDED", { ip, url });
  }
}

export default AuditLogger;
