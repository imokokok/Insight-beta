import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTimeAgo, formatTime, formatDurationMinutes } from '@/shared/utils/format/date';

describe('format/date', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatTimeAgo', () => {
    it('should return "just now" for recent times', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const result = formatTimeAgo(new Date('2024-01-01T11:59:30Z'));
      expect(result).toBe('just now');
    });

    it('should return correct format for minutes ago', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const result = formatTimeAgo(new Date('2024-01-01T11:50:00Z'));
      expect(result).toBe('10 minutes ago');
    });

    it('should return correct format for hours ago', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const result = formatTimeAgo(new Date('2024-01-01T10:30:00Z'));
      expect(result).toBe('1 hour ago');
    });

    it('should return correct format for days ago', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const result = formatTimeAgo(new Date('2023-12-28T12:00:00Z'));
      expect(result).toBe('4 days ago');
    });

    it('should support Chinese locale', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const result = formatTimeAgo(new Date('2023-12-28T12:00:00Z'), 'zh');
      expect(result).toBe('4 天前');
    });

    it('should handle string input', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const result = formatTimeAgo('2024-01-01T11:50:00Z');
      expect(result).toBe('10 minutes ago');
    });
  });

  describe('formatTime', () => {
    it('should format date correctly with default locale', () => {
      const result = formatTime(new Date('2024-01-01T12:30:00Z'), 'en-US');
      expect(result).toMatch(/Jan 1/);
    });

    it('should handle number input (timestamp)', () => {
      const timestamp = 1704110400000;
      const result = formatTime(timestamp, 'en-US');
      expect(result).toMatch(/Jan 1/);
    });

    it('should handle string input', () => {
      const result = formatTime('2024-01-01T12:30:00Z', 'en-US');
      expect(result).toMatch(/Jan 1/);
    });

    it('should return placeholder for null input', () => {
      const result = formatTime(null);
      expect(result).toBe('—');
    });

    it('should return placeholder for undefined input', () => {
      const result = formatTime(undefined);
      expect(result).toBe('—');
    });

    it('should return placeholder for invalid date', () => {
      const result = formatTime('invalid-date');
      expect(result).toBe('—');
    });
  });

  describe('formatDurationMinutes', () => {
    it('should format minutes only', () => {
      expect(formatDurationMinutes(45)).toBe('45m');
    });

    it('should format hours only', () => {
      expect(formatDurationMinutes(60)).toBe('1h');
      expect(formatDurationMinutes(120)).toBe('2h');
    });

    it('should format hours and minutes', () => {
      expect(formatDurationMinutes(90)).toBe('1h 30m');
      expect(formatDurationMinutes(150)).toBe('2h 30m');
    });

    it('should return placeholder for zero', () => {
      expect(formatDurationMinutes(0)).toBe('—');
    });

    it('should return placeholder for negative values', () => {
      expect(formatDurationMinutes(-1)).toBe('—');
    });

    it('should return placeholder for Infinity', () => {
      expect(formatDurationMinutes(Infinity)).toBe('—');
    });

    it('should return placeholder for NaN', () => {
      expect(formatDurationMinutes(NaN)).toBe('—');
    });
  });
});
