/**
 * Structured Logger for Phase 71 Electron Rebuild
 * Handles logging from all processes with proper formatting
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { LOGGING } from './constants';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  process: string;
  message: string;
  meta?: Record<string, unknown>;
}

class Logger {
  private logDir: string;
  private logFile: string;
  private currentLogSize: number = 0;
  private logLevel: LogLevel;
  private processName: string;

  constructor(processName: string = 'main') {
    this.processName = processName;
    this.logLevel = LOGGING.LEVEL as LogLevel;
    
    // Use userData for logs to avoid permission issues
    try {
      this.logDir = path.join(app.getPath('userData'), 'logs');
    } catch {
      // Fallback for early initialization
      this.logDir = path.join(process.cwd(), 'logs');
    }
    
    this.logFile = path.join(this.logDir, `${processName}.log`);
    this.initLogDirectory();
  }

  private initLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      
      // Rotate logs if needed
      this.rotateLogsIfNeeded();
      
      // Get current log file size
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        this.currentLogSize = stats.size / (1024 * 1024); // Convert to MB
      }
    } catch (error) {
      console.error('[Logger] Failed to initialize log directory:', error);
    }
  }

  private rotateLogsIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFile)) return;
      
      const stats = fs.statSync(this.logFile);
      const sizeMB = stats.size / (1024 * 1024);
      
      if (sizeMB > LOGGING.MAX_FILE_SIZE_MB) {
        // Rotate existing logs
        for (let i = LOGGING.MAX_FILES - 1; i >= 1; i--) {
          const oldFile = `${this.logFile}.${i}`;
          const newFile = `${this.logFile}.${i + 1}`;
          
          if (fs.existsSync(oldFile)) {
            if (i === LOGGING.MAX_FILES - 1) {
              fs.unlinkSync(oldFile); // Delete oldest
            } else {
              fs.renameSync(oldFile, newFile);
            }
          }
        }
        
        // Rotate current log
        fs.renameSync(this.logFile, `${this.logFile}.1`);
      }
    } catch (error) {
      console.error('[Logger] Failed to rotate logs:', error);
    }
  }

  private formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      process: this.processName,
      message,
      meta,
    };
  }

  private writeToFile(entry: LogEntry): void {
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, line);
      
      // Update size and rotate if needed
      this.currentLogSize += Buffer.byteLength(line) / (1024 * 1024);
      if (this.currentLogSize > LOGGING.MAX_FILE_SIZE_MB) {
        this.rotateLogsIfNeeded();
        this.currentLogSize = 0;
      }
    } catch (error) {
      console.error('[Logger] Failed to write to log file:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatEntry(level, message, meta);
    
    // Write to file
    this.writeToFile(entry);
    
    // Also write to console with colors
    const prefix = `[${entry.timestamp}] [${this.processName}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, meta || '');
        break;
      case 'info':
        console.log(prefix, message, meta || '');
        break;
      case 'warn':
        console.warn(prefix, message, meta || '');
        break;
      case 'error':
        console.error(prefix, message, meta || '');
        break;
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = { ...meta };
    
    if (error instanceof Error) {
      errorMeta.errorName = error.name;
      errorMeta.errorMessage = error.message;
      errorMeta.stack = error.stack;
    } else if (error) {
      errorMeta.error = String(error);
    }
    
    this.log('error', message, errorMeta);
  }

  // Get recent log entries for debugging
  getRecentLogs(count: number = 100): LogEntry[] {
    try {
      if (!fs.existsSync(this.logFile)) return [];
      
      const content = fs.readFileSync(this.logFile, 'utf-8');
      const lines = content.trim().split('\n');
      
      return lines
        .slice(-count)
        .map(line => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is LogEntry => entry !== null);
    } catch (error) {
      console.error('[Logger] Failed to read logs:', error);
      return [];
    }
  }
}

// Singleton instance for main process
let mainLogger: Logger | null = null;

export function getLogger(processName?: string): Logger {
  if (processName === 'main' || !processName) {
    if (!mainLogger) {
      mainLogger = new Logger('main');
    }
    return mainLogger;
  }
  return new Logger(processName);
}

export { Logger };
export type { LogLevel, LogEntry };
