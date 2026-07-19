import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency, centsToMajor, majorToCents } from '../currency.js';

describe('currency utils', () => {
  it('formatCurrency', () => {
    expect(formatCurrency(1234.56, 'USD', 'en-US')).toBe('$1,234.56');
  });

  it('parseCurrency', () => {
    expect(parseCurrency('$1,234.56')).toBe(1234.56);
  });

  it('centsToMajor', () => {
    expect(centsToMajor(123456)).toBe(1234.56);
  });

  it('majorToCents', () => {
    expect(majorToCents(1234.56)).toBe(123456);
  });
});
