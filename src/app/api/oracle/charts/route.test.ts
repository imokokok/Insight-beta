import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { rateLimit, cachedJson } from "@/server/apiResponse";
import { hasDatabase } from "@/server/db";
import { getMemoryStore } from "@/server/memoryBackend";

vi.mock("@/server/db", () => ({
  hasDatabase: vi.fn(() => false),
  query: vi.fn(),
}));

vi.mock("@/server/memoryBackend", () => {
  const memStore = {
    assertions: new Map<
      string,
      {
        assertedAt: string;
        market: string;
        bondUsd?: number;
      }
    >(),
  };
  return {
    getMemoryStore: vi.fn(() => memStore),
  };
});

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
  handleApi: async (
    _request: Request,
    fn: () => unknown | Promise<unknown>
  ) => {
    return await fn();
  },
}));

describe("GET /api/oracle/charts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns chart data from memory backend", async () => {
    const mem = getMemoryStore() as unknown as {
      assertions: Map<
        string,
        {
          assertedAt: string;
          market: string;
          bondUsd?: number;
        }
      >;
    };
    const base = Date.now();
    mem.assertions.set("1", {
      assertedAt: new Date(base).toISOString(),
      market: "ETH/USD",
      bondUsd: 10,
    });
    mem.assertions.set("2", {
      assertedAt: new Date(base + 24 * 60 * 60 * 1000).toISOString(),
      market: "ETH/USD",
      bondUsd: 5,
    });

    const request = new Request(
      "http://localhost:3000/api/oracle/charts?days=7"
    );
    const response = (await GET(request)) as unknown as {
      date: string;
      count: number;
      volume: number;
    }[];

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "charts_get",
      limit: 60,
      windowMs: 60_000,
    });
    expect(hasDatabase).toHaveBeenCalled();
    expect(response).toHaveLength(2);
    expect(response[0]!.count).toBe(1);
    expect(response[0]!.volume).toBe(10);
    expect(response[1]!.count).toBe(1);
    expect(response[1]!.volume).toBe(5);
    expect(cachedJson).toHaveBeenCalledWith(
      "oracle_api:/api/oracle/charts?days=7",
      30_000,
      expect.any(Function)
    );
  });
});
