/**
 * Kiosk Manager for Phase 71
 * Strict kiosk mode with PIN protection and guardian process
 */

import { BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { getLogger } from '../utils/logger';
import { KIOSK } from '../utils/constants';

const logger = getLogger('kiosk');

export class KioskManager {
  private window: BrowserWindow;
  private guardianProcess: ChildProcess | null = null;
  private isKioskLocked = true;
  private adminPin: string;

  constructor(window: BrowserWindow, adminPin?: string) {
    this.window = window;
    this.adminPin = adminPin || process.env.ADMIN_PIN || KIOSK.DEFAULT_PIN;
  }

  /**
   * Enable kiosk mode
   */
  async enableKioskMode(): Promise<void> {
    logger.info('Enabling kiosk mode');

    // Set window to kiosk mode
    this.window.setKiosk(true);
    this.window.setFullScreen(true);
    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.setVisibleOnAllWorkspaces(true);
    this.window.setMenuBarVisibility(false);

    // Prevent minimize
    this.window.on('minimize', () => {
      setTimeout(() => {
        this.window.restore();
        this.window.focus();
      }, 100);
    });

    // Prevent blur (keep focused)
    this.window.on('blur', () => {
      if (this.isKioskLocked) {
        setTimeout(() => {
          this.window.focus();
        }, 100);
      }
    });

    // Start guardian process
    this.startGuardian();

    this.isKioskLocked = true;
    logger.info('Kiosk mode enabled');
  }

  /**
   * Disable kiosk mode (admin only)
   */
  async disableKioskMode(): Promise<void> {
    logger.info('Disabling kiosk mode');

    this.isKioskLocked = false;

    // Stop guardian process
    this.stopGuardian();

    // Restore window
    this.window.setKiosk(false);
    this.window.setFullScreen(false);
    this.window.setAlwaysOnTop(false);
    this.window.setVisibleOnAllWorkspaces(false);

    logger.info('Kiosk mode disabled');
  }

  /**
   * Unlock kiosk with PIN
   */
  async unlock(pin: string): Promise<{ success: boolean; error?: string }> {
    logger.info('Unlock attempt');

    if (pin === this.adminPin) {
      await this.disableKioskMode();
      return { success: true };
    }

    logger.warn('Invalid unlock PIN attempted');
    return { success: false, error: 'Invalid PIN' };
  }

  /**
   * Lock kiosk mode
   */
  async lock(): Promise<{ success: boolean }> {
    await this.enableKioskMode();
    return { success: true };
  }

  /**
   * Emergency unlock (admin shortcut)
   */
  async emergencyUnlock(): Promise<void> {
    logger.info('Emergency unlock triggered');
    await this.disableKioskMode();
    
    // Show confirmation dialog
    const { dialog } = require('electron');
    dialog.showMessageBox(this.window, {
      type: 'warning',
      title: 'Kiosk Mode Disabled',
      message: 'Emergency unlock activated',
      detail: 'Kiosk mode has been disabled. Press OK to continue.',
      buttons: ['OK'],
    });
  }

  /**
   * Check if kiosk is locked
   */
  isLocked(): boolean {
    return this.isKioskLocked;
  }

  /**
   * Start guardian process (blocks OS shortcuts)
   */
  private startGuardian(): void {
    if (this.guardianProcess) {
      return;
    }

    const guardianPath = this.getGuardianPath();
    
    if (!fs.existsSync(guardianPath)) {
      logger.warn('Guardian process not found', { path: guardianPath });
      return;
    }

    try {
      logger.info('Starting guardian process', { path: guardianPath });
      
      this.guardianProcess = spawn(guardianPath, [], {
        detached: false,
        windowsHide: true,
      });

      this.guardianProcess.on('error', (error) => {
        logger.error('Guardian process error', error);
        this.guardianProcess = null;
      });

      this.guardianProcess.on('exit', (code) => {
        logger.info('Guardian process exited', { code });
        this.guardianProcess = null;
        
        // Restart if kiosk still locked
        if (this.isKioskLocked) {
          setTimeout(() => this.startGuardian(), 1000);
        }
      });
    } catch (error) {
      logger.error('Failed to start guardian process', error);
    }
  }

  /**
   * Stop guardian process
   */
  private stopGuardian(): void {
    if (!this.guardianProcess) {
      return;
    }

    logger.info('Stopping guardian process');

    try {
      this.guardianProcess.kill();
      this.guardianProcess = null;
    } catch (error) {
      logger.error('Error stopping guardian process', error);
    }
  }

  /**
   * Get guardian executable path
   */
  private getGuardianPath(): string {
    const possiblePaths = [
      path.join(process.cwd(), KIOSK.GUARDIAN_PROCESS_NAME),
      path.join(process.resourcesPath || '', KIOSK.GUARDIAN_PROCESS_NAME),
      path.join(__dirname, '../../../', KIOSK.GUARDIAN_PROCESS_NAME),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return path.join(process.cwd(), KIOSK.GUARDIAN_PROCESS_NAME);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopGuardian();
  }
}
