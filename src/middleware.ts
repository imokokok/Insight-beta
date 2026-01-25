import { NextResponse, type NextRequest } from "next/server";

function createRequestId() {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < bytes.length; i += 1) {
      // Safe: bytes is a Uint8Array, i is a loop counter
      // eslint-disable-next-line security/detect-object-injection
      out += bytes[i]!.toString(16).padStart(2, "0");
    }
    return out;
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

export function middleware(request: NextRequest) {
  // Note: API rate limiting is handled per-route in src/server/apiResponse/rateLimit.ts
  const requestId =
    request.headers.get("x-request-id")?.trim() || createRequestId();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
