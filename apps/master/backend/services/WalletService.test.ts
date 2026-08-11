import { createWalletBarcodes, type WalletPassParams } from './WalletService';

describe('createWalletBarcodes', () => {
    it('emits QR, PDF417, and Aztec entries using UTF-8', () => {
        const params: WalletPassParams = {
            albumId: 'album-1',
            clientName: 'Guest',
            token: 'token-123',
            galleryUrl: 'https://gallery.clickflash.com/albums/album-1',
            date: '2026-08-11'
        };

        expect(createWalletBarcodes(params)).toEqual([
            {
                message: params.galleryUrl,
                messageEncoding: 'utf-8',
                altText: params.token,
                format: 'PKBarcodeFormatQR'
            },
            {
                message: params.galleryUrl,
                messageEncoding: 'utf-8',
                altText: params.token,
                format: 'PKBarcodeFormatPDF417'
            },
            {
                message: params.galleryUrl,
                messageEncoding: 'utf-8',
                altText: params.token,
                format: 'PKBarcodeFormatAztec'
            }
        ]);
    });
});
