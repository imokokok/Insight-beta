import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { middleware } from "./middleware";
import nextConfig from "../next.config";

function makeRequest(
  pathname: string,
  headers: Record<string, string> = {},
): NextRequest {
  return {
    headers: new Headers(headers),
    nextUrl: { pathname },
  } as unknown as NextRequest;
}

describe("middleware", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets x-request-id for normal pages", () => {
    const req = makeRequest("/oracle");
    const res = middleware(req);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("reuses incoming x-request-id (trimmed)", () => {
    const req = makeRequest("/oracle", { "x-request-id": "  abc  " });
    const res = middleware(req);
    expect(res.headers.get("x-request-id")).toBe("abc");
  });

  it("sets x-request-id for API routes", () => {
    const req = makeRequest("/api/oracle/stats");
    const res = middleware(req);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("sets x-request-id for prefetch", () => {
    const req = makeRequest("/oracle", { purpose: "prefetch" });
    const res = middleware(req);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});

describe("next.config headers", () => {
  it("adds security headers", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules?.[0]?.source).toBe("/:path*");
    const headers = rules?.[0]?.headers ?? [];
    const map = new Map(
      headers.map((h: { key: string; value: string }) => [
        h.key.toLowerCase(),
        h.value,
      ]),
    );
    expect(map.get("x-content-type-options")).toBe("nosniff");
    expect(map.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(map.get("content-security-policy")).toContain("default-src");
  });
});
