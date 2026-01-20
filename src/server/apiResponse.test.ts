import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/logger", () => ({
  withLogContext: vi.fn((_: unknown, fn: () => unknown) => fn()),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  handleApi,
  rateLimit,
  cachedJson,
  invalidateCachedJson,
  requireAdmin,
  getAdminActor,
  ok,
  error,
} from "@/server/apiResponse";
import { hasDatabase } from "@/server/db";
import { readJsonFile, writeJsonFile, listJsonKeys } from "@/server/kvStore";
import { verifyAdmin } from "@/server/adminAuth";
import { env } from "@/lib/env";

vi.mock("@/server/db", () => ({
  hasDatabase: vi.fn(() => false),
  query: vi.fn(),
}));

vi.mock("@/server/kvStore", () => ({
  readJsonFile: vi.fn(async () => null),
  writeJsonFile: vi.fn(async () => void 0),
  deleteJsonKey: vi.fn(async () => void 0),
  listJsonKeys: vi.fn(async () => ({ items: [] })),
}));

vi.mock("@/server/adminAuth", () => ({
  verifyAdmin: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/env", () => ({
  env: {
    INSIGHT_ADMIN_TOKEN: "test-token",
    INSIGHT_ADMIN_TOKEN_SALT: "test-salt",
    INSIGHT_TRUST_PROXY: "false",
  },
}));

describe("ok and error functions", () => {
  it("ok returns a successful response", () => {
    const data = { message: "success" };
    const response = ok(data);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
  });

  it("error returns an error response", () => {
    const response = error("test error", 400);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(400);
  });
});

describe("handleApi function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles successful responses", async () => {
    const data = { message: "success" };
    const response = await handleApi(
      new Request("http://localhost/api/test"),
      async () => {
        return data;
      },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, data });
  });

  it("binds requestId into log context", async () => {
    const { withLogContext } = await import("@/lib/logger");
    const requestId = "req-123";
    const response = await handleApi(
      new Request("http://localhost/api/test", {
        headers: { "x-request-id": requestId },
      }),
      async () => {
        return { message: "success" };
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(vi.mocked(withLogContext)).toHaveBeenCalled();
    const firstCall = vi.mocked(withLogContext).mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(firstCall?.requestId).toBe(requestId);
  });

  it("handles Response objects", async () => {
    const mockResponse = new NextResponse(
      JSON.stringify({ custom: "response" }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
    const response = await handleApi(
      new Request("http://localhost/api/test"),
      async () => {
        return mockResponse;
      },
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ custom: "response" });
  });

  it("handles Zod errors", async () => {
    // Simplified test that just throws a basic ZodError
    const response = await handleApi(
      new Request("http://localhost/api/test"),
      async () => {
        // Create a simple ZodError using Zod schema validation
        const { z } = await import("zod");
        const schema = z.string();
        return schema.parse(123); // This will throw a ZodError
      },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBeDefined();
  });

  it("maps rpc_unreachable to 502", async () => {
    const res = await handleApi(
      new Request("http://localhost/api/test"),
      async () => {
        throw new Error("rpc_unreachable");
      },
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "rpc_unreachable" } });
  });

  it("maps sync_failed to 502", async () => {
    const res = await handleApi(
      new Request("http://localhost/api/test"),
      async () => {
        throw new Error("sync_failed");
      },
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "sync_failed" } });
  });

  it("maps contract_not_found to 400", async () => {
    const res = await handleApi(
      new Request("http://localhost/api/test"),
      async () => {
        throw new Error("contract_not_found");
      },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "contract_not_found" } });
  });

  it("maps forbidden to 403", async () => {
    const res = await handleApi(
      new Request("http://localhost/api/test"),
      async () => {
        throw new Error("forbidden");
      },
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "forbidden" } });
  });

  it("maps unknown errors to 500", async () => {
    const res = await handleApi(
      new Request("http://localhost/api/test"),
      async () => {
        throw new Error("something_else");
      },
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "unknown_error" } });
  });
});

