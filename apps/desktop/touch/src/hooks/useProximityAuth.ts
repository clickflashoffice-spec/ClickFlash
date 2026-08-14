import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface ProximityState {
  isScanning: boolean;
  detectedGuestId: string | null;
  rssi: number | null; // Signal strength indicating distance
  error: string | null;
}

/**
 * Hook for Pillar 1: Hybrid Physical Layer
 * 
 * Uses the Web Bluetooth API to scan for guest smartphones broadcasting
 * a specific ClickFlash BLE service UUID. This allows for "Zero-Touch"
 * kiosk authentication when a guest is within ~5 meters, but remains
 * completely optional (falling back to standard RFID/Touch if not used).
 */
export const useProximityAuth = (serviceUUID: string = '0000FEAA-0000-1000-8000-00805F9B34FB') => {
  const [state, setState] = useState<ProximityState>({
    isScanning: false,
    detectedGuestId: null,
    rssi: null,
    error: null
  });

  const startScanning = useCallback(async () => {
    const nav = navigator as unknown as {
      bluetooth?: {
        requestDevice: (options: {
          filters: Array<{ services: string[] }>;
          optionalServices: string[];
        }) => Promise<{ name?: string; id: string; addEventListener: (event: string, cb: () => void) => void }>;
      };
    };

    // Check if the browser supports Web Bluetooth
    if (!nav.bluetooth) {
      setState(s => ({ ...s, error: 'Web Bluetooth API not supported on this kiosk hardware.' }));
      return;
    }

    try {
      setState(s => ({ ...s, isScanning: true, error: null }));
      
      // Request device with specific service UUID broadcasted by the guest's mobile app
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: [serviceUUID] }],
        optionalServices: ['battery_service'] // example optional service
      });

      logger.info(`[ProximityAuth] Found guest device: ${device.name || 'Unknown'} (ID: ${device.id})`);

      // In a real implementation, we would connect to the GATT server,
      // read the characteristic containing the Guest's secure token,
      // and read the RSSI value to determine if they are standing directly in front of the kiosk.
      
      // Simulated read of guest token
      const simulatedGuestId = `GUEST_${device.id.substring(0, 8).toUpperCase()}`;

      setState(s => ({
        ...s,
        isScanning: false,
        detectedGuestId: simulatedGuestId,
        rssi: -45 // Simulated strong signal
      }));

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        logger.info(`[ProximityAuth] Guest device disconnected or walked away.`);
        setState(s => ({ ...s, detectedGuestId: null, rssi: null }));
      });

    } catch (err: any) {
      // User cancelled the prompt, or no devices found
      logger.warn(`[ProximityAuth] Scanning failed or cancelled: ${err.message}`);
      setState(s => ({ ...s, isScanning: false, error: err.message }));
    }
  }, [serviceUUID]);

  return {
    ...state,
    startScanning
  };
};
