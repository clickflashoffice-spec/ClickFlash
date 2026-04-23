/**
 * Unit Tests for Touch Kiosk Validation Utilities
 */

import {
  validateAccessCode,
  validateEmail,
  validateOrderCode,
  sanitizeInput,
  isValidImageFile,
  validatePassword,
  validateKioskId
} from '../validation';

describe('Validation Utilities', () => {
  describe('validateAccessCode', () => {
    it('should accept valid access codes', () => {
      expect(validateAccessCode('ABC123')).toBe(true);
      expect(validateAccessCode('wedding-2026')).toBe(true);
      expect(validateAccessCode('SUMMER_99')).toBe(true);
      expect(validateAccessCode('a-b_c')).toBe(true);
    });

    it('should reject invalid access codes', () => {
      expect(validateAccessCode('')).toBe(false);
      expect(validateAccessCode('ab')).toBe(false); // Too short
      expect(validateAccessCode('special@char')).toBe(false); // Invalid char
      expect(validateAccessCode('code with spaces')).toBe(false);
      expect(validateAccessCode('a'.repeat(51))).toBe(false); // Too long
      expect(validateAccessCode(null as any)).toBe(false);
      expect(validateAccessCode(undefined as any)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
      expect(validateEmail('name+tag@example.org')).toBe(true);
      expect(validateEmail('user123@test.io')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
      expect(validateEmail('user@@example.com')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
    });
  });

  describe('validateOrderCode', () => {
    it('should accept valid order codes', () => {
      expect(validateOrderCode('ORD-123456')).toBe(true);
      expect(validateOrderCode('CF-2026-001')).toBe(true);
      expect(validateOrderCode('12345678')).toBe(true);
      expect(validateOrderCode('ABC123XYZ')).toBe(true);
    });

    it('should reject invalid order codes', () => {
      expect(validateOrderCode('')).toBe(false);
      expect(validateOrderCode('ORD')).toBe(false); // Too short
      expect(validateOrderCode('ORD@123')).toBe(false); // Invalid char
      expect(validateOrderCode('code with spaces')).toBe(false);
      expect(validateOrderCode('a'.repeat(21))).toBe(false); // Too long
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert(1)</script>')).toBe('alert(1)');
      expect(sanitizeInput('<p>Hello</p>')).toBe('Hello');
      expect(sanitizeInput('<div>Test <span>nested</span></div>')).toBe('Test nested');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('\t\nhello\r\n')).toBe('hello');
      expect(sanitizeInput('   multiple   spaces   ')).toBe('multiple   spaces');
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(123 as any)).toBe('');
      expect(sanitizeInput({} as any)).toBe('');
      expect(sanitizeInput([] as any)).toBe('');
    });
  });

  describe('isValidImageFile', () => {
    it('should accept valid image types', () => {
      expect(isValidImageFile('photo.jpg')).toBe(true);
      expect(isValidImageFile('photo.jpeg')).toBe(true);
      expect(isValidImageFile('photo.png')).toBe(true);
      expect(isValidImageFile('photo.webp')).toBe(true);
      expect(isValidImageFile('photo.heic')).toBe(true);
    });

    it('should reject non-image files', () => {
      expect(isValidImageFile('document.pdf')).toBe(false);
      expect(isValidImageFile('script.exe')).toBe(false);
      expect(isValidImageFile('archive.zip')).toBe(false);
      expect(isValidImageFile('video.mp4')).toBe(false);
      expect(isValidImageFile('data.txt')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isValidImageFile('photo.JPG')).toBe(true);
      expect(isValidImageFile('photo.PNG')).toBe(true);
      expect(isValidImageFile('photo.Jpeg')).toBe(true);
    });

    it('should handle invalid input', () => {
      expect(isValidImageFile('')).toBe(false);
      expect(isValidImageFile(null as any)).toBe(false);
      expect(isValidImageFile(undefined as any)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Short1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should require uppercase', () => {
      const result = validatePassword('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain an uppercase letter');
    });

    it('should require lowercase', () => {
      const result = validatePassword('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain a lowercase letter');
    });

    it('should require numbers', () => {
      const result = validatePassword('NoNumbersHere');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain a number');
    });

    it('should report multiple errors', () => {
      const result = validatePassword('abc');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateKioskId', () => {
    it('should accept valid kiosk IDs', () => {
      expect(validateKioskId('CF-KIOSK01')).toBe(true);
      expect(validateKioskId('cf-reception')).toBe(true); // Case insensitive
      expect(validateKioskId('CF-1234')).toBe(true);
    });

    it('should reject invalid kiosk IDs', () => {
      expect(validateKioskId('')).toBe(false);
      expect(validateKioskId('KIOSK01')).toBe(false); // Missing CF- prefix
      expect(validateKioskId('CF-')).toBe(false); // Too short
      expect(validateKioskId('CF-kiosk@01')).toBe(false); // Invalid char
      expect(validateKioskId('cf-kiosk with spaces')).toBe(false);
    });
  });
});