describe("rateLimit function", () => {
  it("falls back to memory when KV storage is unavailable", async () => {
    const prevTrust = process.env.INSIGHT_TRUST_PROXY;
    const prevStore = process.env.INSIGHT_RATE_LIMIT_STORE;
    (
      globalThis as unknown as { insightRate?: Map<string, unknown> }
    ).insightRate = new Map();
    try {
      process.env.INSIGHT_TRUST_PROXY = "true";
      process.env.INSIGHT_RATE_LIMIT_STORE = "kv";
      vi.mocked(hasDatabase).mockReturnValue(false);

      const req = new Request("http://localhost/api/test", {
        headers: {
          "x-real-ip": "203.0.113.10",
        },
      });

      const limit = 2;
      const windowMs = 60_000;

      expect(await rateLimit(req, { key: "t", limit, windowMs })).toBeNull();
      expect(await rateLimit(req, { key: "t", limit, windowMs })).toBeNull();
      const limited = await rateLimit(req, { key: "t", limit, windowMs });
      expect(limited).not.toBeNull();
      expect(limited?.status).toBe(429);
    } finally {
      if (prevTrust === undefined) delete process.env.INSIGHT_TRUST_PROXY;
      else process.env.INSIGHT_TRUST_PROXY = prevTrust;
      if (prevStore === undefined) delete process.env.INSIGHT_RATE_LIMIT_STORE;
      else process.env.INSIGHT_RATE_LIMIT_STORE = prevStore;
    }
  });

  it("uses x-real-ip when trust proxy is enabled", async () => {
    (env as unknown as Record<string, string>).INSIGHT_TRUST_PROXY = "true";
    (env as unknown as Record<string, string>).INSIGHT_RATE_LIMIT_STORE =
      "memory";
    (
      globalThis as unknown as { insightRate?: Map<string, unknown> }
    ).insightRate = new Map();

    const limit = 1;
    const windowMs = 60_000;

    const req1 = new Request("http://localhost/api/test", {
      headers: { "x-real-ip": "203.0.113.11" },
    });
    const req2 = new Request("http://localhost/api/test", {
      headers: { "x-real-ip": "203.0.113.12" },
    });

    expect(await rateLimit(req1, { key: "t2", limit, windowMs })).toBeNull();
    expect(await rateLimit(req2, { key: "t2", limit, windowMs })).toBeNull();
    const limited = await rateLimit(req1, { key: "t2", limit, windowMs });
    expect(limited?.status).toBe(429);
  });

  it("parses Forwarded header when trust proxy is enabled", async () => {
    (env as unknown as Record<string, string>).INSIGHT_TRUST_PROXY = "true";
    (env as unknown as Record<string, string>).INSIGHT_RATE_LIMIT_STORE =
      "memory";
    (
      globalThis as unknown as { insightRate?: Map<string, unknown> }
    ).insightRate = new Map();

    const limit = 1;
    const windowMs = 60_000;

    const req1 = new Request("http://localhost/api/test", {
      headers: { forwarded: 'for="203.0.113.21";proto=https;host=example.com' },
    });
    const req2 = new Request("http://localhost/api/test", {
      headers: { forwarded: "for=203.0.113.22;proto=https" },
    });

    expect(await rateLimit(req1, { key: "t3", limit, windowMs })).toBeNull();
    expect(await rateLimit(req2, { key: "t3", limit, windowMs })).toBeNull();
    const limited = await rateLimit(req1, { key: "t3", limit, windowMs });
    expect(limited?.status).toBe(429);
  });

  it("prefers x-vercel-forwarded-for over x-real-ip", async () => {
    (env as unknown as Record<string, string>).INSIGHT_TRUST_PROXY = "true";
    (env as unknown as Record<string, string>).INSIGHT_RATE_LIMIT_STORE =
      "memory";
    (
      globalThis as unknown as { insightRate?: Map<string, unknown> }
    ).insightRate = new Map();

    const limit = 1;
    const windowMs = 60_000;

    const req1 = new Request("http://localhost/api/test", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.31",
        "x-real-ip": "203.0.113.99",
      },
    });
    const req2 = new Request("http://localhost/api/test", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.31",
        "x-real-ip": "203.0.113.32",
      },
    });

    expect(await rateLimit(req1, { key: "t4", limit, windowMs })).toBeNull();
    const limited = await rateLimit(req2, { key: "t4", limit, windowMs });
    expect(limited?.status).toBe(429);
  });
});

