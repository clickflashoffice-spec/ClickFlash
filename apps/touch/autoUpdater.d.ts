import { BrowserWindow } from "electron";

export interface UpdateStatus {
    checking: boolean;
    available: boolean;
    downloaded: boolean;
    error: string | null;
    progress: number;
    version: string | null;
    releaseNotes: string | null;
}

export function initAutoUpdater(window: BrowserWindow): void;
export function forceCheckForUpdates(): void;
export function getUpdateStatus(): UpdateStatus;
