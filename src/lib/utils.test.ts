import { describe, it, expect } from 'vitest';
import { formatUsd, formatUsdCompact, calculatePercentage, formatDurationMinutes } from './utils';

describe('Utils', () => {
  it('formatUsd formats correctly', () => {
    expect(formatUsd(1234.56, 'en-US')).toBe('$1,235');
    expect(formatUsd(0, 'en-US')).toBe('$0');
  });

  it('formatUsdCompact formats correctly', () => {
    expect(formatUsdCompact(1200, 'en-US')).toBe('$1.2K');
    expect(formatUsdCompact(1500000, 'en-US')).toBe('$1.5M');
  });

  it('calculatePercentage works correctly', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(1, 3)).toBe(33);
    expect(calculatePercentage(0, 100)).toBe(0);
    expect(calculatePercentage(100, 0)).toBe(0);
  });

  it('formatDurationMinutes formats correctly', () => {
    expect(formatDurationMinutes(30)).toBe('30m');
    expect(formatDurationMinutes(60)).toBe('1h');
    expect(formatDurationMinutes(90)).toBe('1h 30m');
    expect(formatDurationMinutes(0)).toBe('—');
  });
});
