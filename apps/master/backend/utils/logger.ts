// backend/shared/logger.ts
import fs from "fs";
import path from "path";

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

export class Logger {
  private dataDir: string;
  private logDir: string;
  private logLevel: number;

  constructor(dataDir: string, logLevel: string = "INFO") {
    this.dataDir = dataDir;
    this.logDir = path.join(dataDir, "logs");
    const levelKey = logLevel.toUpperCase() as LogLevel;
    this.logLevel =
      LOG_LEVELS[levelKey] !== undefined
        ? LOG_LEVELS[levelKey]
        : LOG_LEVELS.INFO;
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

      files.forEach((file) => {
        if (!file.endsWith(".log")) return;
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > MAX_AGE) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (e) {
      console.error("[Logger] Failed to clean up old logs:", e);
    }
  }

  private getLogFile(level: LogLevel): string {
    const today = new Date().toISOString().split("T")[0];
    return path.join(this.logDir, `${level.toLowerCase()}-${today}.log`);
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    meta?: any,
  ): string {
    const timestamp = new Date().toISOString();
    let metaObj: Record<string, any> = {};
    if (meta instanceof Error) {
      metaObj = { error: meta.message, stack: meta.stack };
    } else if (meta !== null && typeof meta === 'object') {
      metaObj = meta;
    } else if (meta !== undefined) {
      metaObj = { data: meta };
    }
    return (
      JSON.stringify({
        timestamp,
        level,
        pid: process.pid,
        message,
        ...metaObj,
      }) + "\n"
    );
  }

  private writeLog(
    level: LogLevel,
    message: string,
    meta?: any,
  ): void {
    if (LOG_LEVELS[level] > this.logLevel) {
      return;
    }

    const logEntry = this.formatLogEntry(level, message, meta);
    const logFile = this.getLogFile(level);

    try {
      fs.appendFileSync(logFile, logEntry, "utf8");
    } catch (error: any) {
      if (error.code === "ENOENT") {
        try {
          this.ensureLogDirectory();
          fs.appendFileSync(logFile, logEntry, "utf8");
        } catch (retryError: any) {
          console.error("[Logger] Failed to write log:", retryError.message);
          console.log(logEntry.trim());
        }
      } else {
        console.error("[Logger] Failed to write log:", error.message);
        console.log(logEntry.trim());
      }
    }

    // Always log to console for important levels to provide process visibility (Apex Protocol)
    const consoleMethod =
      level === "ERROR"
        ? console.error
        : level === "WARN"
          ? console.warn
          : level === "INFO"
            ? console.log
            : null;

    if (consoleMethod) {
      consoleMethod(
        `[${level}] ${message}`,
        meta !== undefined ? meta : "",
      );
    }
  }

  public error(message: string, meta?: any): void {
    this.writeLog("ERROR", message, meta);
    // Aggregate errors to persistent errors.jsonl for on-premise admin review
    this.appendErrorAggregate(message, meta);
  }

  private appendErrorAggregate(
    message: string,
    meta?: any,
  ): void {
    try {
      const aggregateFile = path.join(this.logDir, "errors.jsonl");
      const entry =
        JSON.stringify({
          timestamp: new Date().toISOString(),
          message,
          meta: meta instanceof Error ? { error: meta.message, stack: meta.stack } : meta,
          version: process.env.APP_VERSION || "unknown",
          pid: process.pid,
        }) + "\n";
      fs.appendFileSync(aggregateFile, entry, "utf8");

      // Cap at 500 entries to prevent unbounded growth
      const content = fs.readFileSync(aggregateFile, "utf8");
      const lines = content.split("\n").filter(Boolean);
      if (lines.length > 500) {
        fs.writeFileSync(
          aggregateFile,
          lines.slice(-500).join("\n") + "\n",
          "utf8",
        );
      }
    } catch (e) {
      // Never throw from logger — silently swallow
    }
  }

  public warn(message: string, meta?: any): void {
    this.writeLog("WARN", message, meta);
  }

  public info(message: string, meta?: any): void {
    this.writeLog("INFO", message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.writeLog("DEBUG", message, meta);
  }
}

export const logger = new Logger(
  process.env.DATA_DIR || path.join(process.cwd(), "pb_data"),
  process.env.LOG_LEVEL || "INFO"
);
