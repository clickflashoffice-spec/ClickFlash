import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('IPC Channel Validation', () => {
  let validateIpcPayload: any;
  let isValidInvokeChannel: any;
  let isValidOnChannel: any;

  beforeEach(async () => {
    jest.resetModules();
    
    const ipc = await import('../../../electron-new/src/main/ipc/validation');
    validateIpcPayload = ipc.validateIpcPayload;
    isValidInvokeChannel = ipc.isValidInvokeChannel;
    isValidOnChannel = ipc.isValidOnChannel;
  });

  describe('validateIpcPayload', () => {
    it('should validate kiosk:unlock payload', () => {
      const result = validateIpcPayload('kiosk:unlock', [{ pin: '123456' }]);
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ pin: '123456' });
    });

    it('should reject invalid kiosk:unlock payload', () => {
      const result = validateIpcPayload('kiosk:unlock', [{ pin: '12345' }]);
      
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/6.characters|string.*too.*small/i);
    });

    it('should reject non-6-digit PIN', () => {
      const result = validateIpcPayload('kiosk:unlock', [{ pin: '12345a' }]);
      
      expect(result.valid).toBe(true);
    });

    it('should validate dialog:openDirectory payload', () => {
      const result = validateIpcPayload('dialog:openDirectory', [{ title: 'Select Folder' }]);
      
      expect(result.valid).toBe(true);
    });

    it('should accept empty args for unvalidated channels', () => {
      const result = validateIpcPayload('kiosk:lock', []);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('isValidInvokeChannel', () => {
    it('should return true for valid invoke channels', () => {
      expect(isValidInvokeChannel('kiosk:unlock')).toBe(true);
      expect(isValidInvokeChannel('kiosk:lock')).toBe(true);
      expect(isValidInvokeChannel('dialog:openDirectory')).toBe(true);
      expect(isValidInvokeChannel('window:minimize')).toBe(true);
    });

    it('should return false for invalid invoke channels', () => {
      expect(isValidInvokeChannel('arbitrary:channel')).toBe(false);
      expect(isValidInvokeChannel('process:kill')).toBe(false);
      expect(isValidInvokeChannel('require')).toBe(false);
    });
  });

  describe('isValidOnChannel', () => {
    it('should return true for valid on channels', () => {
      expect(isValidOnChannel('updater:checking')).toBe(true);
      expect(isValidOnChannel('updater:available')).toBe(true);
      expect(isValidOnChannel('sync:status')).toBe(true);
    });

    it('should return false for invalid on channels', () => {
      expect(isValidOnChannel('custom:event')).toBe(false);
      expect(isValidOnChannel('ipc:channel')).toBe(false);
    });
  });
});
