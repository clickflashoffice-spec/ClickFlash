// backend/workers/folderWorker.ts (Phase 130)
// High-performance background folder monitor

import fs from "fs";
import path from "path";
import { parentPort, workerData } from "worker_threads";
import si from "systeminformation";

interface WorkerConfig {
    masterImportPath: string;
    touchExportPath: string;
    kioskSyncFolder: string;
    interval?: number;
}

const config: WorkerConfig = workerData;
const monitorInterval = config.interval || 2000; // Slower than 1s to save CPU, but still responsive

let isScanning = false;

async function scan() {
    if (isScanning) return;
    isScanning = true;

    try {
        const monitorPaths = new Set<string>();
        if (config.masterImportPath) monitorPaths.add(config.masterImportPath);

        // Auto-detect removable drives (Windows)
        if (process.platform === "win32") {
            try {
                const disks = await si.blockDevices();
                const removableDrives = disks.filter(d => d.removable && d.mount && d.mount.length >= 2);
                removableDrives.forEach(d => {
                    const driveRoot = d.mount.endsWith(path.sep) ? d.mount : d.mount + path.sep;
                    monitorPaths.add(driveRoot);
                    const dcimPath = path.join(driveRoot, "DCIM");
                    if (fs.existsSync(dcimPath)) monitorPaths.add(dcimPath);
                });
            } catch {
                // Ignore silent detect failures
            }
        }

        for (const currentPath of monitorPaths) {
            try {
                await fs.promises.access(currentPath);
            } catch {
                continue;
            }

            // Internal Safeguard
            if (config.kioskSyncFolder && path.resolve(currentPath) === path.resolve(config.kioskSyncFolder)) continue;

            const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
            const albumFolders = entries.filter(d => d.isDirectory() && d.name.startsWith("album_"));

            // Process all album folders concurrently to handle simultaneous BLE tethered ingestions
            const scanPromises = albumFolders.map(async (folder) => {
                const albumPath = path.join(currentPath, folder.name);
                
                // Skip export folders
                if (config.touchExportPath && path.resolve(albumPath) === path.resolve(config.touchExportPath)) return;

                // Scan for files and report back to main process
                await scanAlbum(albumPath, folder.name.replace("album_", ""));
            });

            await Promise.allSettled(scanPromises);
        }
    } catch (err) {
        if (parentPort) parentPort.postMessage({ type: 'ERROR', error: err instanceof Error ? err.message : String(err) });
    } finally {
        isScanning = false;
    }
}

async function scanAlbum(albumPath: string, albumId: string) {
    const scanRecursive = async (dirPath: string, roomNum: string | null = null) => {
        let items: fs.Dirent[];
        try {
            items = await fs.promises.readdir(dirPath, { withFileTypes: true });
        } catch {
            return;
        }

        const files = items.filter(i => i.isFile() && /\.(jpg|jpeg|png|webp|heic)$/i.test(i.name));
        const subdirs = items.filter(i => i.isDirectory());

        if (files.length > 0 && parentPort) {
            parentPort.postMessage({
                type: 'FOUND_FILES',
                albumId,
                albumPath: dirPath,
                files: files.map(f => f.name),
                roomNumber: roomNum
            });
        }

        for (const dir of subdirs) {
            await scanRecursive(path.join(dirPath, dir.name), roomNum || dir.name);
        }
    };

    await scanRecursive(albumPath);
}

// Start Pulse
setInterval(scan, monitorInterval);
scan(); // Initial scan
