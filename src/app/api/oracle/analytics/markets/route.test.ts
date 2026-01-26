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
    instances: new Map<
      string,
      {
        assertions: Map<
          string,
          {
            assertedAt: string;
            market: string;
            bondUsd?: number;
          }
        >;
      }
    >(),
  };
  memStore.instances.set("default", { assertions: new Map() });
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
      compute: () => unknown | Promise<unknown>,
    ) => {
      return await compute();
    },
  ),
  handleApi: async (
    _request: Request,
    fn: () => unknown | Promise<unknown>,
  ) => {
    return await fn();
  },
}));

describe("GET /api/oracle/analytics/markets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns market stats from memory backend", async () => {
    const mem = getMemoryStore() as unknown as {
      instances: Map<
        string,
        {
          assertions: Map<
            string,
            {
              assertedAt: string;
              market: string;
              bondUsd?: number;
            }
          >;
        }
      >;
    };
    const inst = mem.instances.get("default")!;
    const now = Date.now();
    inst.assertions.set("1", {
      assertedAt: new Date(now).toISOString(),
      market: "ETH/USD",
      bondUsd: 10,
    });
    inst.assertions.set("2", {
      assertedAt: new Date(now).toISOString(),
      market: "ETH/USD",
      bondUsd: 5,
    });

    const request = new Request(
      "http://localhost:3000/api/oracle/analytics/markets?days=7&limit=5",
    );
    const response = (await GET(request)) as unknown as {
      market: string;
      count: number;
      volume: number;
    }[];

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "markets_analytics",
      limit: 60,
      windowMs: 60_000,
    });
    expect(hasDatabase).toHaveBeenCalled();
    expect(response).toHaveLength(1);
    const firstResult = response[0];
    expect(firstResult?.market).toBe("ETH/USD");
    expect(firstResult?.count).toBe(2);
    expect(firstResult?.volume).toBe(15);
    expect(cachedJson).toHaveBeenCalledWith(
      "oracle_api:/api/oracle/analytics/markets?days=7&limit=5",
      60_000,
      expect.any(Function),
    );
  });
});
