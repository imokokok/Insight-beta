import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { GET } from "./route";
import * as oracle from "@/server/oracle";
import type { Assertion } from "@/lib/oracleTypes";

vi.mock("@/server/oracle", () => ({
  listAssertions: vi.fn(),
  ensureOracleSynced: vi.fn(),
}));

// Mock apiResponse to just return the data or response
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
  requireAdmin: vi.fn(async (request: Request) => {
    const token = request.headers.get("x-admin-token")?.trim() ?? "";
    return token ? null : {};
  }),
  handleApi: async (arg1: unknown, arg2?: unknown) => {
    try {
      const fn =
        typeof arg1 === "function"
          ? (arg1 as () => unknown | Promise<unknown>)
          : (arg2 as () => unknown | Promise<unknown>);
      const data = await fn();
      return { ok: true, data };
    } catch (e: unknown) {
      if (e instanceof ZodError) {
        const messages = e.issues.map((i) => i.message);
        if (messages.includes("invalid_address")) {
          return { ok: false, error: "invalid_address" };
        }
        return { ok: false, error: "invalid_request_body" };
      }
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message };
    }
  },
}));

describe("GET /api/oracle/assertions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns assertions list", async () => {
    const mockItems: Assertion[] = [
      {
        id: "0x1",
        chain: "Local",
        asserter: "0xabc",
        protocol: "Test",
        market: "Test market",
        assertion: "test",
        assertedAt: new Date().toISOString(),
        livenessEndsAt: new Date().toISOString(),
        status: "Pending",
        bondUsd: 1,
        txHash: "0xtx",
      },
    ];
    const listAssertionsMock = vi.mocked(oracle.listAssertions);
    listAssertionsMock.mockResolvedValue({
      items: mockItems,
      total: 1,
      nextCursor: null,
    });

    const request = new Request(
      "http://localhost:3000/api/oracle/assertions?limit=10",
    );
    type ApiMockResponse<T> =
      | { ok: true; data: T }
      | { ok: false; error: string };
    const response = (await GET(request)) as unknown as ApiMockResponse<{
      items: Assertion[];
      total: number;
      nextCursor: number | null;
    }>;

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.items).toEqual(mockItems);
    }
    expect(oracle.listAssertions).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
      }),
    );
  });

  it("filters by chain", async () => {
    vi.mocked(oracle.listAssertions).mockResolvedValue({
      items: [],
      total: 0,
      nextCursor: null,
    });

    const request = new Request(
      "http://localhost:3000/api/oracle/assertions?chain=Optimism",
    );
    await GET(request);

    expect(oracle.listAssertions).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: "Optimism",
      }),
    );
  });

  it("handles sync param", async () => {
    const { ensureOracleSynced } = await import("@/server/oracle");
    vi.mocked(oracle.listAssertions).mockResolvedValue({
      items: [],
      total: 0,
      nextCursor: null,
    });

    const request = new Request(
      "http://localhost:3000/api/oracle/assertions?sync=1",
      {
        headers: { "x-admin-token": "test" },
      },
    );
    await GET(request);

    expect(ensureOracleSynced).toHaveBeenCalled();
  });

  it("rejects invalid asserter address", async () => {
    const request = new Request(
      "http://localhost:3000/api/oracle/assertions?asserter=not_an_address",
    );
    type ApiMockResponse =
      | { ok: true; data: unknown }
      | { ok: false; error: string };
    const response = (await GET(request)) as unknown as ApiMockResponse;

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("invalid_address");
    }
    expect(oracle.listAssertions).not.toHaveBeenCalled();
  });
});
