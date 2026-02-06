/**
 * Security Middleware - 安全中间件
 *
 * API 安全加固：速率限制、输入验证、CORS 等
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import {
  rateLimit,
  cleanupMemoryStore,
  getRateLimitStoreStatus,
  getClientIp,
  type RateLimitConfig,
  type RateLimitResult,
} from './rateLimit';

import type { z } from 'zod';

// ============================================================================
// 速率限制 - 从独立模块导出
// ============================================================================

export {
  rateLimit,
  cleanupMemoryStore,
  getRateLimitStoreStatus,
  getClientIp,
  type RateLimitConfig,
  type RateLimitResult,
};

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
// 输入验证中间件
// ============================================================================

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);

      // 将验证后的数据附加到请求对象
      (req as unknown as Record<string, unknown>).validatedBody = validated;

      return null;
    } catch (error) {
      logger.warn('Request validation failed', {
        path: req.nextUrl.pathname,
        error: error instanceof Error ? error.message : String(error),
      });

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error instanceof Error ? error.message : String(error),
          },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  };
}

// ============================================================================
// CORS 中间件
// ============================================================================

interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  maxAge: number;
}

const defaultCorsConfig: CorsConfig = {
  allowedOrigins: ['*'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400,
};

export function createCorsMiddleware(config: Partial<CorsConfig> = {}) {
  const finalConfig = { ...defaultCorsConfig, ...config };

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const origin = req.headers.get('origin') ?? '';
    const isAllowed =
      finalConfig.allowedOrigins.includes('*') || finalConfig.allowedOrigins.includes(origin);

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': finalConfig.allowedMethods.join(', '),
        'Access-Control-Allow-Headers': finalConfig.allowedHeaders.join(', '),
        'Access-Control-Max-Age': String(finalConfig.maxAge),
      };

      if (isAllowed) {
        headers['Access-Control-Allow-Origin'] = origin || '*';
      }

      return new NextResponse(null, {
        status: 204,
        headers,
      });
    }

    // 对于实际请求，返回 null 让后续处理
    // 但需要在响应中添加 CORS 头
    return null;
  };
}

// ============================================================================
// 安全响应头中间件
// ============================================================================

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // 安全响应头
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CSP (Content Security Policy)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:;",
  );

  return response;
}

// ============================================================================
// 请求 ID 中间件
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

// ============================================================================
// 中间件组合器
// ============================================================================

export interface MiddlewareConfig {
  rateLimit?: RateLimitConfig;
  cors?: Partial<CorsConfig>;
  validation?: z.ZodSchema<unknown>;
  logging?: boolean;
}

export async function applyMiddleware(
  req: NextRequest,
  config: MiddlewareConfig,
): Promise<NextResponse | null> {
  // 1. 添加请求 ID
  addRequestId(req);

  // 2. 日志记录
  if (config.logging) {
    const loggingMiddleware = createLoggingMiddleware();
    await loggingMiddleware(req);
  }

  // 3. CORS
  if (config.cors) {
    const corsMiddleware = createCorsMiddleware(config.cors);
    const corsResponse = await corsMiddleware(req);
    if (corsResponse) return corsResponse;
  }

  // 4. 速率限制
  if (config.rateLimit) {
    const rateLimitMiddleware = createRateLimitMiddleware(config.rateLimit);
    const rateLimitResponse = await rateLimitMiddleware(req);
    if (rateLimitResponse) return rateLimitResponse;
  }

  // 5. 输入验证
  if (config.validation) {
    const validationMiddleware = createValidationMiddleware(config.validation);
    const validationResponse = await validationMiddleware(req);
    if (validationResponse) return validationResponse;
  }

  return null;
}

// ============================================================================
// 便捷导出 - 预配置的中间件
// ============================================================================

export const defaultApiMiddleware = (req: NextRequest) =>
  applyMiddleware(req, {
    rateLimit: {
      windowMs: 60 * 1000, // 1 分钟
      maxRequests: 100,
    },
    cors: {},
    logging: true,
  });

export const strictApiMiddleware = (req: NextRequest) =>
  applyMiddleware(req, {
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 30,
    },
    cors: {
      allowedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
    },
    logging: true,
  });
