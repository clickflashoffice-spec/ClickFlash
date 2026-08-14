import { WebLogger, initializeWebVitals, LogLevel } from '@clickflash/telemetry-web';
import { getEnv } from './env';

const env = getEnv();
const isDev = env.DEV || env.MODE === 'development';

export const logger = new WebLogger({
  serviceName: 'management-hub',
  endpointUrl: '/api/telemetry/ingest',
  flushIntervalMs: isDev ? 2000 : 5000,
  level: isDev ? LogLevel.DEBUG : LogLevel.INFO,
});

// Start tracking Core Web Vitals if in production (or if you want them in dev too)
if (!isDev) {
  initializeWebVitals(logger);
}

// Ensure the logger exports matching the old interface for backwards compatibility
export { LogLevel };
