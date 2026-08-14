import { NativeModules, NativeEventEmitter } from 'react-native';

const { BleBeaconModule } = NativeModules;
const bleEmitter = new NativeEventEmitter(BleBeaconModule);

export class BleProximityService {
    private isBroadcasting = false;
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    /**
     * Start broadcasting a BLE beacon that the Photographer Pro app can detect.
     * This allows for "Zero-Click" proximity linking.
     */
    public async startBroadcasting(): Promise<void> {
        if (this.isBroadcasting) return;
        
        try {
            console.log(`[BleProximity] Starting BLE broadcast for user ${this.userId}...`);
            // The UUID acts as the ClickFlash namespace, the payload is the encrypted userId
            await BleBeaconModule.startBroadcast('CLICKFLASH-V7-PROXIMITY', this.userId);
            this.isBroadcasting = true;
            console.log(`[BleProximity] Broadcasting active.`);
        } catch (error) {
            console.error(`[BleProximity] Failed to start broadcast:`, error);
        }
    }

    public async stopBroadcasting(): Promise<void> {
        if (!this.isBroadcasting) return;

        try {
            console.log(`[BleProximity] Stopping BLE broadcast...`);
            await BleBeaconModule.stopBroadcast();
            this.isBroadcasting = false;
        } catch (error) {
            console.error(`[BleProximity] Failed to stop broadcast:`, error);
        }
    }
}
