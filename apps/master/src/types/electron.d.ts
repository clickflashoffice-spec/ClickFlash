// Electron API Type Definitions
// This file provides TypeScript definitions for the Electron API exposed to the renderer process

declare global {
    interface Window {
        electron?: {
            getPrinters: () => Promise<Array<{
                name: string;
                displayName: string;
                description: string;
                status: number;
                isDefault: boolean;
                options?: Record<string, any>;
            }>>;
            print: (options: {
                printer: string;
                content?: string;
                silent?: boolean;
            }) => Promise<{ success: boolean }>;
        };
    }
}

export { };
