/**
 * Console Cleanup Utility
 * 
 * Replaces console.* calls with structured logger in development.
 * In production, suppresses console output entirely.
 */
/* eslint-disable no-console */

import { logger } from './logger';

/**
 * Clean up console output by redirecting to structured logger
 */
export function initConsoleCleanup(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    const isDev = import.meta.env.DEV;
    const isTest = import.meta.env.MODE === 'test';

    // In production, suppress all console output
    if (!isDev && !isTest) {
        logger.info = () => {};
        logger.warn = () => {};
        console.info = () => {};
        console.debug = () => {};
        // Keep error but send to logger
        logger.error = (...args: unknown[]) => {
            const message = args[0] as string;
            const data = args.slice(1);
            logger.error(message, undefined, data.length > 0 ? data : undefined);
        };
        return;
    }

    // In development, redirect to structured logger
    logger.info = (...args: unknown[]) => {
        const message = args[0] as string;
        const data = args.slice(1);
        logger.debug(message, data.length === 1 ? data[0] : data.length > 0 ? data : undefined);
    };

    logger.warn = (...args: unknown[]) => {
        const message = args[0] as string;
        const data = args.slice(1);
        logger.warn(message, data.length === 1 ? data[0] : data.length > 0 ? data : undefined);
    };

    logger.error = (...args: unknown[]) => {
        const message = args[0] as string;
        const error = args[1] instanceof Error ? args[1] : undefined;
        const data = args.slice(error ? 2 : 1);
        logger.error(message, error, data.length > 0 ? data : undefined);
    };

    console.info = (...args: unknown[]) => {
        const message = args[0] as string;
        const data = args.slice(1);
        logger.info(message, data.length === 1 ? data[0] : data.length > 0 ? data : undefined);
    };

    console.debug = (...args: unknown[]) => {
        const message = args[0] as string;
        const data = args.slice(1);
        logger.debug(message, data.length === 1 ? data[0] : data.length > 0 ? data : undefined);
    };

    // Log initialization
    logger.info('[ConsoleCleanup] Console methods redirected to structured logger');
}

/**
 * Restore original console methods (for debugging)
 */
export function restoreConsole(): void {
    if (typeof window === 'undefined') return;
    
    // Reload page to restore original console
    window.location.reload();
}
