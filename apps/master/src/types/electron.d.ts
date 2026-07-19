export interface DesktopFileFilter {
    name: string;
    extensions: string[];
}

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
    version?: string;
    releaseNotes?: string;
}

export interface MasterElectronAPI {
    isElectron: true;
    platform: NodeJS.Platform;
    kiosk: {
        unlock: (pin: string) => Promise<{ success: boolean; error?: string }>;
        lock: () => Promise<{ success: boolean }>;
        onShowUnlockDialog: (callback: () => void) => () => void;
    };
    dialogs: {
        openDirectory: (options?: { title?: string; buttonLabel?: string }) => Promise<string | null>;
        openFile: (options?: { multiple?: boolean; title?: string; filters?: DesktopFileFilter[] }) => Promise<string | string[] | null>;
        saveFile: (options?: { title?: string; filters?: DesktopFileFilter[]; defaultPath?: string }) => Promise<string | null>;
    };
    printing: {
        getPrinters: () => Promise<DesktopPrinterInfo[]>;
        print: (options: { printer: string; silent?: boolean }) => Promise<{ success: true }>;
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
}

declare global {
    interface Window {
        electron?: MasterElectronAPI;
    }
}

export {};
