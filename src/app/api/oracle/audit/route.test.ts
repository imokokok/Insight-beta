import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { listAuditLog } from "@/server/observability";
import { rateLimit, requireAdmin } from "@/server/apiResponse";
import { ZodError } from "zod";

vi.mock("@/server/observability", () => ({
  listAuditLog: vi.fn(async () => ({ items: [], nextCursor: 0 })),
}));

vi.mock("@/server/apiResponse", () => ({
  rateLimit: vi.fn(async () => null),
  requireAdmin: vi.fn(async () => null),
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
          error: { code: "invalid_request_body" },
        } as unknown as Response;
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message } as unknown as Response;
    }
  },
  error: (value: unknown) => ({ ok: false, error: value }),
}));

describe("GET /api/oracle/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns audit logs with parsed params and enforces admin auth", async () => {
    const request = new Request(
      "http://localhost:3000/api/oracle/audit?limit=25&cursor=5&actor=alice",
      {
        headers: { "x-admin-token": "t" },
      },
    );
    const response = (await GET(request)) as unknown as {
      ok: boolean;
      data: { items: unknown[]; nextCursor: number };
    };
    expect(response.ok).toBe(true);
    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "audit_get",
      limit: 60,
      windowMs: 60_000,
    });
    expect(requireAdmin).toHaveBeenCalledWith(request, {
      strict: true,
      scope: "audit_read",
    });
    expect(listAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25, cursor: 5, actor: "alice" }),
    );
  });

  it("rejects invalid params", async () => {
    const badReq = new Request(
      "http://localhost:3000/api/oracle/audit?limit=0&cursor=-1",
      {
        headers: { "x-admin-token": "t" },
      },
    );
    const response = (await GET(badReq)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("returns rate limited", async () => {
    const req = new Request("http://localhost:3000/api/oracle/audit", {
      headers: { "x-admin-token": "t" },
    });
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

  it("returns forbidden when not authorized", async () => {
    const req = new Request("http://localhost:3000/api/oracle/audit");
    const requireAdminMock = requireAdmin as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "forbidden" },
    });
    const response = (await GET(req)) as { ok: boolean; error?: unknown };
    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "forbidden" });
    expect(listAuditLog).not.toHaveBeenCalled();
  });
});
