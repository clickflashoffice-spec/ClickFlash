import { createLogger } from '@clickflash/logger';
import path from 'path';
export const logger = createLogger({
    serviceName: 'management-backend',
    logDir: path.join(process.cwd(), 'logs', 'management-backend'),
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enableConsole: true,
    enableFile: true
});
