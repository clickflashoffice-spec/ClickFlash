import { describe, it, expect } from 'vitest';
import { formatBytes, formatNumber, truncate, pluralize } from '../format.js';

describe('format utils', () => {
  it('formatBytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formatNumber', () => {
    expect(formatNumber(1000000, 'en-US')).toBe('1,000,000');
  });

  it('truncate', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('pluralize', () => {
    expect(pluralize(1, 'photo', 'photos')).toBe('1 photo');
    expect(pluralize(5, 'photo', 'photos')).toBe('5 photos');
  });
});
