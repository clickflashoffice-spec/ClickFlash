import { logger } from '../utils/logger';
import { pb } from './pb';

/**
 * RFID Service
 * 
 * Handles RFID wristband scanning and room number mapping.
 * Supports multiple RFID reader protocols and interfaces.
 * 
 * Features:
 * - USB/Serial RFID reader support
 * - RFID UID to room number mapping
 * - Automatic room number lookup
 * - Fallback to manual entry if RFID fails
 * 
 * @class RFIDService
 */

interface RFIDMapping {
    rfidUid: string;
    roomNumber: string;
    guestName?: string;
    guestId?: string;
    createdAt?: string;
}

class RFIDService {
    private isListening = false;
    private serialReader: SerialPort | null = null;
    private onRFIDDetectedCallback: ((roomNumber: string, rfidUid: string) => void) | null = null;
    private readonly STORAGE_KEY = 'rfidMappings';
    private mappings: Map<string, RFIDMapping> = new Map();

    constructor() {
        this.loadMappings();
    }

    /**
     * Load RFID mappings from localStorage or database
     */
    private loadMappings() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const mappingsArray: RFIDMapping[] = JSON.parse(saved);
                mappingsArray.forEach(mapping => {
                    this.mappings.set(mapping.rfidUid.toUpperCase(), mapping);
                });
                logger.info("[RFIDService] Loaded RFID mappings", { count: this.mappings.size });
            }
        } catch (e) {
            logger.warn("[RFIDService] Failed to load RFID mappings", { error: e instanceof Error ? e.message : String(e) });
        }
    }

    /**
     * Save RFID mappings to localStorage
     */
    private saveMappings() {
        try {
            const mappingsArray = Array.from(this.mappings.values());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mappingsArray));
        } catch (e) {
            logger.warn("[RFIDService] Failed to save RFID mappings", { error: e instanceof Error ? e.message : String(e) });
        }
    }

    /**
     * Map RFID UID to room number
     * 
     * @param rfidUid - RFID unique identifier
     * @param roomNumber - Room number to map
     * @param guestName - Optional guest name
     * @param guestId - Optional guest ID
     */
    public mapRFIDToRoom(rfidUid: string, roomNumber: string, guestName?: string, guestId?: string) {
        const mapping: RFIDMapping = {
            rfidUid: rfidUid.toUpperCase(),
            roomNumber: roomNumber.trim(),
            guestName,
            guestId,
            createdAt: new Date().toISOString()
        };

        this.mappings.set(mapping.rfidUid, mapping);
        this.saveMappings();
        logger.info("[RFIDService] Mapped RFID to room", { rfidUid: mapping.rfidUid, roomNumber });
    }

    /**
     * Get room number from RFID UID
     * 
     * @param rfidUid - RFID unique identifier
     * @returns Room number if found, null otherwise
     */
    public getRoomFromRFID(rfidUid: string): string | null {
        const normalizedUid = rfidUid.toUpperCase().trim();
        const mapping = this.mappings.get(normalizedUid);

        if (mapping) {
            logger.debug("[RFIDService] Found room mapping", { rfidUid: normalizedUid, roomNumber: mapping.roomNumber });
            return mapping.roomNumber;
        }

        // Try to find in database (users/guests collection)
        // This would require a users/guests table with RFID field
        logger.debug("[RFIDService] No local mapping found", { rfidUid: normalizedUid });
        return null;
    }

    /**
     * Start listening for RFID scans via Web Serial API (Chrome/Edge)
     * 
     * @param onRFIDDetected - Callback when RFID is detected
     */
    public async startSerialRFIDListener(onRFIDDetected: (roomNumber: string, rfidUid: string) => void): Promise<boolean> {
        if (!('serial' in navigator)) {
            logger.warn("[RFIDService] Web Serial API not supported in this browser");
            return false;
        }

        // Web Serial API requires a secure context (HTTPS) or localhost
        if (!window.isSecureContext) {
            logger.warn("[RFIDService] Web Serial API requires a secure context (HTTPS).", { protocol: window.location.protocol });
            return false;
        }

        if (this.isListening) {
            logger.debug("[RFIDService] Already listening for RFID scans");
            return true;
        }

        try {
            // Request access to serial port
            const port = await navigator.serial.requestPort();

            // Configure port (9600 baud is common for RFID readers)
            await port.open({ baudRate: 9600 });

            this.serialReader = port;
            this.onRFIDDetectedCallback = onRFIDDetected;
            this.isListening = true;

            // Start reading from serial port
            this.readFromSerialPort(port);

            logger.info("[RFIDService] Started serial RFID listener");
            return true;
        } catch (error) {
            logger.error("[RFIDService] Failed to start serial RFID listener", {}, error instanceof Error ? error : undefined);
            return false;
        }
    }

    /**
     * Read RFID UID from serial port
     */
    private async readFromSerialPort(port: SerialPort) {
        const reader = port.readable?.getReader();
        if (!reader) {
            logger.error("[RFIDService] Could not get serial port reader");
            return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (this.isListening) {
            try {
                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                // Append data to buffer
                buffer += decoder.decode(value, { stream: true });

                // RFID readers typically send UID followed by newline or carriage return
                // Common formats: "1234567890\r\n" or "1234567890\n"
                const lines = buffer.split(/\r?\n/);

                // Process complete lines (keep incomplete line in buffer)
                for (let i = 0; i < lines.length - 1; i++) {
                    const rfidUid = lines[i].trim();

                    if (rfidUid.length > 0) {
                        this.handleRFIDScan(rfidUid);
                    }
                }

                // Keep last (possibly incomplete) line in buffer
                buffer = lines[lines.length - 1];

            } catch (error) {
                logger.error("[RFIDService] Error reading from serial port", {}, error instanceof Error ? error : undefined);
                break;
            }
        }

        reader.releaseLock();
    }

    /**
     * Handle RFID scan event
     */
    private handleRFIDScan(rfidUid: string) {
        const normalizedUid = rfidUid.toUpperCase().trim();

        logger.info("[RFIDService] RFID detected", { rfidUid: normalizedUid });

        // Get room number from mapping
        const roomNumber = this.getRoomFromRFID(normalizedUid);

        if (roomNumber && this.onRFIDDetectedCallback) {
            this.onRFIDDetectedCallback(roomNumber, normalizedUid);
        } else {
            logger.warn("[RFIDService] No room mapping found for RFID", { rfidUid: normalizedUid });
            // Could trigger a callback for unknown RFID to allow manual mapping
        }
    }

    /**
     * Stop listening for RFID scans
     */
    public async stopRFIDListener() {
        this.isListening = false;

        if (this.serialReader) {
            try {
                await this.serialReader.close();
                this.serialReader = null;
            } catch (error) {
                logger.error("[RFIDService] Error closing serial port", {}, error instanceof Error ? error : undefined);
            }
        }

        this.onRFIDDetectedCallback = null;
        logger.info("[RFIDService] Stopped RFID listener");
    }

    /**
     * Simulate RFID scan (for testing without hardware)
     * 
     * @param rfidUid - RFID UID to simulate
     * @param roomNumber - Room number to return
     */
    public simulateRFIDScan(rfidUid: string, roomNumber: string) {
        logger.debug("[RFIDService] Simulating RFID scan", { rfidUid, roomNumber });
        this.handleRFIDScan(rfidUid);
    }

    /**
     * Check if Web Serial API is available
     */
    public isSerialAPIAvailable(): boolean {
        return 'serial' in navigator;
    }

    /**
     * Get all RFID mappings
     */
    public getAllMappings(): RFIDMapping[] {
        return Array.from(this.mappings.values());
    }

    /**
     * Remove RFID mapping
     */
    public removeMapping(rfidUid: string) {
        const normalizedUid = rfidUid.toUpperCase();
        if (this.mappings.delete(normalizedUid)) {
            this.saveMappings();
            logger.info("[RFIDService] Removed RFID mapping", { rfidUid: normalizedUid });
            return true;
        }
        return false;
    }

    /**
     * Try to find room number from database by RFID UID
     */
    public async lookupRoomFromDatabase(rfidUid: string): Promise<string | null> {
        try {
            // Try to find in users/guests collection if it has an rfid field
            // This is a placeholder - adjust based on your actual schema
            const users = await pb.collection('users').getFullList({
                filter: `rfidUid = "${rfidUid.toUpperCase()}"`
            }).catch(() => []);

            if (users.length > 0 && users[0]) {
                const user = users[0] as Record<string, unknown>;
                if (user.roomNumber) {
                    logger.info("[RFIDService] Found room in database", { rfidUid, roomNumber: user.roomNumber });
                    // Cache the mapping for future use
                    this.mapRFIDToRoom(rfidUid, user.roomNumber, user.name, user.id);
                    return user.roomNumber;
                }
            }
        } catch (error) {
            logger.warn("[RFIDService] Failed to lookup room from database", {
                rfidUid,
                error: error instanceof Error ? error.message : String(error)
            });
        }

        return null;
    }
}

export const rfidService = new RFIDService();

