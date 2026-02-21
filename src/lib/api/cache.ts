import type { NextResponse } from 'next/server';

export interface CacheOptions {
  maxAge: number;
  staleWhileRevalidate?: number;
  public?: boolean;
}

export function withCacheHeaders(response: NextResponse, options: CacheOptions): NextResponse {
  const { maxAge, staleWhileRevalidate, public: isPublic = false } = options;

  const directives: string[] = [isPublic ? 'public' : 'private', `max-age=${maxAge}`];

  if (staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  response.headers.set('Cache-Control', directives.join(', '));

  return response;
}

export function withCacheHeadersResponse(response: Response, options: CacheOptions): Response {
  const { maxAge, staleWhileRevalidate, public: isPublic = false } = options;

  const directives: string[] = [isPublic ? 'public' : 'private', `max-age=${maxAge}`];

  if (staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  response.headers.set('Cache-Control', directives.join(', '));

  return response;
}

export const CACHE_PRESETS = {
  short: { maxAge: 10, staleWhileRevalidate: 30 },
  medium: { maxAge: 60, staleWhileRevalidate: 300 },
  long: { maxAge: 300, staleWhileRevalidate: 600 },
  veryLong: { maxAge: 3600, staleWhileRevalidate: 7200 },
} as const;
