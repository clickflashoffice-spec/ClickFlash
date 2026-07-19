import { jest } from '@jest/globals';
import { LicenseService } from '../services/licenseService.js';
import { generateEd25519KeyPair } from '@clickflash/licensing';

const MACHINE_ID = 'test-machine-id';

describe('LicenseService', () => {
  let service: LicenseService;
  let privateKey: string;
  let publicKey: string;

  beforeEach(() => {
    const pair = generateEd25519KeyPair();
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
    service = new LicenseService(undefined, privateKey, publicKey);
  });

  describe('generateLicenseKeys', () => {
    it('should generate valid CF-LIVE- keys with correct format', async () => {
      const keys = await service.generateLicenseKeys({
        deskId: 'TEST_DESK_01',
        plan: 'pro',
        maxMasters: 5,
        count: 2,
        machineId: MACHINE_ID,
      });

      expect(keys).toHaveLength(2);
      const keyStr = keys[0].key;
      expect(keyStr.startsWith('CF-LIVE-')).toBe(true);
      
      // Validate the generated key
      const validation = await service.validateLicenseKey(keyStr, 'TEST_DESK_01', MACHINE_ID);
      expect(validation.valid).toBe(true);
    });
  });

  describe('validateLicenseKey', () => {
    it('should reject keys without CF-LIVE- prefix', async () => {
      const res = await service.validateLicenseKey('INVALID-KEY-FORMAT-1234', undefined, MACHINE_ID);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Invalid license prefix');
    });

    it('should reject keys with invalid format/segments', async () => {
      const res = await service.validateLicenseKey('CF-LIVE-ABCD-EFGH-IJKL', undefined, MACHINE_ID);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Invalid key format');
    });

    it('should reject keys with tampered checksums/signatures', async () => {
      const keys = await service.generateLicenseKeys({
        deskId: 'TEST_DESK_01',
        plan: 'pro',
        maxMasters: 5,
        machineId: MACHINE_ID,
      });
      const originalKey = keys[0].key;
      const parts = originalKey.split('.');
      if (parts.length > 1) {
        parts[1] = 'TAMPEREDSIGNATURE' + parts[1].substring(17);
      } else {
        parts[0] = originalKey + 'TAMPERED';
      }
      const tamperedKey = parts.join('.');

      const res = await service.validateLicenseKey(tamperedKey, undefined, MACHINE_ID);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid signature');
    });

    it('should validate against db records when database is provided', async () => {
      const mockDb = {
        prepare: jest.fn<any>().mockReturnValue({
          bind: jest.fn<any>().mockReturnValue({
            first: jest.fn<any>().mockResolvedValue({
              key: 'CF-LIVE-AAAA.BBBB',
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

      const dbService = new LicenseService(mockDb, privateKey, publicKey);
      const keys = await dbService.generateLicenseKeys({ deskId: 'DESK_01', plan: 'enterprise', maxMasters: 10, machineId: MACHINE_ID });
      const validKey = keys[0].key;

      const res = await dbService.validateLicenseKey(validKey, 'DESK_01', MACHINE_ID);
      expect(res.valid).toBe(true);
      expect(res.plan).toBe('enterprise');
      expect(res.maxMasters).toBe(10);
    });

    it('should reject revoked keys in db', async () => {
      const mockDb = {
        prepare: jest.fn<any>().mockReturnValue({
          bind: jest.fn<any>().mockReturnValue({
            first: jest.fn<any>().mockResolvedValue({
              key: 'CF-LIVE-AAAA.BBBB',
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

      const dbService = new LicenseService(mockDb, privateKey, publicKey);
      const keys = await dbService.generateLicenseKeys({ deskId: 'DESK_01', plan: 'pro', maxMasters: 5, machineId: MACHINE_ID });
      const validKey = keys[0].key;

      const res = await dbService.validateLicenseKey(validKey, 'DESK_01', MACHINE_ID);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('revoked');
    });
  });
});
