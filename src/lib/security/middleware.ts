/**
 * Security Middleware - 安全中间件
 *
 * API 安全加固：速率限制、输入验证、CORS 等
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { logger } from '@/lib/logger';

// ============================================================================
// 速率限制
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// 内存存储（生产环境应使用 Redis）
const rateLimitStore = new Map<string, RateLimitRecord>();

function getClientIp(req: NextRequest): string {
  // 从各种 header 中获取真实 IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  // 返回未知标识
  return 'unknown';
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const clientIp = getClientIp(req);
  const key = config.keyGenerator
    ? config.keyGenerator(req)
    : `${clientIp}:${req.nextUrl.pathname}`;

  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (record.count >= config.maxRequests) {
    logger.warn('Rate limit exceeded', {
      ip: clientIp,
      path: req.nextUrl.pathname,
      key,
    });

    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const result = await rateLimit(req, config);

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
          },
        },
      );
    }

    return null;
  };
}

// ============================================================================
// 输入验证
// ============================================================================

export function validateInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  context?: string,
): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(data);

  if (!result.success) {
    logger.warn('Input validation failed', {
      context,
      errors: result.error.errors,
    });

    return {
      success: false,
      errors: result.error.errors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (
    req: NextRequest,
  ): Promise<{ success: false; response: NextResponse } | { success: true; data: T }> => {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return {
        success: false,
        response: new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_JSON',
              message: 'Invalid JSON in request body',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      };
    }

    const result = validateInput(body, schema, req.nextUrl.pathname);

    if (!result.success) {
      return {
        success: false,
        response: new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: result.errors,
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      };
    }

    return { success: true, data: result.data };
  };
}

// ============================================================================
// CORS
// ============================================================================

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

const defaultCorsConfig: CorsConfig = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  allowCredentials: true,
  maxAge: 86400,
};

export function createCorsMiddleware(config: Partial<CorsConfig> = {}) {
  const fullConfig = { ...defaultCorsConfig, ...config };

  return (req: NextRequest): NextResponse | null => {
    const origin = req.headers.get('origin');

    // 检查 Origin
    if (origin && !fullConfig.allowedOrigins.includes(origin)) {
      if (fullConfig.allowedOrigins.length > 0) {
        return new NextResponse(null, { status: 403 });
      }
    }

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': (fullConfig.allowedMethods ?? []).join(', '),
        'Access-Control-Allow-Headers': (fullConfig.allowedHeaders ?? []).join(', '),
        'Access-Control-Max-Age': String(fullConfig.maxAge),
      };

      if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
      }

      if (fullConfig.allowCredentials) {
        headers['Access-Control-Allow-Credentials'] = 'true';
      }

      return new NextResponse(null, { status: 204, headers });
    }

    return null;
  };
}

// ============================================================================
// 安全头
// ============================================================================

export function addSecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers;

  // XSS 防护
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');

  // 引用策略
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 权限策略
  headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  );

  return response;
}

// ============================================================================
// 认证中间件
// ============================================================================

export interface AuthConfig {
  required: boolean;
  scopes?: string[];
}

export function createAuthMiddleware(config: AuthConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    if (!config.required) {
      return null;
    }

    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 这里应该实现实际的认证逻辑
    // 简化示例：检查 Bearer token
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // TODO: 验证 token 和权限

    return null;
  };
}

// ============================================================================
// 组合中间件
// ============================================================================

export type MiddlewareFunction = (
  req: NextRequest,
) => Promise<NextResponse | null> | NextResponse | null;

export function composeMiddleware(...middlewares: MiddlewareFunction[]) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    for (const middleware of middlewares) {
      const result = await middleware(req);
      if (result) {
        return result;
      }
    }
    return null;
  };
}

// ============================================================================
// 请求 ID
// ============================================================================

export function addRequestId(req: NextRequest): string {
  const requestId = crypto.randomUUID();
  req.headers.set('X-Request-ID', requestId);
  return requestId;
}

// ============================================================================
// 日志中间件
// ============================================================================

export function createLoggingMiddleware() {
  return async (req: NextRequest): Promise<null> => {
    const startTime = Date.now();
    const requestId = req.headers.get('X-Request-ID') || crypto.randomUUID();

    logger.info('Request started', {
      requestId,
      method: req.method,
      path: req.nextUrl.pathname,
      ip: getClientIp(req),
      userAgent: req.headers.get('user-agent'),
    });

    // 存储开始时间以便后续使用
    (req as unknown as Record<string, unknown>).startTime = startTime;
    (req as unknown as Record<string, unknown>).requestId = requestId;

    return null;
  };
}
