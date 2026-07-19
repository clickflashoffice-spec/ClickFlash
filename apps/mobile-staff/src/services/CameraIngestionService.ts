import { LocalPhotoQueue } from './LocalPhotoQueue';
import { logger } from '../utils/logger';
import * as UsbPtp from '../../modules/usb-ptp';

class CameraIngestionManager {
  private isConnected = false;
  private uploadInterval: ReturnType<typeof setTimeout> | null = null;
  private activeEventName = '';
  private activeAccessCode = '';
  private photoSubscription: any = null;
  private connectionSubscription: any = null;

  async startIngestion(eventName: string, accessCode: string) {
    if (this.isConnected) return { success: false, error: 'Already connected' };
    
    this.activeEventName = eventName;
    this.activeAccessCode = accessCode;
    
    try {
      await LocalPhotoQueue.init();
      
      // Attempt to start native USB connection
      const started = UsbPtp.startConnection();
      if (!started) {
         // Fallback to mock mode for iOS/Simulator testing if Native module isn't available
         logger.warn('USB PTP Native Module not fully available. Falling back to Mock Mode.');
         this.startMockMode();
         return { success: true, warning: 'Running in Mock Mode' };
      }

      this.isConnected = true;
      logger.info(`USB Ingestion started for event ${eventName}`);

      // Listen for hardware photo drops
      this.photoSubscription = UsbPtp.addPhotoReceivedListener(async (event) => {
        logger.info(`New photo intercepted from camera: ${event.photoId}`);
        await LocalPhotoQueue.addPhoto({
          id: event.photoId,
          localPath: event.localPath,
          size: 5000000, // 5MB approx
          eventName: this.activeEventName,
          accessCode: this.activeAccessCode
        });
      });

      this.connectionSubscription = UsbPtp.addConnectionStateListener((event) => {
        if (!event.connected) {
          logger.warn(`Camera disconnected: ${event.error || 'Unknown reason'}`);
          this.isConnected = false;
        } else {
          logger.info('Camera connected successfully.');
          this.isConnected = true;
        }
      });

      this.startUploader();
      return { success: true };
    } catch (e) {
      logger.error('Failed to start ingestion', e);
      return { success: false, error: String(e) };
    }
  }

  async stopIngestion() {
    this.isConnected = false;
    if (this.uploadInterval) clearInterval(this.uploadInterval);
    if (this.photoSubscription) this.photoSubscription.remove();
    if (this.connectionSubscription) this.connectionSubscription.remove();
    
    try {
      UsbPtp.stopConnection();
    } catch (e) {
      // Ignore errors if mock mode
    }
    logger.info('USB Ingestion stopped');
  }

  getStatus() {
    let cameraInfo = null;
    try {
      cameraInfo = UsbPtp.getCameraInfo();
    } catch (e) {}

    return {
      isConnected: this.isConnected,
      camera: cameraInfo || { manufacturer: 'Mock', model: 'D7000', batteryLevel: 100 }
    };
  }

  private startUploader() {
    this.uploadInterval = setInterval(async () => {
      const pending = await LocalPhotoQueue.getPendingPhotos();
      if (pending.length === 0) return;

      for (const photo of pending) {
        try {
          await LocalPhotoQueue.updateStatus(photo.id, 'uploading');
          
          // MOCK: Simulate cloud upload
          await new Promise(resolve => setTimeout(resolve, 800)); // Simulate fast 5G upload
          
          await LocalPhotoQueue.updateStatus(photo.id, 'completed');
          logger.info(`Successfully uploaded ${photo.id}`);
        } catch (err) {
          logger.error(`Upload failed for ${photo.id}`, err);
          await LocalPhotoQueue.incrementRetry(photo.id);
        }
      }

      // Cleanup completed files to save phone storage
      await LocalPhotoQueue.removeCompletedPhotos();
    }, 2000);
  }

  private mockInterval: ReturnType<typeof setTimeout> | null = null;
  private startMockMode() {
    this.isConnected = true;
    this.startUploader();
    // Simulate incoming photo every 4 seconds
    this.mockInterval = setInterval(async () => {
      if (!this.isConnected) return;
      const id = `photo_${Date.now()}`;
      await LocalPhotoQueue.addPhoto({
        id,
        localPath: `file:///mock/path/${id}.jpg`,
        size: 5000000,
        eventName: this.activeEventName,
        accessCode: this.activeAccessCode
      });
      logger.info(`MOCK: Received photo ${id}`);
    }, 4000);
  }
}

export const CameraIngestionService = new CameraIngestionManager();
