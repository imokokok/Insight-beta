import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { PATCH } from "./route";
import { rateLimit, requireAdmin } from "@/server/apiResponse";
import * as observability from "@/server/observability";

vi.mock("@/server/observability", () => ({
  updateAlertStatus: vi.fn(),
}));

vi.mock("@/server/apiResponse", () => ({
  rateLimit: vi.fn(() => null),
  getAdminActor: vi.fn(() => "test-actor"),
  requireAdmin: vi.fn(() => null),
  invalidateCachedJson: vi.fn(async () => {}),
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
      if (e instanceof ZodError) {
        return {
          ok: false,
          error: "invalid_request_body",
        } as unknown as Response;
      }
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message } as unknown as Response;
    }
  },
  error: (value: unknown) => ({ ok: false, error: value }),
}));

describe("PATCH /api/oracle/alerts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates alert status when authorized", async () => {
    const updateAlertStatusMock = vi.mocked(observability.updateAlertStatus);
    updateAlertStatusMock.mockResolvedValue({
      id: 1,
      status: "Acknowledged",
    } as unknown as observability.Alert);

    const req = new Request("http://localhost:3000/api/oracle/alerts/1", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-token": "test" },
      body: JSON.stringify({ status: "Acknowledged" }),
    });

    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: unknown };
    const response = (await PATCH(req, {
      params: Promise.resolve({ id: "1" }),
    })) as unknown as ApiMockResponse<{ id: number }>;

    expect(response.ok).toBe(true);
    expect(rateLimit).toHaveBeenCalledWith(req, {
      key: "alerts_patch",
      limit: 60,
      windowMs: 60_000,
    });
    expect(requireAdmin).toHaveBeenCalledWith(req, {
      strict: true,
      scope: "alerts_update",
    });
    expect(updateAlertStatusMock).toHaveBeenCalledWith({
      id: 1,
      status: "Acknowledged",
      actor: "test-actor",
    });
  });

  it("returns invalid_request_body for malformed json", async () => {
    const req = new Request("http://localhost:3000/api/oracle/alerts/1", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-token": "test" },
      body: "not-json",
    });

    const response = (await PATCH(req, {
      params: Promise.resolve({ id: "1" }),
    })) as { ok: boolean; error?: unknown };

    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("returns invalid_request_body for invalid status", async () => {
    const req = new Request("http://localhost:3000/api/oracle/alerts/1", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-token": "test" },
      body: JSON.stringify({ status: "Unknown" }),
    });

    const response = (await PATCH(req, {
      params: Promise.resolve({ id: "1" }),
    })) as { ok: boolean; error?: unknown };

    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("returns invalid_request_body for invalid id", async () => {
    const req = new Request("http://localhost:3000/api/oracle/alerts/foo", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-token": "test" },
      body: JSON.stringify({ status: "Open" }),
    });

    const response = (await PATCH(req, {
      params: Promise.resolve({ id: "foo" }),
    })) as { ok: boolean; error?: unknown };

    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "invalid_request_body" });
  });

  it("returns not_found when alert does not exist", async () => {
    const updateAlertStatusMock = vi.mocked(observability.updateAlertStatus);
    updateAlertStatusMock.mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/oracle/alerts/999", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-token": "test" },
      body: JSON.stringify({ status: "Resolved" }),
    });

    const response = (await PATCH(req, {
      params: Promise.resolve({ id: "999" }),
    })) as { ok: boolean; error?: unknown };

    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "not_found" });
  });

  it("returns rate_limited when over patch limit", async () => {
    const mockedRateLimit = rateLimit as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    mockedRateLimit.mockResolvedValueOnce({
      ok: false,
      error: { code: "rate_limited" },
    });

    const req = new Request("http://localhost:3000/api/oracle/alerts/1", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-token": "test" },
      body: JSON.stringify({ status: "Open" }),
    });

    const response = (await PATCH(req, {
      params: Promise.resolve({ id: "1" }),
    })) as { ok: boolean; error?: unknown };

    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "rate_limited" });
    expect(observability.updateAlertStatus).not.toHaveBeenCalled();
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it("returns forbidden when not authorized", async () => {
    const requireAdminMock = requireAdmin as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "forbidden" },
    });

    const req = new Request("http://localhost:3000/api/oracle/alerts/1", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-token": "" },
      body: JSON.stringify({ status: "Open" }),
    });

    const response = (await PATCH(req, {
      params: Promise.resolve({ id: "1" }),
    })) as { ok: boolean; error?: unknown };

    expect(response.ok).toBe(false);
    expect(response.error).toEqual({ code: "forbidden" });
    expect(observability.updateAlertStatus).not.toHaveBeenCalled();
  });
});
