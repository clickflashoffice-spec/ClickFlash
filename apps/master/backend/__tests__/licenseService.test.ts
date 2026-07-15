import { LicenseService } from '../services/license-service';
import crypto from 'crypto';

describe('LicenseService (Master OS)', () => {
    let mockDb: any;
    let mockLogger: any;
    let licenseService: LicenseService;
    const SECRET_SALT = "clickflash-secret-salt-2026";

    // Generate a valid key for testing
    function generateValidKey(baseFormat = "CF-LIVE-1234-5678-9012-3456"): string {
        const dataToHash = baseFormat + SECRET_SALT;
        const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
        const checksum = hash.substring(0, 4).toUpperCase();
        return `${baseFormat}-${checksum}`;
    }

    const validKey = generateValidKey();

    beforeEach(() => {
        mockDb = {
            get: jest.fn(),
            run: jest.fn()
        };
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
        
        global.fetch = jest.fn() as any;
        licenseService = new LicenseService(mockDb, mockLogger, 'http://hub.local');
    });

    describe('setLicenseKey', () => {
        it('should reject invalid checksum format', async () => {
            const success = await licenseService.setLicenseKey('CF-LIVE-1234-5678-9012-3456-BADX');
            expect(success).toBe(false);
            expect(mockDb.run).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid checksum'));
        });

        it('should accept and store valid checksum key', async () => {
            const success = await licenseService.setLicenseKey(validKey);
            expect(success).toBe(true);
            expect(mockDb.run).toHaveBeenCalledTimes(3); // license_key, license_last_checked, license_status
        });
    });

    describe('getLocalLicenseStatus', () => {
        it('should return unlicensed when no key is found', async () => {
            mockDb.get.mockReturnValue(null);
            
            const status = await licenseService.getLocalLicenseStatus();
            expect(status.isValid).toBe(false);
            expect(status.status).toBe('unlicensed');
        });

        it('should return invalid when checksum is bad', async () => {
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes('license_key')) return { value: JSON.stringify('CF-LIVE-1234-5678-9012-3456-BADX') };
                return null;
            });
            
            const status = await licenseService.getLocalLicenseStatus();
            expect(status.isValid).toBe(false);
            expect(status.status).toBe('invalid');
        });

        it('should start grace period when key exists but never checked', async () => {
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes('license_key')) return { value: JSON.stringify(validKey) };
                if (query.includes('license_status')) return { value: JSON.stringify('active') };
                return null;
            });
            
            const status = await licenseService.getLocalLicenseStatus();
            expect(status.isValid).toBe(true);
            expect(status.status).toBe('active');
            expect(status.lastChecked).not.toBeNull();
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO settings'),
                expect.arrayContaining(['license_last_checked'])
            );
        });

        it('should return expired if timeSinceLastCheck > 7 days', async () => {
            const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
            
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes('license_key')) return { value: JSON.stringify(validKey) };
                if (query.includes('license_last_checked')) return { value: JSON.stringify(eightDaysAgo) };
                if (query.includes('license_status')) return { value: JSON.stringify('active') };
                return null;
            });
            
            const status = await licenseService.getLocalLicenseStatus();
            expect(status.isValid).toBe(false);
            expect(status.status).toBe('expired');
        });

        it('should return grace_period if approaching expiration (> 80% of 7 days)', async () => {
            const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);
            
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes('license_key')) return { value: JSON.stringify(validKey) };
                if (query.includes('license_last_checked')) return { value: JSON.stringify(sixDaysAgo) };
                if (query.includes('license_status')) return { value: JSON.stringify('active') };
                return null;
            });
            
            const status = await licenseService.getLocalLicenseStatus();
            expect(status.isValid).toBe(true);
            expect(status.status).toBe('grace_period');
        });

        it('should return invalid if explicitly marked invalid by hub', async () => {
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes('license_key')) return { value: JSON.stringify(validKey) };
                if (query.includes('license_last_checked')) return { value: JSON.stringify(Date.now() - 1000) };
                if (query.includes('license_status')) return { value: JSON.stringify('invalid') };
                return null;
            });
            
            const status = await licenseService.getLocalLicenseStatus();
            expect(status.isValid).toBe(false);
            expect(status.status).toBe('invalid');
        });
    });

    describe('verifyWithHub', () => {
        beforeEach(() => {
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes('license_key')) return { value: JSON.stringify(validKey) };
                if (query.includes('license_last_checked')) return { value: JSON.stringify(Date.now() - 1000) };
                if (query.includes('license_status')) return { value: JSON.stringify('active') };
                return null;
            });
        });

        it('should update lastChecked on successful hub verification', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ valid: true })
            });

            const isValid = await licenseService.verifyWithHub('test-station-1');
            expect(isValid).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith('http://hub.local/api/license/validate', expect.any(Object));
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO settings'),
                expect.arrayContaining(['license_last_checked', expect.any(String)])
            );
        });

        it('should mark invalid if hub rejects', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ valid: false, reason: 'REVOKED' })
            });

            const isValid = await licenseService.verifyWithHub('test-station-1');
            expect(isValid).toBe(false);
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO settings'),
                expect.arrayContaining(['license_status', JSON.stringify('invalid')])
            );
        });

        it('should fallback to local status if network fails', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const isValid = await licenseService.verifyWithHub('test-station-1');
            // Since it was checked 1000ms ago, it's still valid locally
            expect(isValid).toBe(true);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error checking license'), expect.any(Object));
        });
    });
});
