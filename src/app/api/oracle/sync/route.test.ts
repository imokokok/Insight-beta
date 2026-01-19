import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";
import {
  rateLimit,
  getAdminActor,
  invalidateCachedJson,
  requireAdmin,
} from "@/server/apiResponse";
import { revalidateTag } from "next/cache";
import {
  ensureOracleSynced,
  getOracleEnv,
  isTableEmpty,
  readOracleState,
} from "@/server/oracle";
import { appendAuditLog } from "@/server/observability";

vi.mock("@/server/oracle", () => ({
  ensureOracleSynced: vi.fn(async () => ({ updated: true })),
  getOracleEnv: vi.fn(async () => ({
    rpcUrl: "https://rpc.example",
    contractAddress: "0xabc",
  })),
  isTableEmpty: vi.fn(async () => false),
  readOracleState: vi.fn(async () => ({
    chain: "mainnet",
    contractAddress: "0xabc",
    lastProcessedBlock: BigInt(100),
    assertions: { a: {}, b: {} },
    disputes: { c: {} },
    sync: { mode: "realtime" },
  })),
}));

vi.mock("@/server/apiResponse", () => ({
  rateLimit: vi.fn(async () => false),
  requireAdmin: vi.fn(async () => null),
  getAdminActor: vi.fn(() => "test-actor"),
  invalidateCachedJson: vi.fn(async () => {}),
  handleApi: async (
    _request: Request,
    fn: () => unknown | Promise<unknown>,
  ) => {
    return fn();
  },
  success: (value: unknown) => ({ ok: true, value }),
  error: (value: unknown) => ({ ok: false, error: value }),
}));

vi.mock("@/server/observability", () => ({
  appendAuditLog: vi.fn(async () => {}),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(() => {}),
}));

describe("GET /api/oracle/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns sync state", async () => {
    const request = new Request("http://localhost:3000/api/oracle/sync");
    const response = (await GET(request)) as unknown as {
      chain: string;
      contractAddress: string;
      mode: string;
      lastProcessedBlock: string;
      assertions: number;
      disputes: number;
      sync: unknown;
    };

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "oracle_sync_get",
      limit: 240,
      windowMs: 60_000,
    });
    expect(readOracleState).toHaveBeenCalled();
    expect(isTableEmpty).toHaveBeenCalledWith("assertions");
    expect(response.chain).toBe("mainnet");
    expect(response.contractAddress).toBe("0xabc");
    expect(response.mode).toBe("real");
    expect(response.lastProcessedBlock).toBe("100");
    expect(response.assertions).toBe(2);
    expect(response.disputes).toBe(1);
  });
});

