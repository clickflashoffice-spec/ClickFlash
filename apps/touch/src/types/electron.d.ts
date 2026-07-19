export interface DesktopPrinterInfo {
    name: string;
    displayName: string;
    description: string;
    status: number;
    isDefault: boolean;
    options?: Record<string, string>;
}

export interface DesktopUpdateStatus {
    checking: boolean;
    available: boolean;
    downloaded: boolean;
    error: string | null;
    progress: number;
    version: string | null;
    releaseNotes: string | null;
}

export interface ElectronAPI {
    isElectron: true;
    platform: NodeJS.Platform;
    exitKiosk: (password: string) => Promise<boolean>;
    enterKiosk: () => Promise<{ success: boolean }>;
    getAppVersion: () => Promise<string>;
    restartApp: () => Promise<void>;
    kiosk: {
        authenticate: (password: string) => Promise<boolean>;
        unlock: (pin: string) => Promise<{ success: boolean; error?: string }>;
        lock: () => Promise<{ success: boolean }>;
        onShowUnlockDialog: (callback: () => void) => () => void;
    };
    printing: {
        getPrinters: () => Promise<DesktopPrinterInfo[]>;
        print: (options: { printer: string; silent?: boolean }) => Promise<boolean>;
    };
    updater: {
        check: () => Promise<DesktopUpdateStatus>;
        download: () => Promise<DesktopUpdateStatus>;
        install: () => Promise<void>;
        getStatus: () => Promise<DesktopUpdateStatus>;
        onChecking: (callback: () => void) => () => void;
        onAvailable: (callback: (info: { version?: string; releaseNotes?: string }) => void) => () => void;
        onNotAvailable: (callback: () => void) => () => void;
        onProgress: (callback: (progress: { percent?: number }) => void) => () => void;
        onDownloaded: (callback: (info: { version?: string }) => void) => () => void;
        onError: (callback: (error: { message?: string }) => void) => () => void;
    };
    scanner: {
        onData: (callback: (data: string) => void) => () => void;
        onStatus: (callback: (status: string) => void) => () => void;
    };
}

declare global {
    interface Window {
        electron?: ElectronAPI;
        touchApp?: { isDesktop: true; platform: NodeJS.Platform };
        Sentry?: {
            captureException: (error: Error) => void;
            withScope: (callback: (scope: {
                setTag: (key: string, value: string) => void;
                setExtra: (key: string, value: unknown) => void;
            }) => void) => void;
        };
        gtag?: (
            command: string,
            eventName: string,
            params?: Record<string, unknown>
        ) => void;
        __TEST_LOCAL_STORAGE?: Storage;
        sendSyncMessage?: (item: unknown) => Promise<unknown>;
    }
}

export {};
