import { WebLogger, TelemetryAnalyzer, LogLevel, initializeWebVitals } from '@clickflash/telemetry-web';

// Initialize the web logger
const logger = new WebLogger({
    serviceName: 'touch-kiosk',
    endpointUrl: 'https://management-hub.clickflash-office.workers.dev/api/telemetry', // Using Management Hub for ingestion
    flushIntervalMs: 10000,
    level: import.meta.env?.PROD ? LogLevel.INFO : LogLevel.DEBUG,
});

// Create and export the analyzer instance
export const analytics = new TelemetryAnalyzer(logger);
export const initVitals = () => initializeWebVitals(logger);
