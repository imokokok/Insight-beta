import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";
import {
  rateLimit,
  getAdminActor,
  invalidateCachedJson,
} from "@/server/apiResponse";
import { requireAdmin } from "@/server/apiResponse";
import { verifyAdmin } from "@/server/adminAuth";
import {
  readOracleConfig,
  writeOracleConfig,
  validateOracleConfigPatch,
  redactOracleConfig,
  type OracleConfig,
} from "@/server/oracle";
import { appendAuditLog } from "@/server/observability";

vi.mock("@/server/oracle", () => {
  const config: OracleConfig = {
    rpcUrl: "https://rpc.example",
    contractAddress: "0xabc",
    chain: "Local",
    startBlock: 0,
    maxBlockRange: 10000,
    votingPeriodHours: 72,
    confirmationBlocks: 12,
  };
  return {
    readOracleConfig: vi.fn(async () => config),
    writeOracleConfig: vi.fn(async () => config),
    validateOracleConfigPatch: vi.fn((next: Partial<OracleConfig>) => next),
    redactOracleConfig: vi.fn(() => ({
      ...config,
      rpcUrl: "",
    })),
  };
});

vi.mock("@/server/observability", () => ({
  appendAuditLog: vi.fn(async () => {}),
}));

vi.mock("@/server/apiResponse", () => ({
  rateLimit: vi.fn(async () => null),
  requireAdmin: vi.fn(async () => null),
  getAdminActor: vi.fn(() => "test-actor"),
  invalidateCachedJson: vi.fn(async () => {}),
  handleApi: async (
    _request: Request,
    fn: () => unknown | Promise<unknown>
  ) => {
    return await fn();
  },
  error: (value: unknown) => ({ ok: false, error: value }),
}));

vi.mock("@/server/adminAuth", () => ({
  verifyAdmin: vi.fn(async () => ({ ok: false })),
}));

describe("GET /api/oracle/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full config for admin", async () => {
    const verifyAdminMock = vi.mocked(verifyAdmin);
    verifyAdminMock.mockResolvedValueOnce({
      ok: true,
      role: "root",
      tokenId: "test",
    });

    const request = new Request("http://localhost:3000/api/oracle/config");
    const response = (await GET(request)) as unknown as OracleConfig;

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "oracle_config_get",
      limit: 240,
      windowMs: 60_000,
    });
    expect(verifyAdmin).toHaveBeenCalledWith(request, {
      strict: false,
      scope: "oracle_config_write",
    });
    expect(readOracleConfig).toHaveBeenCalled();
    expect(response.rpcUrl).toBe("https://rpc.example");
  });

  it("returns redacted config for non-admin", async () => {
    const request = new Request("http://localhost:3000/api/oracle/config");
    const response = (await GET(request)) as unknown as OracleConfig;

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "oracle_config_get",
      limit: 240,
      windowMs: 60_000,
    });
    expect(verifyAdmin).toHaveBeenCalledWith(request, {
      strict: false,
      scope: "oracle_config_write",
    });
    expect(redactOracleConfig).toHaveBeenCalled();
    expect(response.rpcUrl).toBe("");
  });

  it("returns rate limited when GET is over limit", async () => {
    const request = new Request("http://localhost:3000/api/oracle/config");
    const mockedRateLimit = rateLimit as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    mockedRateLimit.mockResolvedValueOnce({
      ok: false,
      error: { code: "rate_limited" },
    });

    const response = (await GET(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "rate_limited" });
  });
});

describe("PUT /api/oracle/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates config when authorized", async () => {
    const configPatch: Partial<OracleConfig> = {
      rpcUrl: "https://new-rpc",
      maxBlockRange: 20000,
    };
    const request = new Request("http://localhost:3000/api/oracle/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(configPatch),
    });

    const response = (await PUT(request)) as unknown as OracleConfig;

    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "oracle_config_put",
      limit: 30,
      windowMs: 60_000,
    });
    expect(requireAdmin).toHaveBeenCalledWith(request, {
      strict: true,
      scope: "oracle_config_write",
    });
    expect(validateOracleConfigPatch).toHaveBeenCalledWith(configPatch);
    expect(writeOracleConfig).toHaveBeenCalledWith(configPatch);
    expect(getAdminActor).toHaveBeenCalledWith(request);
    expect(appendAuditLog).toHaveBeenCalledWith({
      actor: "test-actor",
      action: "oracle_config_updated",
      entityType: "oracle",
      entityId: expect.any(String),
      details: configPatch,
    });
    expect(invalidateCachedJson).toHaveBeenCalledWith("oracle_api:/api/oracle");
    expect(response.contractAddress).toBe("0xabc");
  });

  it("rejects malformed json body", async () => {
    const request = new Request("http://localhost:3000/api/oracle/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("rejects non-object body", async () => {
    const request = new Request("http://localhost:3000/api/oracle/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(["not", "object"]),
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("returns rate limited when PUT is over limit", async () => {
    const request = new Request("http://localhost:3000/api/oracle/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const mockedRateLimit = rateLimit as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    mockedRateLimit.mockResolvedValueOnce({
      ok: false,
      error: { code: "rate_limited" },
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "rate_limited" });
  });

  it("returns error when not authorized", async () => {
    const request = new Request("http://localhost:3000/api/oracle/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const requireAdminMock = requireAdmin as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "forbidden" },
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "forbidden" });
  });

  it("returns field-specific validation error", async () => {
    const request = new Request("http://localhost:3000/api/oracle/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rpcUrl: "bad" }),
    });

    const validateMock = validateOracleConfigPatch as unknown as {
      mockImplementationOnce(
        fn: (next: Partial<OracleConfig>) => Partial<OracleConfig>
      ): void;
    };
    validateMock.mockImplementationOnce(() => {
      const err = Object.assign(new Error("invalid_rpc_url"), {
        field: "rpcUrl",
      });
      throw err;
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({
      code: "invalid_rpc_url",
      details: { field: "rpcUrl" },
    });
  });

  it("returns generic validation error when no field is present", async () => {
    const request = new Request("http://localhost:3000/api/oracle/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rpcUrl: "bad" }),
    });

    const validateMock = validateOracleConfigPatch as unknown as {
      mockImplementationOnce(
        fn: (next: Partial<OracleConfig>) => Partial<OracleConfig>
      ): void;
    };
    validateMock.mockImplementationOnce(() => {
      throw new Error("invalid_rpc_url");
    });

    const response = (await PUT(request)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_rpc_url" });
  });
});
