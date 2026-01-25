import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { GET } from "./route";
import type { Assertion, Dispute } from "@/lib/types/oracleTypes";
import type { Alert } from "@/server/observability";

vi.mock("@/server/oracle", () => ({
  getAssertion: vi.fn(),
  getDisputeByAssertionId: vi.fn(),
}));

vi.mock("@/server/observability", () => ({
  listAlerts: vi.fn(),
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
  error: (value: unknown) => ({ ok: false, error: value }),
}));

describe("GET /api/oracle/assertions/[id]/timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns timeline for existing assertion", async () => {
    const id = "0xassertion";
    const assertion: Assertion = {
      id,
      chain: "Local",
      asserter: "0x0000000000000000000000000000000000000001",
      protocol: "Test",
      market: "Test market",
      assertion: "Price > 100",
      assertedAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
      livenessEndsAt: new Date("2024-01-01T01:00:00.000Z").toISOString(),
      resolvedAt: new Date("2024-01-01T02:00:00.000Z").toISOString(),
      status: "Resolved",
      bondUsd: 100,
      disputer: "0x0000000000000000000000000000000000000002",
      txHash: "0xhash",
    };

    const dispute: Dispute = {
      id: "D:0xassertion",
      chain: "Local",
      assertionId: id,
      market: "Test market",
      disputeReason: "bad data",
      disputer: "0x0000000000000000000000000000000000000002",
      disputedAt: new Date("2024-01-01T00:30:00.000Z").toISOString(),
      votingEndsAt: new Date("2024-01-01T02:30:00.000Z").toISOString(),
      status: "Executed",
      currentVotesFor: 10,
      currentVotesAgainst: 5,
      totalVotes: 15,
    };

    const alerts: Alert[] = [
      {
        id: 1,
        fingerprint: "fp1",
        type: "dispute_created",
        severity: "critical",
        title: "Dispute detected",
        message: "disputed",
        entityType: "assertion",
        entityId: id,
        status: "Open",
        occurrences: 1,
        firstSeenAt: new Date("2024-01-01T00:40:00.000Z").toISOString(),
        lastSeenAt: new Date("2024-01-01T00:40:00.000Z").toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
        createdAt: new Date("2024-01-01T00:40:00.000Z").toISOString(),
        updatedAt: new Date("2024-01-01T00:40:00.000Z").toISOString(),
      },
    ];

    const { getAssertion, getDisputeByAssertionId } = await import(
      "@/server/oracle"
    );
    const { listAlerts } = await import("@/server/observability");

    vi.mocked(getAssertion).mockResolvedValue(assertion);
    vi.mocked(getDisputeByAssertionId).mockResolvedValue(dispute);
    vi.mocked(listAlerts).mockResolvedValue({
      items: alerts,
      total: alerts.length,
      nextCursor: null,
    });

    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: unknown };

    const request = new Request(
      "http://localhost:3000/api/oracle/assertions/0xassertion/timeline",
    );

    const response = (await GET(request, {
      params: Promise.resolve({ id }),
    })) as unknown as ApiMockResponse<{
      assertion: Assertion;
      dispute: Dispute | null;
      alerts: Alert[];
      timeline: { type: string; at: string }[];
    }>;

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.assertion.id).toBe(id);
      expect(response.data.dispute?.id).toBe(dispute.id);
      expect(response.data.alerts).toHaveLength(1);
      const types = response.data.timeline.map((e) => e.type);
      expect(types).toEqual([
        "assertion_created",
        "dispute_created",
        "alert_dispute_created",
        "assertion_resolved",
        "dispute_executed",
      ]);
    }
  });

  it("returns not_found when assertion is missing", async () => {
    const id = "0xmissing";
    const { getAssertion } = await import("@/server/oracle");
    vi.mocked(getAssertion).mockResolvedValue(null);

    type ApiMockResponse =
      | { ok: true; data: unknown }
      | { ok: false; error: unknown };

    const request = new Request(
      "http://localhost:3000/api/oracle/assertions/0xmissing/timeline",
    );

    const response = (await GET(request, {
      params: Promise.resolve({ id }),
    })) as unknown as ApiMockResponse;

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toEqual({ code: "not_found" });
    }
  });

  it("returns rate limited when over limit", async () => {
    const { rateLimit } = await import("@/server/apiResponse");

    const mockedRateLimit = rateLimit as unknown as {
      mockResolvedValueOnce(value: unknown): void;
    };

    mockedRateLimit.mockResolvedValueOnce({
      ok: false,
      error: { code: "rate_limited" },
    });

    type ApiMockResponse =
      | { ok: true; data: unknown }
      | { ok: false; error: unknown };

    const request = new Request(
      "http://localhost:3000/api/oracle/assertions/0xassertion/timeline",
    );

    const response = (await GET(request, {
      params: Promise.resolve({ id: "0xassertion" }),
    })) as unknown as ApiMockResponse;

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toEqual({ code: "rate_limited" });
    }
  });
});
