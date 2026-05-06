import { autoUpdater } from 'electron-updater';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance('AutoUpdater');

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate: string;
}

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  error?: string;
  progress?: number;
  info?: UpdateInfo;
}

type UpdateCallback = (status: UpdateStatus) => void;

class AutoUpdaterService {
  private status: UpdateStatus = {
    checking: false,
    available: false,
    downloaded: false,
  };
  
  private listeners: Set<UpdateCallback> = new Set();
  
  constructor() {
    this.setupAutoUpdater();
  }
  
  private setupAutoUpdater(): void {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    autoUpdater.on('checking-for-update', () => {
      this.updateStatus({ checking: true });
      this.notifyListeners();
    });
    
    autoUpdater.on('update-available', (info) => {
      this.updateStatus({
        checking: false,
        available: true,
        info: {
          version: info.version,
          releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
          releaseDate: info.releaseDate || new Date().toISOString(),
        },
      });
      this.notifyListeners();
    });
    
    autoUpdater.on('update-not-available', () => {
      this.updateStatus({ checking: false, available: false });
      this.notifyListeners();
    });
    
    autoUpdater.on('download-progress', (progress) => {
      this.updateStatus({ progress: progress.percent });
      this.notifyListeners();
    });
    
    autoUpdater.on('update-downloaded', () => {
      this.updateStatus({ checking: false, downloaded: true });
      this.notifyListeners();
    });
    
    autoUpdater.on('error', (error) => {
      this.updateStatus({
        checking: false,
        error: error.message || 'Unknown error',
      });
      this.notifyListeners();
    });
  }
  
  private updateStatus(partial: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...partial };
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.status);
      } catch (err) {
        logger.error('Error in update listener', err instanceof Error ? err : undefined);
      }
    });
  }
  
  public checkForUpdates(): void {
    logger.info('Checking for updates...');
    autoUpdater.checkForUpdates().catch(err => {
      logger.error('Failed to check for updates', err instanceof Error ? err : undefined);
      this.updateStatus({ checking: false, error: err.message });
      this.notifyListeners();
    });
  }
  
  public downloadUpdate(): void {
    if (!this.status.available) {
      logger.warn('No update available to download');
      return;
    }
    
    logger.info('Downloading update...');
    autoUpdater.downloadUpdate().catch(err => {
      logger.error('Failed to download update', err instanceof Error ? err : undefined);
      this.updateStatus({ error: err.message });
      this.notifyListeners();
    });
  }
  
  public installUpdate(): void {
    if (!this.status.downloaded) {
      logger.warn('Update not downloaded yet');
      return;
    }
    
    logger.info('Installing update and restarting...');
    autoUpdater.quitAndInstall(false, true);
  }
  
  public getStatus(): UpdateStatus {
    return { ...this.status };
  }
  
  public subscribe(callback: UpdateCallback): () => void {
    this.listeners.add(callback);
    callback(this.status);
    
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const autoUpdaterService = new AutoUpdaterService();
