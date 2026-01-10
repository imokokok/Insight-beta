import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import { handleApi } from "@/server/apiResponse";
import { rateLimit } from "@/server/apiResponse";
import { hasDatabase } from "@/server/db";

vi.mock("@/server/db", async () => {
  const actual = await vi.importActual<typeof import("@/server/db")>("@/server/db");
  return {
    ...actual,
    hasDatabase: vi.fn(() => false)
  };
});

describe("handleApi error mapping", () => {
  it("maps rpc_unreachable to 502", async () => {
    const res = await handleApi(new Request("http://localhost/api/test"), async () => {
      throw new Error("rpc_unreachable");
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "rpc_unreachable" } });
  });

  it("maps sync_failed to 502", async () => {
    const res = await handleApi(new Request("http://localhost/api/test"), async () => {
      throw new Error("sync_failed");
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "sync_failed" } });
  });

  it("maps contract_not_found to 400", async () => {
    const res = await handleApi(new Request("http://localhost/api/test"), async () => {
      throw new Error("contract_not_found");
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "contract_not_found" } });
  });

  it("maps forbidden to 403", async () => {
    const res = await handleApi(new Request("http://localhost/api/test"), async () => {
      throw new Error("forbidden");
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "forbidden" } });
  });

  it("maps unknown errors to 500", async () => {
    const res = await handleApi(new Request("http://localhost/api/test"), async () => {
      throw new Error("something_else");
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "unknown_error" } });
  });
});

describe("rateLimit KV fallback", () => {
  it("falls back to memory when KV storage is unavailable", async () => {
    const prevTrust = process.env.INSIGHT_TRUST_PROXY;
    const prevStore = process.env.INSIGHT_RATE_LIMIT_STORE;
    (globalThis as unknown as { insightRate?: Map<string, unknown> }).insightRate = new Map();
    try {
      process.env.INSIGHT_TRUST_PROXY = "true";
      process.env.INSIGHT_RATE_LIMIT_STORE = "kv";
      vi.mocked(hasDatabase).mockReturnValue(false);

      const req = new Request("http://localhost/api/test", {
        headers: {
          "x-real-ip": "203.0.113.10"
        }
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
});
