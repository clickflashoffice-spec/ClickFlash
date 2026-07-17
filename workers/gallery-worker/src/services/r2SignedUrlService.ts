/**
 * R2 Signed URL Service
 * 
 * Implements HMAC-based signed URLs for secure R2 photo access.
 * URLs contain: path + expires timestamp + signature
 * 
 * Signature = HMAC-SHA256(secret, path + expires)
 */

export interface SignedUrlParams {
    path: string;
    expires: number; // Unix timestamp
    signature: string;
}

export interface R2SignedUrlOptions {
    secret: string;
    defaultTtlSeconds?: number; // Default 1 hour
    signatureTtlSeconds?: number; // Max validity (default 7 days)
}

const SIGNED_URL_VERSION = 'v1';

export class R2SignedUrlService {
    private secret: string;
    private defaultTtl: number;
    private maxTtl: number;

    constructor(options: R2SignedUrlOptions) {
        this.secret = options.secret;
        this.defaultTtl = options.defaultTtlSeconds ?? 3600; // 1 hour default
        this.maxTtl = options.signatureTtlSeconds ?? 604800; // 7 days max
    }

    /**
     * Generate a signed URL for an R2 object
     */
    public async generateSignedUrl(storageKey: string, ttlSeconds?: number): Promise<string> {
        const ttl = Math.min(ttlSeconds ?? this.defaultTtl, this.maxTtl);
        const expires = Math.floor(Date.now() / 1000) + ttl;
        const path = `/${SIGNED_URL_VERSION}/${storageKey}`;
        
        const signature = await this.createSignature(path, expires);
        
        const params = new URLSearchParams({
            e: expires.toString(),
            s: signature
        });
        
        return `${path}?${params.toString()}`;
    }

    /**
     * Validate a signed URL
     */
    public async validateSignedUrl(url: string): Promise<{ valid: boolean; path?: string; error?: string }> {
        try {
            const parsedUrl = new URL(url);
            const pathname = parsedUrl.pathname;
            
            // Check version prefix
            if (!pathname.startsWith(`/${SIGNED_URL_VERSION}/`)) {
                return { valid: false, error: 'Invalid URL version' };
            }

            // Extract path (remove version prefix)
            const storageKey = pathname.slice(`/${SIGNED_URL_VERSION}/`.length);
            const expiresStr = parsedUrl.searchParams.get('e');
            const signature = parsedUrl.searchParams.get('s');

            if (!expiresStr || !signature) {
                return { valid: false, error: 'Missing signature parameters' };
            }

            const expires = parseInt(expiresStr, 10);

            // Check if expired
            const now = Math.floor(Date.now() / 1000);
            if (expires < now) {
                return { valid: false, error: 'URL expired' };
            }

            if (expires > now + this.maxTtl) {
                return { valid: false, error: 'URL expiry exceeds maximum validity' };
            }

            // Verify signature
            const expectedSignature = await this.createSignature(`/${SIGNED_URL_VERSION}/${storageKey}`, expires);
            if (!this.constantTimeCompare(signature, expectedSignature)) {
                return { valid: false, error: 'Invalid signature' };
            }

            return { valid: true, path: storageKey };
        } catch (error) {
            return { valid: false, error: 'Invalid URL format' };
        }
    }

    /**
     * Create HMAC-SHA256 signature using Web Crypto API
     */
    private async createSignature(path: string, expires: number): Promise<string> {
        const data = `${path}:${expires}`;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(this.secret);
        const messageData = encoder.encode(data);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const base64 = signatureArray.map(b => String.fromCharCode(b)).join('');
        return btoa(base64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    /**
     * Constant-time string comparison to prevent timing attacks
     */
    private constantTimeCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }

    /**
     * Parse signed URL and extract storage key (for use in Workers)
     */
    public static parseSignedUrl(url: string): SignedUrlParams | null {
        try {
            const parsedUrl = new URL(url);
            const pathname = parsedUrl.pathname;
            
            if (!pathname.startsWith(`/${SIGNED_URL_VERSION}/`)) {
                return null;
            }

            const path = pathname.slice(1); // Remove leading slash
            const expiresStr = parsedUrl.searchParams.get('e');
            const signature = parsedUrl.searchParams.get('s');

            if (!expiresStr || !signature) {
                return null;
            }

            return {
                path,
                expires: parseInt(expiresStr, 10),
                signature
            };
        } catch {
            return null;
        }
    }
}

export default R2SignedUrlService;
