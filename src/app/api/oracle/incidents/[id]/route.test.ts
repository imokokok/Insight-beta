import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { GET } from "./route";
import { rateLimit } from "@/server/apiResponse";
import * as observability from "@/server/observability";

vi.mock("@/server/observability", () => ({
  getIncident: vi.fn(),
  getAlertsByIds: vi.fn(),
  patchIncident: vi.fn(),
  updateAlertStatus: vi.fn(),
}));

vi.mock("@/server/apiResponse", () => ({
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
  error: (value: unknown) => ({ ok: false as const, error: value }),
  requireAdmin: vi.fn(() => null),
  getAdminActor: vi.fn(() => "test-actor"),
}));

describe("GET /api/oracle/incidents/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not_found when incident is missing", async () => {
    vi.mocked(observability.getIncident).mockResolvedValue(null);

    type ApiMockResponse =
      | { ok: true; data: unknown }
      | { ok: false; error: unknown };

    const req = new Request("http://localhost:3000/api/oracle/incidents/1");
    const response = (await GET(req, {
      params: Promise.resolve({ id: "1" }),
    })) as unknown as ApiMockResponse;

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toEqual({ code: "not_found" });
    }
  });

  it("can include linked alerts when includeAlerts=1", async () => {
    vi.mocked(observability.getIncident).mockResolvedValue({
      id: 1,
      title: "t",
      status: "Open",
      severity: "warning",
      owner: null,
      summary: null,
      runbook: null,
      alertIds: [10, 11],
      entityType: null,
      entityId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
    } as unknown as observability.Incident);

    vi.mocked(observability.getAlertsByIds).mockResolvedValue([
      { id: 10, title: "a10" },
      { id: 11, title: "a11" },
    ] as unknown as observability.Alert[]);

    type ApiMockResponse<T> =
      | { ok: true; incident: T }
      | { ok: false; error: unknown };

    const req = new Request(
      "http://localhost:3000/api/oracle/incidents/1?includeAlerts=1",
    );
    const response = (await GET(req, {
      params: Promise.resolve({ id: "1" }),
    })) as unknown as ApiMockResponse<{
      id: number;
      alerts?: Array<{ id: number }>;
    }>;

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.incident.alerts?.map((a) => a.id)).toEqual([10, 11]);
    }
    expect(rateLimit).toHaveBeenCalledWith(req, {
      key: "incident_get",
      limit: 240,
      windowMs: 60_000,
    });
  });
});
