import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { rateLimit, cachedJson } from "@/server/apiResponse";
import { getUserStats } from "@/server/oracle";
import { ZodError } from "zod";

vi.mock("@/server/oracle", () => ({
  getUserStats: vi.fn(async () => ({ score: 42 })),
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
  handleApi: async (arg1: unknown, arg2?: unknown) => {
    try {
      const fn =
        typeof arg1 === "function"
          ? (arg1 as () => unknown | Promise<unknown>)
          : (arg2 as () => unknown | Promise<unknown>);
      const data = await fn();
      return { ok: true, data } as unknown as Response;
    } catch (e: unknown) {
      if (e instanceof ZodError)
        return {
          ok: false,
          error: { code: "invalid_request_body" },
        } as unknown as Response;
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message } as unknown as Response;
    }
  },
}));

describe("GET /api/oracle/stats/user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user stats for valid address and caches result", async () => {
    const addr = "0x" + "1".repeat(40);
    const request = new Request(
      `http://localhost:3000/api/oracle/stats/user?address=${addr}`
    );
    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: unknown };
    const response = (await GET(request)) as unknown as ApiMockResponse<{
      score: number;
    }>;
    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "user_stats_get",
      limit: 120,
      windowMs: 60_000,
    });
    expect(cachedJson).toHaveBeenCalledWith(
      `oracle_api:/api/oracle/stats/user?address=${addr}`,
      30_000,
      expect.any(Function)
    );
    expect(getUserStats).toHaveBeenCalledWith(addr);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.score).toBe(42);
    }
  });

  it("rejects invalid address", async () => {
    const request = new Request(
      "http://localhost:3000/api/oracle/stats/user?address=not-address"
    );
    const response = (await GET(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });
});
