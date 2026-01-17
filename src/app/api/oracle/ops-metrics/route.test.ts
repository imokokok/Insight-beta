import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { GET } from "./route";
import { rateLimit, cachedJson } from "@/server/apiResponse";
import * as observability from "@/server/observability";

vi.mock("@/server/observability", () => ({
  getOpsMetrics: vi.fn(),
}));

vi.mock("@/server/apiResponse", () => ({
  rateLimit: vi.fn(() => null),
  cachedJson: vi.fn(
    async (
      _key: string,
      _ttlMs: number,
      compute: () => unknown | Promise<unknown>,
    ) => {
      return await compute();
    },
  ),
  handleApi: async (arg1: unknown, arg2?: unknown) => {
    try {
      const fn =
        typeof arg1 === "function"
          ? (arg1 as () => unknown | Promise<unknown>)
          : (arg2 as () => unknown | Promise<unknown>);
      const data = await fn();
      return { ok: true, data };
    } catch (e: unknown) {
      if (e instanceof ZodError)
        return { ok: false, error: "invalid_request_body" };
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message };
    }
  },
}));

describe("GET /api/oracle/ops-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ops metrics", async () => {
    vi.mocked(observability.getOpsMetrics).mockResolvedValue({
      generatedAt: new Date().toISOString(),
      windowDays: 7,
      alerts: {
        open: 1,
        acknowledged: 2,
        resolved: 3,
        mttaMs: 1000,
        mttrMs: 2000,
      },
      incidents: {
        open: 0,
        mitigating: 0,
        resolved: 0,
        mttrMs: null,
      },
    } as unknown as observability.OpsMetrics);

    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: unknown };

    const request = new Request(
      "http://localhost:3000/api/oracle/ops-metrics?windowDays=7",
    );
    const response = (await GET(request)) as unknown as ApiMockResponse<{
      metrics: unknown;
    }>;

    expect(response.ok).toBe(true);
    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "ops_metrics_get",
      limit: 240,
      windowMs: 60_000,
    });
    expect(cachedJson).toHaveBeenCalledWith(
      "oracle_api:/api/oracle/ops-metrics?windowDays=7",
      5_000,
      expect.any(Function),
    );
    expect(observability.getOpsMetrics).toHaveBeenCalledWith({ windowDays: 7 });
  });
});
