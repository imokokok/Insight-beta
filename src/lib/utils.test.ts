import { describe, it, expect, vi } from "vitest";
import { formatUsd, formatUsdCompact, calculatePercentage, formatDurationMinutes, fetchApiData } from "./utils";

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

  it("fetchApiData supports relative URLs in node", async () => {
    const fetchSpy = vi.spyOn(globalThis as unknown as { fetch: typeof fetch }, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { value: 1 } })
    } as unknown as Response);

    const res = await fetchApiData<{ value: number }>("/api/test");
    expect(res).toEqual({ value: 1 });
    expect(fetchSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
