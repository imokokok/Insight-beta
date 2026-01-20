import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatUsd,
  formatUsdCompact,
  calculatePercentage,
  formatDurationMinutes,
  fetchApiData,
} from "./utils";

describe("Utils", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("formatUsd formats correctly", () => {
    expect(formatUsd(1234.56, "en-US")).toBe("$1,235");
    expect(formatUsd(0, "en-US")).toBe("$0");
  });

  it("formatUsdCompact formats correctly", () => {
    expect(formatUsdCompact(1200, "en-US")).toBe("$1.2K");
    expect(formatUsdCompact(1500000, "en-US")).toBe("$1.5M");
  });

  it("calculatePercentage works correctly", () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(1, 3)).toBe(33);
    expect(calculatePercentage(0, 100)).toBe(0);
    expect(calculatePercentage(100, 0)).toBe(0);
  });

  it("formatDurationMinutes formats correctly", () => {
    expect(formatDurationMinutes(30)).toBe("30m");
    expect(formatDurationMinutes(60)).toBe("1h");
    expect(formatDurationMinutes(90)).toBe("1h 30m");
    expect(formatDurationMinutes(0)).toBe("—");
  });

  it("fetchApiData supports relative URLs in node", async () => {
    const fetchSpy = vi
      .spyOn(globalThis as unknown as { fetch: typeof fetch }, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: { value: 1 } }),
      } as unknown as Response);

    const res = await fetchApiData<{ value: number }>("/api/test");
    expect(res).toEqual({ value: 1 });
    expect(fetchSpy).toHaveBeenCalled();
    const firstArg = fetchSpy.mock.calls[0]?.[0];
    expect(firstArg).toBeInstanceOf(URL);
    expect(String(firstArg)).toBe("http://localhost:3000/api/test");

    fetchSpy.mockRestore();
  });

  it("fetchApiData requires base URL for relative URLs in production", async () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const hadWindow = Object.prototype.hasOwnProperty.call(g, "window");
    const originalWindow = (g as { window?: unknown }).window;
    try {
      (g as { window?: unknown }).window = undefined;

      vi.stubEnv("NODE_ENV", "production");

      await expect(fetchApiData("/api/test")).rejects.toMatchObject({
        code: "missing_base_url",
      });
    } finally {
      if (hadWindow) (g as { window?: unknown }).window = originalWindow;
    }
  });

  it("logger redacts URLs in messages and metadata", async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("LOG_LEVEL", "info");

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => void 0);

    const { logger } = await import("./logger");

    const token = "b1ed563a66f24a18df41688fd2e44c40";
    const url = `https://rpc.ankr.com/polygon_amoy/${token}?apiKey=secret#hash`;

    logger.info(`rpc request failed: ${url}`, {
      url,
      error: new Error(`request to ${url} failed`),
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const output = String(infoSpy.mock.calls[0]?.[0] ?? "");
    expect(output).toContain("rpc.ankr.com");
    expect(output).toContain("redacted");
    expect(output).not.toContain(token);
    expect(output).not.toContain("apiKey=secret");
    expect(output).not.toContain("#hash");

    infoSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});
