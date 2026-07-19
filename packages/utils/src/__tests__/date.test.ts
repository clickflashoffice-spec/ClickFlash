import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatDateTime, formatRelativeTime, isToday, isWithinDays } from '../date.js';

describe('date utils', () => {
  describe('formatDate', () => {
    const fixedDate = new Date('2023-06-15T12:00:00Z');

    it('formats a Date object with default medium style', () => {
      const result = formatDate(fixedDate, 'medium', 'en-US');
      expect(result).toContain('Jun');
      expect(result).toContain('15');
      expect(result).toContain('2023');
    });

    it('formats with short style', () => {
      const result = formatDate(fixedDate, 'short', 'en-US');
      expect(result).toMatch(/6\/15\/23/);
    });

    it('formats with long style', () => {
      const result = formatDate(fixedDate, 'long', 'en-US');
      expect(result).toContain('June');
      expect(result).toContain('15');
      expect(result).toContain('2023');
    });

    it('accepts a string date input', () => {
      const result = formatDate('2023-06-15T12:00:00Z', 'short', 'en-US');
      expect(result).toMatch(/6\/15\/23/);
    });

    it('accepts a numeric timestamp input', () => {
      const result = formatDate(fixedDate.getTime(), 'short', 'en-US');
      expect(result).toMatch(/6\/15\/23/);
    });

    it('respects locale parameter', () => {
      const result = formatDate(fixedDate, 'long', 'de-DE');
      expect(result).toContain('Juni');
    });

    it('uses medium style by default', () => {
      const result = formatDate(fixedDate);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatDateTime', () => {
    const fixedDate = new Date('2023-06-15T14:30:00Z');

    it('includes both date and time', () => {
      const result = formatDateTime(fixedDate, 'short', 'en-US');
      // Should contain date portion
      expect(result).toContain('6/15/23');
      // Should contain time portion (varies by timezone)
      expect(result.length).toBeGreaterThan(6);
    });

    it('accepts string input', () => {
      const result = formatDateTime('2023-06-15T14:30:00Z', 'short', 'en-US');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('accepts numeric timestamp', () => {
      const result = formatDateTime(fixedDate.getTime(), 'medium', 'en-US');
      expect(result).toContain('2023');
    });

    it('respects locale', () => {
      const result = formatDateTime(fixedDate, 'long', 'fr-FR');
      expect(result).toContain('juin');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "now" or "0 seconds ago" for current time', () => {
      const result = formatRelativeTime(new Date('2023-06-15T12:00:00Z'), 'en-US');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles seconds ago', () => {
      const thirtySecsAgo = new Date('2023-06-15T11:59:30Z');
      const result = formatRelativeTime(thirtySecsAgo, 'en-US');
      expect(result).toContain('second');
    });

    it('handles minutes ago', () => {
      const fiveMinAgo = new Date('2023-06-15T11:55:00Z');
      const result = formatRelativeTime(fiveMinAgo, 'en-US');
      expect(result).toContain('minute');
    });

    it('handles hours ago', () => {
      const threeHoursAgo = new Date('2023-06-15T09:00:00Z');
      const result = formatRelativeTime(threeHoursAgo, 'en-US');
      expect(result).toContain('hour');
    });

    it('handles days ago', () => {
      const twoDaysAgo = new Date('2023-06-13T12:00:00Z');
      const result = formatRelativeTime(twoDaysAgo, 'en-US');
      expect(result).toContain('day');
    });

    it('handles months ago', () => {
      const twoMonthsAgo = new Date('2023-04-15T12:00:00Z');
      const result = formatRelativeTime(twoMonthsAgo, 'en-US');
      expect(result).toContain('month');
    });

    it('handles years ago', () => {
      const twoYearsAgo = new Date('2021-06-15T12:00:00Z');
      const result = formatRelativeTime(twoYearsAgo, 'en-US');
      expect(result).toContain('year');
    });

    it('handles future dates', () => {
      const tomorrow = new Date('2023-06-16T12:00:00Z');
      const result = formatRelativeTime(tomorrow, 'en-US');
      // Intl.RelativeTimeFormat may return 'tomorrow' or 'in 1 day' depending on the engine
      expect(result === 'tomorrow' || result.includes('day')).toBe(true);
    });

    it('accepts string input', () => {
      const result = formatRelativeTime('2023-06-14T12:00:00Z', 'en-US');
      expect(typeof result).toBe('string');
    });

    it('accepts numeric timestamp', () => {
      const ts = new Date('2023-06-14T12:00:00Z').getTime();
      const result = formatRelativeTime(ts, 'en-US');
      expect(typeof result).toBe('string');
    });
  });

  describe('isToday', () => {
    it('returns true for current date', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('returns true for today at midnight', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(isToday(today)).toBe(true);
    });

    it('returns true for today at end of day', () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      expect(isToday(today)).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('returns false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });

    it('returns false for epoch', () => {
      expect(isToday(new Date(0))).toBe(false);
    });

    it('accepts string input', () => {
      expect(isToday(new Date().toISOString())).toBe(true);
    });

    it('accepts numeric timestamp', () => {
      expect(isToday(Date.now())).toBe(true);
    });
  });

  describe('isWithinDays', () => {
    it('returns true for current date within 1 day', () => {
      expect(isWithinDays(new Date(), 1)).toBe(true);
    });

    it('returns true for date within range', () => {
      const halfDayAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      expect(isWithinDays(halfDayAgo, 1)).toBe(true);
    });

    it('returns false for date outside range', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(isWithinDays(threeDaysAgo, 1)).toBe(false);
    });

    it('handles future dates', () => {
      const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      expect(isWithinDays(inTwoDays, 3)).toBe(true);
      expect(isWithinDays(inTwoDays, 1)).toBe(false);
    });

    it('returns true for exact boundary', () => {
      const exactlyOneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      expect(isWithinDays(exactlyOneDayAgo, 1)).toBe(true);
    });

    it('handles zero days', () => {
      const now = new Date();
      expect(isWithinDays(now, 0)).toBe(true);
    });

    it('accepts string input', () => {
      expect(isWithinDays(new Date().toISOString(), 1)).toBe(true);
    });

    it('accepts numeric timestamp', () => {
      expect(isWithinDays(Date.now(), 1)).toBe(true);
    });
  });
});
