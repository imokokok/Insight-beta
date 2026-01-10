import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { GET, PUT } from "./route";
import * as observability from "@/server/observability";

vi.mock("@/server/observability", () => ({
  readAlertRules: vi.fn(),
  writeAlertRules: vi.fn(),
  appendAuditLog: vi.fn()
}));

vi.mock("@/server/apiResponse", () => ({
  requireAdmin: vi.fn(() => null),
  getAdminActor: vi.fn(() => "test"),
  rateLimit: vi.fn(() => null),
  handleApi: async (arg1: unknown, arg2?: unknown) => {
    try {
      const fn = typeof arg1 === "function" ? (arg1 as () => unknown | Promise<unknown>) : (arg2 as () => unknown | Promise<unknown>);
      const data = await fn();
      return { ok: true, data };
    } catch (e: unknown) {
      if (e instanceof ZodError) return { ok: false, error: "invalid_request_body" };
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message };
    }
  },
  error: (value: unknown) => ({ ok: false, error: value })
}));

describe("GET /api/oracle/alert-rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rules", async () => {
    vi.mocked(observability.readAlertRules).mockResolvedValue([
      { id: "x", name: "X", enabled: true, event: "sync_error", severity: "warning" }
    ]);

    type ApiMockResponse<T> = { ok: true; data: T } | { ok: false; error: unknown };
    const req = new Request("http://localhost:3000/api/oracle/alert-rules");
    const response = (await GET(req)) as unknown as ApiMockResponse<{ rules: unknown[] }>;
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.rules).toHaveLength(1);
    }
  });
});

describe("PUT /api/oracle/alert-rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes rules when authorized", async () => {
    const rules = [
      { id: "x", name: "X", enabled: true, event: "sync_error", severity: "warning" }
    ];
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules })
    });

    type ApiMockResponse<T> = { ok: true; data: T } | { ok: false; error: unknown };
    const response = (await PUT(req)) as unknown as ApiMockResponse<{ rules: unknown[] }>;
    expect(response.ok).toBe(true);
    expect(observability.writeAlertRules).toHaveBeenCalled();
  });

  it("allows empty rules list", async () => {
    const rules: any[] = [];
    const req = new Request("http://localhost:3000/api/oracle/alert-rules", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rules })
    });

    type ApiMockResponse<T> = { ok: true; data: T } | { ok: false; error: unknown };
    const response = (await PUT(req)) as unknown as ApiMockResponse<{ rules: unknown[] }>;
    expect(response.ok).toBe(true);
    expect(observability.writeAlertRules).toHaveBeenCalledWith([]);
  });
});
