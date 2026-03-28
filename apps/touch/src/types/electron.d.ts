/**
 * Electron Window API Types
 * 
 * Type definitions for the Electron API exposed on the window object.
 * This provides type safety when accessing window.electron in the Touch app.
 */

export interface ElectronAPI {
    /** Exit the kiosk application */
    exitKiosk: () => void;
    /** Logger interface for Electron main process */
    logger: {
        error: (message: string, meta?: Record<string, unknown>) => void;
        info: (message: string, meta?: Record<string, unknown>) => void;
        warn: (message: string, meta?: Record<string, unknown>) => void;
        debug: (message: string, meta?: Record<string, unknown>) => void;
    };
    /** Check if running in Electron environment */
    isElectron: boolean;
}

declare global {
    interface Window {
        /** Electron API exposed by the preload script */
        electron?: ElectronAPI;
        /** Sentry error tracking (available in production) */
        Sentry?: {
            captureException: (error: Error) => void;
            withScope: (callback: (scope: {
                setTag: (key: string, value: string) => void;
                setExtra: (key: string, value: unknown) => void;
            }) => void) => void;
        };
        /** Google Analytics gtag */
        gtag?: (
            command: string,
            eventName: string,
            params?: Record<string, unknown>
        ) => void;
    }
}

export {};
