type LogMetadata = unknown;

export const logger = {
  info(message: string, metadata?: LogMetadata): void {
    console.info(message, metadata ?? '');
  },
  warn(message: string, metadata?: LogMetadata): void {
    console.warn(message, metadata ?? '');
  },
  error(message: string, error?: unknown): void {
    console.error(message, error ?? '');
  }
};

