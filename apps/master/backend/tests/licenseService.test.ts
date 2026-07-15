import { LicenseService } from '../services/license-service';

jest.mock('@clickflash/licensing', () => ({
    verifyEd25519License: jest.fn((key: string) => {
        if (key.includes('dummySignatureHash')) {
            return { valid: true };
        }
        return { valid: false };
    })
}));

jest.mock('systeminformation', () => ({
    uuid: jest.fn().mockResolvedValue({ os: 'test-machine-id', hardware: 'test-machine-id' })
}));

describe('LicenseService verifyChecksum', () => {
    let service: any;

    beforeEach(() => {
        service = new LicenseService({} as any, { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any, 'http://localhost');
    });

    it('should validate modern Ed25519 asymmetric format (CF-LIVE-payloadB64.signatureB64)', async () => {
        const payload = Buffer.from(JSON.stringify({ plan: 'ENTERPRISE', expiresAt: Date.now() + 100000 })).toString('base64');
        const key = `CF-LIVE-${payload}.dummySignatureHash123456789`;
        expect(await service.verifyChecksum(key)).toBe(true);
    });

    it('should reject invalid prefix', async () => {
        expect(await service.verifyChecksum('INVALID-KEY-123')).toBe(false);
    });
});
