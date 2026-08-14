import { describe, expect, it } from 'vitest';
import { parseKioskPassword, parseKioskPin, parsePrintOptions } from '../../ipc-validation';

describe('Touch desktop IPC validation', () => {
  it('accepts bounded kiosk credentials', () => {
    expect(parseKioskPassword('correct horse battery staple')).toBe('correct horse battery staple');
    expect(parseKioskPin('123456')).toBe('123456');
  });

  it('rejects empty, oversized, and NUL-containing credentials', () => {
    expect(() => parseKioskPassword('')).toThrow();
    expect(() => parseKioskPassword('x'.repeat(129))).toThrow();
    expect(() => parseKioskPin('12\0')).toThrow();
  });

  it('normalizes the narrow print contract', () => {
    expect(parsePrintOptions({ printer: 'DNP RX1HS' })).toEqual({
      printer: 'DNP RX1HS',
      silent: true,
    });
  });

  it('rejects arbitrary print capabilities', () => {
    expect(() => parsePrintOptions({ printer: 'DNP RX1HS', pageRanges: [{ from: 0, to: 999 }] })).toThrow();
    expect(() => parsePrintOptions({ printer: '' })).toThrow();
  });
});
