import { NextResponse, type NextRequest } from "next/server";

function createRequestId() {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < bytes.length; i += 1) {
      out += bytes[i]!.toString(16).padStart(2, "0");
    }
    return out;
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function buildCsp(isDev: boolean) {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const styleSrc = ["'self'", "'unsafe-inline'"];

  const connectSrc = ["'self'", "https:", "wss:"];
  if (isDev) connectSrc.push("http:", "ws:");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "script-src-attr 'none'",
    `style-src ${styleSrc.join(" ")}`,
    "img-src 'self' blob: data:",
    "media-src 'self'",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
    directives.push("block-all-mixed-content");
  }

  return directives.join("; ");
}

function applySecurityHeaders(response: NextResponse, isDev: boolean) {
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("cross-origin-resource-policy", "same-origin");
  if (!isDev) {
    response.headers.set(
      "strict-transport-security",
      "max-age=15552000; includeSubDomains",
    );
  }
}

export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const requestId =
    request.headers.get("x-request-id")?.trim() || createRequestId();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const isPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("x-middleware-prefetch") === "1";
  if (isPrefetch) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("x-request-id", requestId);
    applySecurityHeaders(response, isDev);
    return response;
  }

  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/")) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("x-request-id", requestId);
    applySecurityHeaders(response, isDev);
    return response;
  }

  const csp = buildCsp(isDev);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("content-security-policy", csp);
  response.headers.set("x-request-id", requestId);
  applySecurityHeaders(response, isDev);
  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
