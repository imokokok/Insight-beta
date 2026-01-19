import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/server/apiResponse", () => ({
  rateLimit: vi.fn(async () => null),
  handleApi: async (
    _request: Request,
    fn: () => unknown | Promise<unknown>,
  ) => {
    return await fn();
  },
  error: (value: unknown, status?: number) => ({
    ok: false as const,
    error: value,
    status: status ?? 500,
  }),
  requireAdmin: vi.fn(async () => null),
}));

const { query, hasDatabase } = vi.hoisted(() => ({
  query: vi.fn(),
  hasDatabase: vi.fn(),
}));
vi.mock("@/server/db", () => ({
  query,
  hasDatabase,
}));

const { readJsonFile } = vi.hoisted(() => ({
  readJsonFile: vi.fn(),
}));
vi.mock("@/server/kvStore", () => ({
  readJsonFile,
}));

vi.mock("@/lib/env", () => ({
  env: {
    get INSIGHT_DISABLE_EMBEDDED_WORKER() {
      return (process.env.INSIGHT_DISABLE_EMBEDDED_WORKER ?? "").trim();
    },
  },
  getEnvReport: () => ({ ok: true, issues: [] }),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INSIGHT_DISABLE_EMBEDDED_WORKER;
  });

  it("returns liveness ok", async () => {
    const request = new Request(
      "http://localhost:3000/api/health?probe=liveness",
    );
    const res = (await GET(request)) as unknown as {
      status: string;
      probe: string;
    };
    expect(res.status).toBe("ok");
    expect(res.probe).toBe("liveness");
  });

  it("returns readiness 503 when database disconnected", async () => {
    hasDatabase.mockReturnValue(true);
    query.mockRejectedValueOnce(new Error("db_down"));
    readJsonFile.mockResolvedValueOnce({ at: new Date().toISOString() });

    const request = new Request(
      "http://localhost:3000/api/health?probe=readiness",
    );
    const res = (await GET(request)) as unknown as {
      ok: false;
      error: unknown;
      status: number;
    };
    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(res.error).toEqual({ code: "not_ready" });
  });

  it("returns readiness 503 when worker heartbeat is stale", async () => {
    hasDatabase.mockReturnValue(false);
    const staleAt = new Date(Date.now() - 5 * 60_000).toISOString();
    readJsonFile.mockResolvedValueOnce({ at: staleAt });

    const request = new Request(
      "http://localhost:3000/api/health?probe=readiness",
    );
    const res = (await GET(request)) as unknown as {
      ok: false;
      error: unknown;
      status: number;
    };
    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(res.error).toEqual({ code: "not_ready" });
  });

  it("returns readiness ok when worker is disabled", async () => {
    process.env.INSIGHT_DISABLE_EMBEDDED_WORKER = "true";
    hasDatabase.mockReturnValue(false);

    const request = new Request(
      "http://localhost:3000/api/health?probe=readiness",
    );
    const res = (await GET(request)) as unknown as {
      status: string;
      probe: string;
    };
    expect(res.status).toBe("ok");
    expect(res.probe).toBe("readiness");
  });
});
