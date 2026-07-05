import { jest } from '@jest/globals';
import { LicenseService } from '../services/licenseService.js';

describe('LicenseService', () => {
  let service: LicenseService;

  beforeEach(() => {
    service = new LicenseService();
  });

  describe('generateLicenseKeys', () => {
    it('should generate valid CF-LIVE- keys with correct format and checksum', async () => {
      const keys = await service.generateLicenseKeys({
        deskId: 'TEST_DESK_01',
        plan: 'pro',
        maxMasters: 5,
        count: 2
      });

      expect(keys).toHaveLength(2);
      const keyStr = keys[0].key;
      expect(keyStr.startsWith('CF-LIVE-')).toBe(true);
      
      const parts = keyStr.split('-');
      expect(parts).toHaveLength(7);
      expect(parts[6]).toHaveLength(4); // Checksum segment (2 hex bytes = 4 chars)

      // Validate the generated key
      const validation = await service.validateLicenseKey(keyStr);
      expect(validation.valid).toBe(true);
    });
  });

  describe('validateLicenseKey', () => {
    it('should reject keys without CF-LIVE- prefix', async () => {
      const res = await service.validateLicenseKey('INVALID-KEY-FORMAT-1234');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Invalid key prefix');
    });

    it('should reject keys with invalid segment counts', async () => {
      const res = await service.validateLicenseKey('CF-LIVE-ABCD-EFGH-IJKL');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Invalid key format');
    });

    it('should reject keys with tampered checksums', async () => {
      const keys = await service.generateLicenseKeys({
        deskId: 'TEST_DESK_01',
        plan: 'pro',
        maxMasters: 5
      });
      const originalKey = keys[0].key;
      // Change last character of key segment before checksum
      const parts = originalKey.split('-');
      parts[2] = 'ZZZZ';
      const tamperedKey = parts.join('-');

      const res = await service.validateLicenseKey(tamperedKey);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('checksum');
    });

    it('should validate against db records when database is provided', async () => {
      const mockDb = {
        prepare: jest.fn<any>().mockReturnValue({
          bind: jest.fn<any>().mockReturnValue({
            first: jest.fn<any>().mockResolvedValue({
              key: 'CF-LIVE-AAAA-BBBB-CCCC-DDDD-1234',
              desk_id: 'DESK_01',
              plan: 'enterprise',
              max_masters: 10,
              status: 'active',
              expires_at: null
            }),
            run: jest.fn<any>().mockResolvedValue({})
          })
        })
      };

      const dbService = new LicenseService(mockDb);
      const keys = await dbService.generateLicenseKeys({ deskId: 'DESK_01', plan: 'enterprise', maxMasters: 10 });
      const validKey = keys[0].key;

      const res = await dbService.validateLicenseKey(validKey, 'DESK_01');
      expect(res.valid).toBe(true);
      expect(res.plan).toBe('enterprise');
      expect(res.maxMasters).toBe(10);
    });

    it('should reject revoked keys in db', async () => {
      const mockDb = {
        prepare: jest.fn<any>().mockReturnValue({
          bind: jest.fn<any>().mockReturnValue({
            first: jest.fn<any>().mockResolvedValue({
              key: 'CF-LIVE-AAAA-BBBB-CCCC-DDDD-1234',
              desk_id: 'DESK_01',
              plan: 'pro',
              max_masters: 5,
              status: 'revoked',
              expires_at: null
            }),
            run: jest.fn<any>().mockResolvedValue({})
          })
        })
      };

      const dbService = new LicenseService(mockDb);
      const keys = await dbService.generateLicenseKeys({ deskId: 'DESK_01', plan: 'pro', maxMasters: 5 });
      const validKey = keys[0].key;

      const res = await dbService.validateLicenseKey(validKey);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('revoked');
    });
  });
});
