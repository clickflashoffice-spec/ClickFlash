import { logger } from '@clickflash/logger';
import { OfflineQueue } from './StaffOfflineQueue';

export type ShiftEventType = 'SHIFT_STARTED' | 'SHIFT_ENDED' | 'BREAK_STARTED' | 'BREAK_ENDED';

export interface ShiftEventPayload {
  staffId: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: Record<string, any>;
}

export class ShiftManager {
  async authenticateIdentity(nfcQrData: string): Promise<string | null> {
    try {
      const parsed = JSON.parse(nfcQrData);
      if (parsed && parsed.staffId && parsed.token) {
        logger.info(`[ShiftManager] Authenticated staff ${parsed.staffId} from NFC/QR`);
        return parsed.staffId;
      }
      return null;
    } catch (e) {
      logger.warn('[ShiftManager] Failed to authenticate identity from NFC/QR data');
      return null;
    }
  }

  private async enqueueShiftEvent(
    staffId: string, 
    eventType: ShiftEventType, 
    location?: { latitude: number, longitude: number },
    metadata?: Record<string, any>
  ) {
    const payload: ShiftEventPayload = {
      staffId,
      timestamp: new Date().toISOString(),
      location,
      metadata
    };
    
    await OfflineQueue.enqueue(eventType, payload);
    logger.info(`[ShiftManager] Generated and enqueued ${eventType} for staff ${staffId}`);
  }

  async startShift(nfcQrData: string, location?: { latitude: number, longitude: number }) {
    const staffId = await this.authenticateIdentity(nfcQrData);
    if (!staffId) throw new Error('Authentication failed: Invalid NFC/QR token');
    await this.enqueueShiftEvent(staffId, 'SHIFT_STARTED', location);
  }

  async endShift(nfcQrData: string, location?: { latitude: number, longitude: number }) {
    const staffId = await this.authenticateIdentity(nfcQrData);
    if (!staffId) throw new Error('Authentication failed: Invalid NFC/QR token');
    await this.enqueueShiftEvent(staffId, 'SHIFT_ENDED', location);
  }

  async startBreak(nfcQrData: string, location?: { latitude: number, longitude: number }) {
    const staffId = await this.authenticateIdentity(nfcQrData);
    if (!staffId) throw new Error('Authentication failed: Invalid NFC/QR token');
    await this.enqueueShiftEvent(staffId, 'BREAK_STARTED', location);
  }

  async endBreak(nfcQrData: string, location?: { latitude: number, longitude: number }) {
    const staffId = await this.authenticateIdentity(nfcQrData);
    if (!staffId) throw new Error('Authentication failed: Invalid NFC/QR token');
    await this.enqueueShiftEvent(staffId, 'BREAK_ENDED', location);
  }
}

export const shiftManager = new ShiftManager();
