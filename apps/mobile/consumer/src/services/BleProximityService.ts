import { NativeModules, NativeEventEmitter } from 'react-native';

const { BleBeaconModule } = NativeModules;
const bleEmitter = new NativeEventEmitter(BleBeaconModule);

export class BleProximityService {
    private isBroadcasting = false;
    private isScanning = false;
    private userId: string;
    private discoveredPhotographers: Set<string> = new Set();
    private onPhotographerDiscoveredCallback: ((photographerId: string, sessionId?: string) => void) | null = null;

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
            if (BleBeaconModule?.startBroadcast) {
                await BleBeaconModule.startBroadcast('CLICKFLASH-V7-PROXIMITY', this.userId);
            }
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
            if (BleBeaconModule?.stopBroadcast) {
                await BleBeaconModule.stopBroadcast();
            }
            this.isBroadcasting = false;
        } catch (error) {
            console.error(`[BleProximity] Failed to stop broadcast:`, error);
        }
    }

    /**
     * Start scanning for Photographer Beacons in the background.
     * Automatically triggers album discovery and zero-friction linking.
     */
    public async startScanning(onDiscovered?: (photographerId: string, sessionId?: string) => void): Promise<void> {
        if (this.isScanning) return;
        if (onDiscovered) this.onPhotographerDiscoveredCallback = onDiscovered;

        try {
            console.log(`[BleProximity] Starting background scanning for ClickFlash beacons...`);
            this.isScanning = true;

            if (BleBeaconModule?.startScan) {
                await BleBeaconModule.startScan('CLICKFLASH-V7-PROXIMITY');
                bleEmitter.addListener('onBeaconDetected', (data: { photographerId: string; sessionId?: string; rssi: number }) => {
                    if (data.photographerId && !this.discoveredPhotographers.has(data.photographerId)) {
                        this.discoveredPhotographers.add(data.photographerId);
                        console.log(`[BleProximity] Auto-linked nearby photographer: ${data.photographerId} (RSSI: ${data.rssi})`);
                        if (this.onPhotographerDiscoveredCallback) {
                            this.onPhotographerDiscoveredCallback(data.photographerId, data.sessionId);
                        }
                    }
                });
            } else {
                // Mock listener for simulation/dev
                console.log(`[BleProximity] Background receiver listening (mock mode active)`);
            }
        } catch (error) {
            console.error(`[BleProximity] Failed to start scanning:`, error);
        }
    }

    public async stopScanning(): Promise<void> {
        if (!this.isScanning) return;
        try {
            if (BleBeaconModule?.stopScan) {
                await BleBeaconModule.stopScan();
            }
            bleEmitter.removeAllListeners('onBeaconDetected');
            this.isScanning = false;
            console.log(`[BleProximity] Background scanning stopped.`);
        } catch (error) {
            console.error(`[BleProximity] Failed to stop scanning:`, error);
        }
    }
}

