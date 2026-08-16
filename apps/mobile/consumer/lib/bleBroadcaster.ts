import { BLE_CONSTANTS } from '@clickflash/types';
import BlePeripheral from 'react-native-ble-peripheral';

export function startBroadcasting(userId: string, sessionToken: string) {
  console.log(`[BLE] Starting broadcast for user ${userId} with service UUID ${BLE_CONSTANTS.PROXIMITY_SERVICE_UUID}`);
  
  try {
    BlePeripheral.addService(BLE_CONSTANTS.PROXIMITY_SERVICE_UUID, true);
    BlePeripheral.start()
      .then((res: any) => console.log('[BLE] Broadcast started', res))
      .catch((err: any) => console.error('[BLE] Broadcast failed', err));
  } catch (err) {
    console.warn('[BLE] BlePeripheral mock/error (possibly not running on device):', err);
  }
}
