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

function applyBaseResponseHeaders(response: NextResponse, requestId: string) {
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-dns-prefetch-control", "off");
  return response;
}

export function middleware(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id")?.trim() || createRequestId();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return applyBaseResponseHeaders(response, requestId);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
