import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { middleware } from "./middleware";

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

  it("sets x-request-id for normal pages and adds CSP", () => {
    const req = makeRequest("/oracle");
    const res = middleware(req);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    const csp = res.headers.get("content-security-policy");
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("reuses incoming x-request-id (trimmed)", () => {
    const req = makeRequest("/oracle", { "x-request-id": "  abc  " });
    const res = middleware(req);
    expect(res.headers.get("x-request-id")).toBe("abc");
  });

  it("sets x-request-id for API routes without CSP", () => {
    const req = makeRequest("/api/oracle/stats");
    const res = middleware(req);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(res.headers.get("content-security-policy")).toBeNull();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("sets x-request-id for prefetch without CSP", () => {
    const req = makeRequest("/oracle", { purpose: "prefetch" });
    const res = middleware(req);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(res.headers.get("content-security-policy")).toBeNull();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
