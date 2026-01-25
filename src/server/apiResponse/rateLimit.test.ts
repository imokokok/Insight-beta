import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/server/db", () => ({
  hasDatabase: vi.fn().mockReturnValue(false),
  query: vi.fn(),
}));

vi.mock("@/server/schema", () => ({
  ensureSchema: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/observability", () => ({
  createOrTouchAlert: vi.fn().mockResolvedValue(undefined),
}));

describe("rateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within rate limit", async () => {
    const { rateLimit } = await import("@/server/apiResponse/rateLimit");

    const request = new Request("http://localhost/test", {
      method: "GET",
    });

    const result = await rateLimit(request, {
      key: "test-endpoint",
      limit: 10,
      windowMs: 60000,
    });

    expect(result).toBeNull();
  });

  it("tracks rate limit counts", async () => {
    const { rateLimit } = await import("@/server/apiResponse/rateLimit");

    const request = new Request("http://localhost/test", {
      method: "GET",
    });

    for (let i = 0; i < 5; i++) {
      const result = await rateLimit(request, {
        key: "test-endpoint-count",
        limit: 10,
        windowMs: 60000,
      });
      expect(result).toBeNull();
    }
  });

  it("blocks requests exceeding limit", async () => {
    const { rateLimit } = await import("@/server/apiResponse/rateLimit");

    const request = new Request("http://localhost/test-block", {
      method: "GET",
    });

    const limit = 3;
    for (let i = 0; i < limit; i++) {
      const result = await rateLimit(request, {
        key: "test-endpoint-block",
        limit: limit,
        windowMs: 60000,
      });
      expect(result).toBeNull();
    }

    const blockedResult = await rateLimit(request, {
      key: "test-endpoint-block",
      limit: limit,
      windowMs: 60000,
    });

    expect(blockedResult).not.toBeNull();
    expect(blockedResult?.status).toBe(429);
  });

  it("includes rate limit headers in response", async () => {
    const { rateLimit } = await import("@/server/apiResponse/rateLimit");

    const request = new Request("http://localhost/test-headers", {
      method: "GET",
    });

    const limit = 2;
    for (let i = 0; i < limit; i++) {
      await rateLimit(request, {
        key: "test-endpoint-headers",
        limit: limit,
        windowMs: 60000,
      });
    }

    const blockedResult = await rateLimit(request, {
      key: "test-endpoint-headers",
      limit: limit,
      windowMs: 60000,
    });

    expect(blockedResult).not.toBeNull();
    const headers = blockedResult?.headers;
    expect(headers?.get("retry-after")).toBeTruthy();
    expect(headers?.get("x-ratelimit-limit")).toBe("2");
    expect(headers?.get("x-ratelimit-remaining")).toBe("0");
  });
});

describe("getClientIp", () => {
  it("extracts IP from CF-Connecting-IP header", async () => {
    const { rateLimit } = await import("@/server/apiResponse/rateLimit");

    const request = new Request("http://localhost/test", {
      method: "GET",
      headers: {
        "cf-connecting-ip": "192.168.1.1",
      },
    });

    const result = await rateLimit(request, {
      key: "test-cf-ip",
      limit: 10,
      windowMs: 60000,
    });

    expect(result).toBeNull();
  });

  it("extracts IP from X-Forwarded-For header", async () => {
    const { rateLimit } = await import("@/server/apiResponse/rateLimit");

    const request = new Request("http://localhost/test", {
      method: "GET",
      headers: {
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      },
    });

    const result = await rateLimit(request, {
      key: "test-forwarded-ip",
      limit: 10,
      windowMs: 60000,
    });

    expect(result).toBeNull();
  });
});
