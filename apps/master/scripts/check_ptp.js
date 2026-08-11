import { logger } from '@/utils/logger';


const ptp = require('pdf-to-printer');
logger.info('Type of ptp:', typeof ptp);
logger.info('Keys of ptp:', Object.keys(ptp));
logger.info('ptp.print function:', typeof ptp.print);
logger.info('ptp.default:', ptp.default);
