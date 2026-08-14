/**
 * Pairing Types
 * 
 * Shared types for secure kiosk pairing with QR codes.
 * Used by both Master Portal and Touch Kiosk applications.
 */

export interface PairingData {
    version: string;
    httpUrl: string;
    wsUrl: string;
    kioskId?: string;
    kioskName?: string;
    pairingToken: string;
    expiresAt: string;
    mode: 'touch';
    pair: boolean;
    /** Auto-generated upload folder path on Master for this kiosk */
    uploadFolderPath?: string;
    /** Auto-generated orders folder path on Master for this kiosk */
    ordersFolderPath?: string;
    /** Master's data directory root (for relative path resolution) */
    masterDataRoot?: string;
}

export interface PairingValidationRequest {
    kioskId: string;
    pairingToken: string;
    timestamp: string;
}

export interface PairingValidationResponse {
    valid: boolean;
    message: string;
    kioskInfo?: {
        id: string;
        name: string;
        httpUrl: string;
        wsUrl: string;
    };
}

export interface PairingToken {
    token: string;
    kioskId?: string;
    createdAt: string;
    expiresAt: string;
    used: boolean;
}
