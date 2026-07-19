/**
 * React Native Safe Logger for Fotiqo Mobile Staff App
 * Replaces winston/Node.js logger to prevent crash on mobile devices.
 */

export interface ILogger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, errorOrMeta?: unknown, meta?: unknown): void;
}

export const logger: ILogger = {
  debug(message: string, meta?: unknown): void {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, meta !== undefined ? meta : '');
    }
  },
  info(message: string, meta?: unknown): void {
    console.log(`[INFO] ${message}`, meta !== undefined ? meta : '');
  },
  warn(message: string, meta?: unknown): void {
    console.warn(`[WARN] ${message}`, meta !== undefined ? meta : '');
  },
  error(message: string, errorOrMeta?: unknown, meta?: unknown): void {
    console.error(`[ERROR] ${message}`, errorOrMeta !== undefined ? errorOrMeta : '', meta !== undefined ? meta : '');
  },
};

export default logger;
