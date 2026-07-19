import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";
import { IMPORT_DIR } from "../config/constants";

class DslrTetherService {
    private tetherProcess: ChildProcess | null = null;
    private isRunning: boolean = false;
    private platform: NodeJS.Platform;

    constructor() {
        this.platform = process.platform;
        if (!fs.existsSync(IMPORT_DIR)) {
            fs.mkdirSync(IMPORT_DIR, { recursive: true });
        }
    }

    public startTether(): boolean {
        if (this.isRunning) {
            logger.warn("[DslrTether] Tether service is already running.");
            return true;
        }

        logger.info(`[DslrTether] Starting DSLR tethering for platform: ${this.platform}`);
        this.isRunning = true;

        if (this.platform === "win32") {
            this.startWindowsTether();
        } else {
            this.startUnixTether(); // macOS / Linux via gphoto2
        }

        return true;
    }

    public stopTether(): boolean {
        logger.info("[DslrTether] Stopping DSLR tethering...");
        this.isRunning = false;

        if (this.tetherProcess) {
            this.tetherProcess.kill();
            this.tetherProcess = null;
            return true;
        }
        return false;
    }

    public getStatus() {
        return {
            running: this.isRunning,
            platform: this.platform,
            pid: this.tetherProcess?.pid || null
        };
    }

    private startUnixTether() {
        // gphoto2 --capture-tethered --keep --filename "C:/Users/.../import/capture_%n.%C"
        const filenamePattern = path.join(IMPORT_DIR, "dslr_%Y%m%d%H%M%S_%n.%C");
        
        logger.info(`[DslrTether] Executing gphoto2 to folder: ${IMPORT_DIR}`);
        this.tetherProcess = spawn("gphoto2", [
            "--capture-tethered",
            "--keep", // Keep photo on camera SD card as backup
            "--filename",
            filenamePattern
        ]);

        this.tetherProcess.stdout?.on("data", (data) => {
            const output = data.toString();
            logger.debug(`[gphoto2] ${output.trim()}`);
            
            // Note: Since gphoto2 writes directly to IMPORT_DIR, the existing 
            // folderMonitor.ts will automatically pick up the new file and 
            // pass it to PhotoProcessor. No manual DB insertion needed here.
        });

        this.tetherProcess.stderr?.on("data", (data) => {
            logger.error(`[gphoto2 error] ${data.toString().trim()}`);
        });

        this.tetherProcess.on("close", (code) => {
            logger.info(`[DslrTether] gphoto2 process exited with code ${code}`);
            this.tetherProcess = null;

            // Auto-reconnect logic if still supposed to be running
            if (this.isRunning) {
                logger.info("[DslrTether] Camera disconnected or error. Retrying in 5 seconds...");
                setTimeout(() => {
                    if (this.isRunning) this.startUnixTether();
                }, 5000);
            }
        });
    }

    private startWindowsTether() {
        // For Windows, digiCamControl is typically installed at:
        // C:\Program Files (x86)\digiCamControl\CameraControlCmd.exe
        const cmdPath = "C:\\Program Files (x86)\\digiCamControl\\CameraControlCmd.exe";
        
        if (!fs.existsSync(cmdPath)) {
            logger.error(`[DslrTether] digiCamControl not found at ${cmdPath}. Please install it to use Windows tethering.`);
            this.isRunning = false;
            return;
        }

        // digiCamControl doesn't have a perfect persistent "tether" mode that streams stdout cleanly like gphoto2.
        // It requires passing a script or running a session. 
        // A common pattern is "/capture /filename <path>". 
        // For persistent tether listening, we use "/folder <IMPORT_DIR> /listen".
        // (Note: CLI syntax for continuous listening varies by digiCamControl version; we assume standard DccServer/Session behavior).
        
        logger.info(`[DslrTether] Executing CameraControlCmd to folder: ${IMPORT_DIR}`);
        this.tetherProcess = spawn(cmdPath, [
            "/session", "ClickFlash",
            "/folder", IMPORT_DIR
            // Assuming digiCamControl is configured via GUI to auto-export to this folder.
        ]);

        this.tetherProcess.stdout?.on("data", (data) => {
            logger.debug(`[digiCamControl] ${data.toString().trim()}`);
        });

        this.tetherProcess.stderr?.on("data", (data) => {
            logger.error(`[digiCamControl error] ${data.toString().trim()}`);
        });

        this.tetherProcess.on("close", (code) => {
            logger.info(`[DslrTether] CameraControlCmd exited with code ${code}`);
            this.tetherProcess = null;
            if (this.isRunning) {
                setTimeout(() => {
                    if (this.isRunning) this.startWindowsTether();
                }, 5000);
            }
        });
    }
}

export const dslrTetherService = new DslrTetherService();
