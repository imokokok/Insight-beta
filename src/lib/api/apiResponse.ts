import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AppError, isAppError } from '@/lib/errors';
import { rateLimit as rateLimitCheck } from '@/lib/security/rateLimit';
import { requireAuth } from '@/shared/auth';
import { logger } from '@/shared/logger';

export interface ApiErrorInput {
  code: string;
  message?: string;
  details?: unknown;
}

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiOk<T = unknown> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    [key: string]: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiOk<T> | ApiErrorPayload;

export function error(err: AppError | ApiErrorInput | string, status?: number): NextResponse {
  let appError: AppError;

  if (typeof err === 'string') {
    appError = new AppError(err, { statusCode: status ?? 500 });
  } else if (err instanceof AppError) {
    appError = err;
  } else {
    appError = new AppError(err.message || err.code, {
      code: err.code,
      statusCode: status ?? 500,
      details: err.details as Record<string, unknown> | undefined,
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = status ?? appError.statusCode;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code,
        message:
          isProduction && appError.category === 'INTERNAL'
            ? 'Internal server error'
            : appError.message,
        details: isProduction ? undefined : appError.details,
      },
    },
    { status: statusCode },
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
    if (isAppError(err)) {
      return error(err);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const message = err instanceof Error ? err.message : 'Internal server error';

    logger.error('API Error', {
      message: isProduction ? 'Internal error' : message,
      stack: err instanceof Error ? err.stack : undefined,
      details: err,
    });

    return error(
      {
        code: 'internal_error',
        message: isProduction ? 'Internal server error' : message,
      },
      500,
    );
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
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return error(
      new AppError('Rate limit exceeded', {
        category: 'RATE_LIMIT',
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        details: { retryAfter },
      }),
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
    return error(
      new AppError('Unauthorized', {
        category: 'AUTHENTICATION',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      }),
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
    return error(
      new AppError('Unauthorized', {
        category: 'AUTHENTICATION',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      }),
    );
  }

  const crypto = await import('crypto');
  const aBuf = Buffer.from(token);
  const bBuf = Buffer.from(adminToken);

  let isValid = false;
  try {
    isValid = aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return error(
      new AppError('Unauthorized', {
        category: 'AUTHENTICATION',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      }),
    );
  }

  if (!isValid) {
    return error(
      new AppError('Unauthorized', {
        category: 'AUTHENTICATION',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      }),
    );
  }

  return null;
}
