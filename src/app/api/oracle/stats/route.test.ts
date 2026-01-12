import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { rateLimit, cachedJson, requireAdmin } from "@/server/apiResponse";
import { ensureOracleSynced, getOracleStats } from "@/server/oracle";

vi.mock("@/server/oracle", () => ({
  ensureOracleSynced: vi.fn(async () => {}),
  getOracleStats: vi.fn(async () => ({ totalAssertions: 1 })),
}));

vi.mock("@/server/apiResponse", () => ({
  rateLimit: vi.fn(async () => null),
  cachedJson: vi.fn(
    async (
      _key: string,
      _ttlMs: number,
      compute: () => unknown | Promise<unknown>
    ) => {
      return await compute();
    }
  ),
  requireAdmin: vi.fn(async (_request: Request) => null),
  handleApi: async (_request: Request, fn: () => unknown | Promise<unknown>) =>
    await fn(),
}));

describe("GET /api/oracle/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached stats by default", async () => {
    const request = new Request("http://localhost:3000/api/oracle/stats");
    const response = (await GET(request)) as unknown as {
      totalAssertions: number;
    };

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "oracle_stats_get",
      limit: 120,
      windowMs: 60_000,
    });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(ensureOracleSynced).not.toHaveBeenCalled();
    expect(getOracleStats).toHaveBeenCalled();
    expect(cachedJson).toHaveBeenCalledWith(
      "oracle_api:/api/oracle/stats",
      10_000,
      expect.any(Function)
    );
    expect(response.totalAssertions).toBe(1);
  });

  it("syncs and bypasses cache when sync=1", async () => {
    const request = new Request(
      "http://localhost:3000/api/oracle/stats?sync=1"
    );
    const response = (await GET(request)) as unknown as {
      totalAssertions: number;
    };

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "oracle_stats_get",
      limit: 120,
      windowMs: 60_000,
    });
    expect(requireAdmin).toHaveBeenCalledWith(request, {
      strict: true,
      scope: "oracle_sync_trigger",
    });
    expect(ensureOracleSynced).toHaveBeenCalled();
    expect(cachedJson).not.toHaveBeenCalled();
    expect(response.totalAssertions).toBe(1);
  });
});
