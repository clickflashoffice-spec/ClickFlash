export interface Logger {
  debug(message: unknown, metadata?: unknown): void;
  info(message: unknown, metadata?: unknown): void;
  warn(message: unknown, metadata?: unknown): void;
  error(message: unknown, errorOrMetadata?: unknown, metadata?: unknown): void;
}

export const logger: Logger = {
  debug(message, metadata) {
    if (__DEV__) console.debug(`[DEBUG] ${String(message)}`, metadata ?? '');
  },
  info(message, metadata) {
    console.info(`[INFO] ${String(message)}`, metadata ?? '');
  },
  warn(message, metadata) {
    console.warn(`[WARN] ${String(message)}`, metadata ?? '');
  },
  error(message, errorOrMetadata, metadata) {
    console.error(`[ERROR] ${String(message)}`, errorOrMetadata ?? '', metadata ?? '');
  }
};

export default logger;