describe("POST /api/oracle/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("triggers sync when authorized and revalidates caches and tags", async () => {
    const request = new Request("http://localhost:3000/api/oracle/sync", {
      method: "POST",
    });
    const response = (await POST(request)) as unknown as {
      updated: boolean;
      chain: string;
      contractAddress: string;
      mode: string;
      lastProcessedBlock: string;
      assertions: number;
      disputes: number;
      sync: unknown;
    };

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "oracle_sync_post",
      limit: 10,
      windowMs: 60_000,
    });
    expect(requireAdmin).toHaveBeenCalledWith(request, {
      strict: true,
      scope: "oracle_sync_trigger",
    });
    expect(getOracleEnv).toHaveBeenCalled();
    expect(ensureOracleSynced).toHaveBeenCalled();
    expect(readOracleState).toHaveBeenCalled();
    expect(getAdminActor).toHaveBeenCalledWith(request);
    expect(appendAuditLog).toHaveBeenCalledWith({
      actor: "test-actor",
      action: "oracle_sync_triggered",
      entityType: "oracle",
      entityId: "0xabc",
      details: {
        updated: true,
        lastProcessedBlock: "100",
      },
    });
    expect(revalidateTag).toHaveBeenCalledWith("oracle-stats");
    expect(revalidateTag).toHaveBeenCalledWith("oracle-leaderboard");
    expect(revalidateTag).toHaveBeenCalledWith("user-stats");
    expect(invalidateCachedJson).toHaveBeenCalledWith("oracle_api:/api/oracle");

    expect(response.updated).toBe(true);
    expect(response.chain).toBe("mainnet");
    expect(response.contractAddress).toBe("0xabc");
    expect(response.mode).toBe("real");
    expect(response.lastProcessedBlock).toBe("100");
  });

  it("triggers sync with cron secret and skips admin auth", async () => {
    vi.stubEnv("INSIGHT_CRON_SECRET", "test-cron-secret-123456");
    const request = new Request("http://localhost:3000/api/oracle/sync", {
      method: "POST",
      headers: { "x-insight-cron-secret": "test-cron-secret-123456" },
    });
    const response = (await POST(request)) as unknown as {
      updated: boolean;
    };

    expect(requireAdmin).not.toHaveBeenCalled();
    expect(ensureOracleSynced).toHaveBeenCalled();
    expect(response.updated).toBe(true);
  });

  it("triggers sync with Authorization Bearer cron secret and skips admin auth", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret-123456");
    const request = new Request("http://localhost:3000/api/oracle/sync", {
      method: "POST",
      headers: { Authorization: "Bearer test-cron-secret-123456" },
    });
    const response = (await POST(request)) as unknown as {
      updated: boolean;
    };

    expect(requireAdmin).not.toHaveBeenCalled();
    expect(ensureOracleSynced).toHaveBeenCalled();
    expect(response.updated).toBe(true);
  });

  it("returns error when missing config", async () => {
    const getEnvMock = getOracleEnv as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    getEnvMock.mockResolvedValueOnce({
      rpcUrl: "",
      contractAddress: "",
    });
    const request = new Request("http://localhost:3000/api/oracle/sync", {
      method: "POST",
    });
    const response = (await POST(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "missing_config" });
  });

  it("maps sync errors to status codes", async () => {
    const ensureMock = ensureOracleSynced as unknown as {
      mockImplementationOnce(fn: () => unknown): void;
    };
    ensureMock.mockImplementationOnce(() => {
      throw new Error("rpc_unreachable");
    });
    const badReq1 = new Request("http://localhost:3000/api/oracle/sync", {
      method: "POST",
    });
    const resp1 = (await POST(badReq1)) as { ok: boolean; error?: unknown };
    expect(resp1.ok).toBe(false);
    expect(resp1.error).toEqual({ code: "rpc_unreachable" });

    ensureMock.mockImplementationOnce(() => {
      throw new Error("contract_not_found");
    });
    const badReq2 = new Request("http://localhost:3000/api/oracle/sync", {
      method: "POST",
    });
    const resp2 = (await POST(badReq2)) as { ok: boolean; error?: unknown };
    expect(resp2.ok).toBe(false);
    expect(resp2.error).toEqual({ code: "contract_not_found" });

    ensureMock.mockImplementationOnce(() => {
      throw new Error("sync_failed");
    });
    const badReq3 = new Request("http://localhost:3000/api/oracle/sync", {
      method: "POST",
    });
    const resp3 = (await POST(badReq3)) as { ok: boolean; error?: unknown };
    expect(resp3.ok).toBe(false);
    expect(resp3.error).toEqual({ code: "sync_failed" });
  });

  it("returns rate limited when POST is over limit", async () => {
    const request = new Request("http://localhost:3000/api/oracle/sync", {
      method: "POST",
    });
    const mockedRateLimit = rateLimit as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    mockedRateLimit.mockResolvedValueOnce({
      ok: false,
      error: { code: "rate_limited" },
    });
    const response = (await POST(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "rate_limited" });
  });

  it("returns error when not authorized", async () => {
    const requireAdminMock = requireAdmin as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "forbidden" },
    });
    const request = new Request("http://localhost:3000/api/oracle/sync", {
      method: "POST",
    });
    const response = (await POST(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "forbidden" });
    expect(ensureOracleSynced).not.toHaveBeenCalled();
  });
});
