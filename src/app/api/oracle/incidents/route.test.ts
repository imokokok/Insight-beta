import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { GET } from "./route";
import { rateLimit, cachedJson } from "@/server/apiResponse";
import * as observability from "@/server/observability";

vi.mock("@/server/observability", () => ({
  listIncidents: vi.fn(),
  getAlertsByIds: vi.fn(),
  createIncident: vi.fn(),
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
  invalidateCachedJson: vi.fn(async () => {}),
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
  error: (value: unknown) => ({ ok: false as const, error: value }),
  requireAdmin: vi.fn(() => null),
  getAdminActor: vi.fn(() => "test"),
}));

describe("GET /api/oracle/incidents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns incidents list", async () => {
    const listIncidentsMock = vi.mocked(observability.listIncidents);
    listIncidentsMock.mockResolvedValue([
      {
        id: 1,
        title: "t",
        status: "Open",
        severity: "warning",
        owner: null,
        summary: null,
        runbook: null,
        alertIds: [10],
        entityType: null,
        entityId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null,
      },
    ] as unknown as observability.Incident[]);

    const request = new Request(
      "http://localhost:3000/api/oracle/incidents?limit=10",
    );

    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: unknown };
    const response = (await GET(request)) as unknown as ApiMockResponse<{
      items: unknown[];
    }>;

    expect(response.ok).toBe(true);
    expect(observability.listIncidents).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
    );
    expect(rateLimit).toHaveBeenCalledWith(request, {
      key: "incidents_get",
      limit: 240,
      windowMs: 60_000,
    });
    expect(cachedJson).toHaveBeenCalledWith(
      "oracle_api:/api/oracle/incidents?limit=10",
      5_000,
      expect.any(Function),
    );
  });

  it("can include linked alerts when includeAlerts=1", async () => {
    vi.mocked(observability.listIncidents).mockResolvedValue([
      {
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
      },
    ] as unknown as observability.Incident[]);

    vi.mocked(observability.getAlertsByIds).mockResolvedValue([
      { id: 11, title: "a11" },
      { id: 10, title: "a10" },
    ] as unknown as observability.Alert[]);

    const request = new Request(
      "http://localhost:3000/api/oracle/incidents?limit=10&includeAlerts=1",
    );

    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: unknown };
    const response = (await GET(request)) as unknown as ApiMockResponse<{
      items: Array<{ id: number; alerts?: Array<{ id: number }> }>;
    }>;

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.items).toHaveLength(1);
      const item = response.data.items[0]!;
      expect(item.alerts?.map((a) => a.id)).toEqual([10, 11]);
    }
    expect(observability.getAlertsByIds).toHaveBeenCalledWith([10, 11]);
  });
});
