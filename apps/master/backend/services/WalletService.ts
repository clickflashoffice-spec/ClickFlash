import { PKPass } from 'passkit-generator';
import fs from 'fs-extra';
// import path from 'path';
import { logger } from '../utils/logger';
// import { randomUUID } from 'crypto';

export interface WalletPassParams {
    albumId: string;
    clientName: string;
    token: string;
    galleryUrl: string;
    primaryPhotoUrl?: string;
    date: string;
}

export class WalletService {
    private readonly certPath: string;
    private readonly keyPath: string;
    private readonly wwdrPath: string;
    private readonly passTypeIdentifier: string;
    private readonly teamIdentifier: string;
    
    private isConfigured: boolean = false;

    constructor() {
        this.certPath = process.env.APPLE_WALLET_CERT || '';
        this.keyPath = process.env.APPLE_WALLET_KEY || '';
        this.wwdrPath = process.env.APPLE_WWDR_CERT || '';
        this.passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID || 'pass.com.clickflash.gallery';
        this.teamIdentifier = process.env.APPLE_TEAM_ID || '';

        this.checkConfiguration();
    }

    private checkConfiguration() {
        if (!this.certPath || !this.keyPath || !this.wwdrPath || !this.teamIdentifier) {
            logger.warn('[WalletService] Apple Wallet is not fully configured. Will generate mock passes.');
            this.isConfigured = false;
            return;
        }

        if (!fs.existsSync(this.certPath) || !fs.existsSync(this.keyPath) || !fs.existsSync(this.wwdrPath)) {
            logger.error('[WalletService] Apple Wallet certificate files are missing.');
            this.isConfigured = false;
            return;
        }

        this.isConfigured = true;
    }

    /**
     * Generate a .pkpass file for an album gallery
     * Returns the raw Buffer of the generated pass.
     */
    public async generateGalleryPass(params: WalletPassParams): Promise<Buffer> {
        try {
            if (!this.isConfigured) {
                logger.info(`[WalletService] Mock generation for album ${params.albumId}`);
                // Return a mock dummy buffer for testing since real certs are missing
                return Buffer.from('MOCK_PASS_DATA');
            }

            // Real generation logic using passkit-generator
            // @ts-ignore
            const pass = new PKPass(
                ({
                    "passTypeIdentifier": this.passTypeIdentifier,
                    "teamIdentifier": this.teamIdentifier,
                    "organizationName": "ClickFlash",
                    "description": "ClickFlash Gallery Access Pass",
                    "logoText": "ClickFlash",
                    "foregroundColor": "rgb(255, 255, 255)",
                    "backgroundColor": "rgb(15, 23, 42)", // Slate-900 equivalent
                    "labelColor": "rgb(148, 163, 184)",
                    "eventTicket": {
                        "primaryFields": [
                            {
                                "key": "album",
                                "label": "GALLERY",
                                "value": params.clientName || 'Your Photos'
                            }
                        ],
                        "secondaryFields": [
                            {
                                "key": "date",
                                "label": "DATE",
                                "value": params.date
                            }
                        ],
                        "auxiliaryFields": [
                            {
                                "key": "access",
                                "label": "TOKEN",
                                "value": params.token.substring(0, 8)
                            }
                        ]
                    },
                    "barcode": {
                        "message": params.galleryUrl,
                        "format": "PKBarcodeFormatQR",
                        "messageEncoding": "iso-8859-1",
                        "altText": params.token
                    }
                } as any),
                {
                    cert: fs.readFileSync(this.certPath),
                    key: fs.readFileSync(this.keyPath),
                    wwdr: fs.readFileSync(this.wwdrPath),
                } as any
            );

            // Add assets if available
            // Note: in a real implementation, you would add logo.png, icon.png from local paths
            // pass.addBuffer('logo.png', logoBuffer);

            return pass.getAsBuffer();
        } catch (error: any) {
            logger.error(`[WalletService] Failed to generate pass: ${error.message}`);
            throw error;
        }
    }
}

export const walletService = new WalletService();
