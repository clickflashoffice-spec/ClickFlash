import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { syncService } from './SyncService';

export interface ShiftEvent {
  id: string;
  photographerId: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  timestamp: number;
  latitude: number | null;
  longitude: number | null;
  biometricVerified: boolean;
  biometricMethod?: 'FACE_VECTOR' | 'LOCAL_AUTH';
  biometricConfidence?: number;
  syncStatus: 'PENDING' | 'SYNCED';
}

export class ShiftService {
  private static instance: ShiftService;
  private pendingShifts: ShiftEvent[] = [];

  private constructor() {}

  public static getInstance(): ShiftService {
    if (!ShiftService.instance) {
      ShiftService.instance = new ShiftService();
    }
    return ShiftService.instance;
  }

  /**
   * Performs the Face Scan or Fingerprint verification using device local authentication.
   */
  private async verifyBiometrics(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      console.warn('Biometrics not available or not enrolled.');
      return false; // Fallback to unverified if no hardware
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify Identity for Shift',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });

    return result.success;
  }

  /**
   * Captures the current GPS location if permissions are granted.
   */
  private async captureLocation(): Promise<{ lat: number | null; lng: number | null }> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { lat: null, lng: null };
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
    } catch (e) {
      return { lat: null, lng: null };
    }
  }

  /**
   * Clocks the photographer in or out, supporting both Face Vector and Local Auth.
   */
  public async logShift(
    photographerId: string,
    type: 'CLOCK_IN' | 'CLOCK_OUT',
    biometricMethod: 'FACE_VECTOR' | 'LOCAL_AUTH' = 'LOCAL_AUTH',
    confidence: number = 1.0
  ): Promise<ShiftEvent | null> {
    let verified = false;

    if (biometricMethod === 'FACE_VECTOR') {
      // Already verified via FaceBiometricService before calling logShift
      verified = true;
    } else {
      verified = await this.verifyBiometrics();
    }

    if (!verified) {
      // If they cancel or fail verification, reject the shift log.
      return null;
    }

    const loc = await this.captureLocation();

    const event: ShiftEvent = {
      id: Math.random().toString(36).substring(7),
      photographerId,
      type,
      timestamp: Date.now(),
      latitude: loc.lat,
      longitude: loc.lng,
      biometricVerified: verified,
      biometricMethod,
      biometricConfidence: confidence,
      syncStatus: 'PENDING',
    };

    this.pendingShifts.push(event);
    
    // Attempt to sync immediately
    this.syncShifts();

    return event;
  }

  /**
   * Attempts to send pending shift events via the Master PC (LAN) or directly to Cloudflare if possible.
   * We leverage the existing SyncService for the ecosystem routing.
   */
  private async syncShifts() {
    for (const shift of this.pendingShifts) {
      if (shift.syncStatus === 'SYNCED') continue;

      try {
        // Here we attempt to use the SyncService's WebSocket to push the event to the Master PC.
        const success = await syncService.pushShiftEvent(shift);
        if (success) {
          shift.syncStatus = 'SYNCED';
        }
      } catch (err) {
        console.error('Failed to sync shift event:', err);
      }
    }
    
    // Clear synced ones
    this.pendingShifts = this.pendingShifts.filter(s => s.syncStatus === 'PENDING');
  }

  /**
   * Gets pending shifts (for UI display or debug)
   */
  public getPendingShifts(): ShiftEvent[] {
    return this.pendingShifts;
  }
}
