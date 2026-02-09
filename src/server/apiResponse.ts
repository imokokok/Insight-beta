import { NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message?: string;
  details?: unknown;
}

export interface ApiErrorPayload {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiOk<T = unknown> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export function error(err: ApiError | string, status: number = 500): NextResponse {
  const errorObj: ApiError = typeof err === 'string' ? { code: err } : err;
  return NextResponse.json(
    {
      success: false,
      error: errorObj.message || errorObj.code,
      code: errorObj.code,
      details: errorObj.details,
    },
    { status }
  );
}

export function ok<T>(data: T, meta?: ApiOk<T>['meta']): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    meta,
  });
}

export async function handleApi(
  _request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return error({ code: 'internal_error', message }, 500);
  }
}

export async function rateLimit(
  _request: Request,
  _config: { key: string; limit: number; windowMs: number }
): Promise<NextResponse | null> {
  // Simplified rate limiting - always allow
  return null;
}

export async function requireAdmin(
  _request: Request,
  _options?: { strict?: boolean; scope?: string }
): Promise<null | { error: string }> {
  // Simplified admin check - allow all for now
  return null;
}

export function getAdminActor(_request: Request): string | null {
  return 'system';
}

export type AdminScope = 'read' | 'write' | 'admin';

export async function cachedJson<T>(
  _key: string,
  _ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export async function invalidateCachedJson(_key: string): Promise<void> {
  // No-op
}
