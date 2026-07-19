import { describe, it, expect } from 'vitest';
import { isDefined, isNonEmptyString, isPositiveNumber, isValidUrl, isValidEmail } from '../guards.js';

describe('guards utils', () => {
  it('isDefined', () => {
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
    expect(isDefined(0)).toBe(true);
  });

  it('isNonEmptyString', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('  ')).toBe(false);
    expect(isNonEmptyString('a')).toBe(true);
  });

  it('isPositiveNumber', () => {
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(1)).toBe(true);
  });

  it('isValidUrl', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('not a url')).toBe(false);
  });

  it('isValidEmail', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('not an email')).toBe(false);
  });
});
