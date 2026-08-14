import { logger } from '../utils/logger';

export class RFIDIntegrationService {
    private isListening = false;
    private buffer = '';
    private timeoutId: NodeJS.Timeout | null = null;
    private onScanCallback: ((rfidUid: string) => void) | null = null;

    // A typical RFID scan via keyboard emulation types very fast.
    // If we haven't received a character in 50ms, clear the buffer.
    private readonly BUFFER_TIMEOUT_MS = 50;

    constructor() {
        this.handleKeyPress = this.handleKeyPress.bind(this);
    }

    public startListening(onScan: (rfidUid: string) => void) {
        if (this.isListening) return;
        
        this.onScanCallback = onScan;
        this.isListening = true;
        
        // Listen globally for keydown events
        window.addEventListener('keydown', this.handleKeyPress);
        logger.info("[RFIDIntegrationService] Started listening for keyboard emulation RFID scans.");
    }

    public stopListening() {
        if (!this.isListening) return;

        window.removeEventListener('keydown', this.handleKeyPress);
        this.isListening = false;
        this.onScanCallback = null;
        logger.info("[RFIDIntegrationService] Stopped listening for RFID scans.");
    }

    private handleKeyPress(event: KeyboardEvent) {
        // If the user is typing in an input field, we don't want to capture that unless it's extremely fast.
        // Usually, RFID scanners type characters with < 10ms delay between them.
        
        // Clear buffer on timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
            this.buffer = '';
        }, this.BUFFER_TIMEOUT_MS);

        if (event.key === 'Enter') {
            if (this.buffer.length >= 8) {
                // A valid RFID code was likely scanned (usually 10 digits, checking >= 8 for safety)
                logger.info("[RFIDIntegrationService] RFID Scanned via keyboard emulation", { uid: this.buffer });
                
                if (this.onScanCallback) {
                    this.onScanCallback(this.buffer);
                }
                
                // Prevent default form submission if any
                event.preventDefault();
            }
            this.buffer = '';
        } else if (/^[0-9A-Za-z]$/.test(event.key)) {
            // Append alphanumeric characters
            this.buffer += event.key;
        }
    }
}

export const rfidIntegrationService = new RFIDIntegrationService();
