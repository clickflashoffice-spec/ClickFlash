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
