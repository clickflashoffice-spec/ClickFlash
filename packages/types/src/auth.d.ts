export interface MagicLinkToken {
    /** Uniquely identifies this token issuance to allow revocation */
    jti: string;
    /** The target guest/user ID */
    guestId: string;
    /** The specific album this link provides access to */
    albumId: string;
    /** The destination/resort ID for tenant scoping */
    destinationId: string;
    /** Order ID if this link is tied to a specific purchase */
    orderId?: string;
    /** Issued at timestamp (Unix epoch in seconds) */
    iat: number;
    /** Expiration timestamp (Unix epoch in seconds) */
    exp: number;
    /** Bundled digital receipt data */
    receiptData?: any;
}
export interface GenerateMagicLinkRequest {
    guestId: string;
    albumId: string;
    destinationId: string;
    /** Optional phone number override, otherwise uses guest profile */
    phoneNumber?: string;
    /** Optional order ID to tie the link to a specific purchase */
    orderId?: string;
    /** Desired expiration in seconds from now, defaults to 72 hours (259200) */
    expiresInSeconds?: number;
    /** Bundled digital receipt data */
    receiptData?: any;
}
export interface GenerateMagicLinkResponse {
    success: boolean;
    magicLinkUrl?: string;
    expiresAt?: string;
    error?: string;
}
export interface WhatsappDispatchMagicLinkEvent {
    eventId: string;
    type: 'whatsapp:dispatch:magiclink';
    timestamp: string;
    payload: {
        guestId: string;
        albumId: string;
        phoneNumber: string;
        magicLinkUrl: string;
        destinationId: string;
        orderId?: string;
        /** Language preference for the WhatsApp template (e.g., 'en', 'es') */
        language?: string;
    };
}
