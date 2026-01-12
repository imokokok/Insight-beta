import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { GET, PUT } from "./route";
import { rateLimit, requireAdmin } from "@/server/apiResponse";
import * as observability from "@/server/observability";

vi.mock("@/server/observability", () => ({
  readAlertRules: vi.fn(),
  writeAlertRules: vi.fn(),
  appendAuditLog: vi.fn(),
}));

vi.mock("@/server/apiResponse", () => ({
  requireAdmin: vi.fn(() => null),
  getAdminActor: vi.fn(() => "test"),
  rateLimit: vi.fn(() => null),
  handleApi: async (arg1: unknown, arg2?: unknown) => {
    try {
      const fn =
        typeof arg1 === "function"
          ? (arg1 as () => unknown | Promise<unknown>)
          : (arg2 as () => unknown | Promise<unknown>);
      const data = await fn();
      if (data && typeof data === "object" && "ok" in data) {
        return data as unknown as Response;
      }
      return { ok: true, data } as unknown as Response;
    } catch (e: unknown) {
      if (e instanceof ZodError)
        return {
          ok: false,
          error: "invalid_request_body",
        } as unknown as Response;
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message } as unknown as Response;
    }
  },
  error: (value: unknown) => ({ ok: false, error: value }),
}));

describe("GET /api/oracle/alert-rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rules", async () => {
    vi.mocked(observability.readAlertRules).mockResolvedValue([
      {
        id: "x",
        name: "X",
        enabled: true,
        event: "sync_error",
        severity: "warning",
      },
    ]);

    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: unknown };
    const req = new Request("http://localhost:3000/api/oracle/alert-rules");
    const response = (await GET(req)) as unknown as ApiMockResponse<{
      rules: unknown[];
    }>;
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.rules).toHaveLength(1);
    }
    expect(rateLimit).toHaveBeenCalledWith(req, {
      key: "alert_rules_get",
      limit: 240,
      windowMs: 60_000,
    });
  });

  it("returns rate limited when GET is over limit", async () => {
    const req = new Request("http://localhost:3000/api/oracle/alert-rules");
    const mockedRateLimit = rateLimit as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    mockedRateLimit.mockResolvedValueOnce({
      ok: false,
      error: { code: "rate_limited" },
    });

    const response = (await GET(req)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "rate_limited" });
  });
});

describe("PUT /api/oracle/alert-rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes rules when authorized", async () => {
    const rules = [
      {
        id: "x",
        name: "X",
        enabled: true,
        event: "sync_error",
        severity: "warning",
      },
    ];
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules }),
    });

    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: unknown };
    const response = (await PUT(req)) as unknown as ApiMockResponse<{
      rules: unknown[];
    }>;
    expect(response.ok).toBe(true);
    expect(rateLimit).toHaveBeenCalledWith(req, {
      key: "alert_rules_put",
      limit: 30,
      windowMs: 60_000,
    });
    expect(requireAdmin).toHaveBeenCalledWith(req, {
      strict: true,
      scope: "alert_rules_write",
    });
    expect(observability.writeAlertRules).toHaveBeenCalledWith(rules);
    expect(observability.appendAuditLog).toHaveBeenCalledWith({
      actor: "test",
      action: "alert_rules_updated",
      entityType: "alerts",
      entityId: null,
      details: { count: rules.length },
    });
  });

  it("allows empty rules list", async () => {
    const rules: object[] = [];
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules }),
    });

    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: unknown };
    const response = (await PUT(req)) as unknown as ApiMockResponse<{
      rules: unknown[];
    }>;
    expect(response.ok).toBe(true);
    expect(observability.writeAlertRules).toHaveBeenCalledWith([]);
  });

  it("rejects invalid request body", async () => {
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });

    const response = (await PUT(req)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("rejects malformed json body", async () => {
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });

    const response = (await PUT(req)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("rejects more than 50 rules", async () => {
    const baseRule = {
      id: "x",
      name: "X",
      enabled: true,
      event: "sync_error" as const,
      severity: "warning" as const,
    };
    const rules = Array.from({ length: 51 }, (_, i) => ({
      ...baseRule,
      id: `x-${i}`,
      name: `X-${i}`,
    }));
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules }),
    });

    const response = (await PUT(req)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("rejects rule with invalid event", async () => {
    const rules = [
      {
        id: "x",
        name: "X",
        enabled: true,
        event: "unknown_event",
        severity: "warning",
      },
    ] as unknown[];
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules }),
    });

    const response = (await PUT(req)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("rejects rule with invalid severity", async () => {
    const rules = [
      {
        id: "x",
        name: "X",
        enabled: true,
        event: "sync_error",
        severity: "low",
      },
    ] as unknown[];
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules }),
    });

    const response = (await PUT(req)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("returns rate limited when PUT is over limit", async () => {
    const rules = [
      {
        id: "x",
        name: "X",
        enabled: true,
        event: "sync_error",
        severity: "warning",
      },
    ];
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules }),
    });

    const mockedRateLimit = rateLimit as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    mockedRateLimit.mockResolvedValueOnce({
      ok: false,
      error: { code: "rate_limited" },
    });

    const response = (await PUT(req)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "rate_limited" });
    expect(observability.writeAlertRules).not.toHaveBeenCalled();
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it("returns error when not authorized", async () => {
    const rules = [
      {
        id: "x",
        name: "X",
        enabled: true,
        event: "sync_error",
        severity: "warning",
      },
    ];
    const requireAdminMock = requireAdmin as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "forbidden" },
    });
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules }),
    });

    const response = (await PUT(req)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "forbidden" });
    expect(observability.writeAlertRules).not.toHaveBeenCalled();
  });
});
