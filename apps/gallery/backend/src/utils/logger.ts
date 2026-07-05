import { createLogger } from '@clickflash/logger';
import path from 'path';

export const logger = createLogger({
  serviceName: 'gallery-backend',
  logDir: path.join(process.cwd(), 'logs', 'gallery-backend'),
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});