describe("cachedJson function", () => {
  beforeEach(() => {
    // Clear any existing memory cache and reset mocks
    (
      globalThis as unknown as { insightApiCache?: Map<string, unknown> }
    ).insightApiCache = new Map();
    vi.clearAllMocks();
  });

  it("returns cached value when available", async () => {
    const key = "test-key-cached";
    const value = { message: "cached" };
    const ttlMs = 60_000;

    const readJsonFileMock = readJsonFile as unknown as {
      mockResolvedValue(value: unknown): void;
    };
    readJsonFileMock.mockResolvedValue({
      expiresAtMs: Date.now() + ttlMs,
      value,
    });

    const result = await cachedJson(key, ttlMs, async () => {
      return { message: "computed" };
    });

    expect(result).toEqual(value);
    expect(readJsonFile).toHaveBeenCalled();
  });

  it("computes and caches value when not cached", async () => {
    const key = "test-key-computed";
    const computedValue = { message: "computed" };
    const ttlMs = 60_000;

    const readJsonFileMock = readJsonFile as unknown as {
      mockResolvedValue(value: unknown): void;
    };
    readJsonFileMock.mockResolvedValue(null);

    const result = await cachedJson(key, ttlMs, async () => {
      return computedValue;
    });

    expect(result).toEqual(computedValue);
    expect(writeJsonFile).toHaveBeenCalled();
  });
});

describe("invalidateCachedJson function", () => {
  it("clears all cache when no prefix is provided", async () => {
    await invalidateCachedJson("");
    expect(listJsonKeys).toHaveBeenCalled();
  });

  it("clears cache with prefix when provided", async () => {
    await invalidateCachedJson("test-prefix");
    expect(listJsonKeys).toHaveBeenCalled();
  });
});

describe("requireAdmin function", () => {
  it("returns null when admin is verified", async () => {
    const request = new Request("http://localhost/api/admin/test", {
      headers: {
        Authorization: "Bearer test-token",
      },
    });

    const result = await requireAdmin(request);
    expect(result).toBeNull();
    expect(verifyAdmin).toHaveBeenCalled();
  });

  it("returns error when admin verification fails", async () => {
    const verifyAdminMock = verifyAdmin as unknown as {
      mockResolvedValue(value: unknown): void;
    };
    verifyAdminMock.mockResolvedValue({ ok: false });

    const request = new Request("http://localhost/api/admin/test", {
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });

    const result = await requireAdmin(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });
});

describe("getAdminActor function", () => {
  it("returns admin when no x-admin-actor header is provided", () => {
    const request = new Request("http://localhost/api/admin/test");
    const actor = getAdminActor(request);
    expect(actor).toBe("admin");
  });

  it("returns the x-admin-actor header value when provided", () => {
    const request = new Request("http://localhost/api/admin/test", {
      headers: {
        "x-admin-actor": "test-actor",
      },
    });
    const actor = getAdminActor(request);
    expect(actor).toBe("test-actor");
  });

  it("truncates long actor names", () => {
    const longActor = "a".repeat(100);
    const request = new Request("http://localhost/api/admin/test", {
      headers: {
        "x-admin-actor": longActor,
      },
    });
    const actor = getAdminActor(request);
    expect(actor.length).toBe(80);
  });
});
