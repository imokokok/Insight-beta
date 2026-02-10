import { NextResponse, type NextRequest } from 'next/server';

function createRequestId(): string {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    let out = '';
    for (const byte of bytes) {
      out += byte.toString(16).padStart(2, '0');
    }
    return out;
  }
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${Date.now().toString(16)}${hex}`;
}

function getResponseTime(startTime: number): string {
  const duration = Date.now() - startTime;
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
  return `${(duration / 60000).toFixed(2)}m`;
}

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id')?.trim() || createRequestId();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-response-time', getResponseTime(startTime));

  return response;
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)'],
};
