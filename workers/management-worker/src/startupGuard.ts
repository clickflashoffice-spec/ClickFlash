import path from 'path';
import { logger } from "@clickflash/logger";

export class StartupGuard {
    private appType: 'MASTER' | 'TOUCH' | 'MANAGEMENT';
    private rootDir: string;

    constructor(appType: 'MASTER' | 'TOUCH' | 'MANAGEMENT') {
        this.appType = appType;
        this.rootDir = process.cwd();
    }

    verify(): void {
        logger.info(String(`[StartupGuard] Verifying context for ${this.appType}`));
        const currentPath = this.rootDir.toLowerCase();

        if (this.appType === 'MASTER') {
            if (currentPath.includes('touch')) {
                throw new Error('VIOLATION LAW 01: Master App detected in a "Touch" directory path.');
            }
        }

        if (this.appType === 'TOUCH') {
            if (currentPath.includes('master')) {
                throw new Error('VIOLATION LAW 01: Touch App detected in a "Master" directory path.');
            }
        }

        logger.info(String(`[StartupGuard] ✅ Identity Checked. Running as ${this.appType}`));
    }
}

export default StartupGuard;
