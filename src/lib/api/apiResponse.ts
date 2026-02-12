import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { rateLimit as rateLimitCheck } from '@/lib/security/rateLimit';
import { requireAuth } from '@/shared/auth';

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
    { status },
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
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return error({ code: 'internal_error', message }, 500);
  }
}

export async function rateLimit(
  request: Request,
  config: { key: string; limit: number; windowMs: number },
): Promise<NextResponse | null> {
  const result = await rateLimitCheck(request as NextRequest, {
    windowMs: config.windowMs,
    maxRequests: config.limit,
    keyGenerator: () => config.key,
  });

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        details: {
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.totalLimit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetTime),
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
        },
      },
    );
  }

  return null;
}

export async function requireAdmin(
  request: Request,
  options?: { strict?: boolean; scope?: string },
): Promise<null | NextResponse> {
  const authResult = await requireAuth(request as NextRequest);

  if (!authResult.isAdmin) {
    if (options?.strict === false) {
      return null;
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    );
  }

  return null;
}

export async function requireAdminWithToken(
  request: NextRequest,
  options?: { strict?: boolean; scope?: string },
): Promise<null | NextResponse> {
  const headerToken = request.headers.get('x-admin-token');
  const queryToken = new URL(request.url).searchParams.get('token');

  const token = headerToken || queryToken;
  const adminToken = process.env.INSIGHT_ADMIN_TOKEN;

  if (!token || !adminToken) {
    if (options?.strict === false) {
      return null;
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    );
  }

  const crypto = await import('crypto');
  const aBuf = Buffer.from(token);
  const bBuf = Buffer.from(adminToken);

  let isValid = false;
  try {
    isValid = aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    );
  }

  if (!isValid) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
      { status: 401 },
    );
  }

  return null;
}
