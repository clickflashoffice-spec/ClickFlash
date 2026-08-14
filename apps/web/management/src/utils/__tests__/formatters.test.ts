/**
 * Unit Tests for Management Hub Formatters
 */

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage
} from '../formatters';

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1000.50)).toBe('$1,000.50');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format EUR correctly', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€100.00');
      expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-50)).toBe('-$50.00');
    });

    it('should handle undefined/null', () => {
      expect(formatCurrency(undefined as any)).toBe('$0.00');
      expect(formatCurrency(null as any)).toBe('$0.00');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-02-20');
      expect(formatDate(date)).toBe('Feb 20, 2026');
    });

    it('should handle string dates', () => {
      expect(formatDate('2026-02-20')).toBe('Feb 20, 2026');
    });

    it('should handle timestamp', () => {
      const timestamp = new Date('2026-02-20').getTime();
      expect(formatDate(timestamp)).toBe('Feb 20, 2026');
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
      expect(formatDate('')).toBe('Invalid Date');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime correctly', () => {
      const date = new Date('2026-02-20T14:30:00');
      expect(formatDateTime(date)).toMatch(/Feb.*20.*2026/);
    });
  });

  describe('formatNumber', () => {
    it('should format large numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should format decimals correctly', () => {
      expect(formatNumber(1000.50)).toBe('1,001');
      expect(formatNumber(1000.555, 2)).toBe('1,000.56'); // rounding
    });

    it('should handle undefined/null', () => {
      expect(formatNumber(undefined as any)).toBe('0');
      expect(formatNumber(null as any)).toBe('0');
    });
  });

  describe('formatPercentage', () => {
    it('should format decimal as percentage', () => {
      expect(formatPercentage(0.5)).toBe('50.00%');
      expect(formatPercentage(0.1234)).toBe('12.34%');
      expect(formatPercentage(1)).toBe('100.00%');
    });

    it('should handle values > 1', () => {
      expect(formatPercentage(1.5)).toBe('150.00%');
    });

    it('should handle negative values', () => {
      expect(formatPercentage(-0.25)).toBe('-25.00%');
    });
  });
});
