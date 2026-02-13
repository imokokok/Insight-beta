/**
 * Enhanced API Middleware System
 *
 * 统一的 API 中间件系统，提供：
 * - 请求日志
 * - 速率限制
 * - 认证检查
 * - 统一错误处理
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { logger } from '@/shared/logger';

export interface MiddlewareConfig {
  /** 是否启用日志 */
  logRequest?: boolean;
  /** 是否启用速率限制 */
  rateLimit?: RateLimitConfig;
  /** 是否检查认证 */
  requireAuth?: boolean;
  /** 自定义验证函数 */
  validate?: (request: NextRequest) => Promise<{ valid: boolean; error?: string }>;
}

export interface RateLimitConfig {
  /** 窗口时间（毫秒） */
  windowMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
  /** 自定义 key 生成函数 */
  keyGenerator?: (request: NextRequest) => string;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(request);
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  return `rate-limit:${ip}`;
}

function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetIn: number } {
  const key = getRateLimitKey(request, config);
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetIn: record.resetTime - now,
  };
}

export type ApiHandler = (request: NextRequest) => Promise<NextResponse>;

export interface ApiMiddlewareOptions {
  /** 日志配置 */
  log?: {
    /** 是否记录请求 */
    enabled?: boolean;
    /** 排除的路径 */
    exclude?: RegExp[];
  };
  /** 速率限制配置 */
  rateLimit?: RateLimitConfig;
  /** 认证配置 */
  auth?: {
    /** 是否需要认证 */
    required?: boolean;
    /** 认证头名称 */
    header?: string;
    /** 验证函数 */
    validateToken?: (token: string) => Promise<boolean>;
  };
  /** 请求验证 */
  validate?: {
    /** 允许的方法 */
    allowedMethods?: string[];
    /** 自定义验证 */
    custom?: (request: NextRequest) => Promise<{ valid: boolean; error?: string }>;
  };
}

/**
 * 创建带中间件的 API 处理器
 *
 * @example
 * ```typescript
 * export const GET = withMiddleware({
 *   log: { enabled: true },
 *   rateLimit: { windowMs: 60000, maxRequests: 100 },
 *   auth: { required: true },
 *   validate: { allowedMethods: ['GET', 'POST'] }
 * })(async (request) => {
 *   return apiSuccess({ data: 'hello' });
 * });
 * ```
 */
export function withMiddleware(options: ApiMiddlewareOptions) {
  return function (handler: ApiHandler): ApiHandler {
    return async (request: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now();
      const requestId = crypto.randomUUID();
      const method = request.method;
      const url = request.nextUrl.pathname;

      try {
        if (options.validate?.allowedMethods && !options.validate.allowedMethods.includes(method)) {
          return NextResponse.json(
            { ok: false, error: `Method ${method} not allowed` },
            { status: 405 },
          );
        }

        let rateLimitRemaining = -1;

        if (options.rateLimit) {
          const { allowed, remaining, resetIn } = checkRateLimit(request, options.rateLimit);
          rateLimitRemaining = remaining;
          if (!allowed) {
            return NextResponse.json(
              { ok: false, error: 'Rate limit exceeded', retryAfter: Math.ceil(resetIn / 1000) },
              {
                status: 429,
                headers: {
                  'X-RateLimit-Remaining': '0',
                  'Retry-After': String(Math.ceil(resetIn / 1000)),
                },
              },
            );
          }
        }

        if (options.auth?.required) {
          const token = request.headers.get(options.auth.header || 'authorization');
          if (!token) {
            return NextResponse.json(
              { ok: false, error: 'Authentication required' },
              { status: 401 },
            );
          }
          if (options.auth.validateToken) {
            const valid = await options.auth.validateToken(token);
            if (!valid) {
              return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
            }
          }
        }

        if (options.validate?.custom) {
          const validation = await options.validate.custom(request);
          if (!validation.valid) {
            return NextResponse.json(
              { ok: false, error: validation.error || 'Validation failed' },
              { status: 400 },
            );
          }
        }

        const response = await handler(request);

        if (rateLimitRemaining >= 0) {
          response.headers.set('X-RateLimit-Remaining', String(rateLimitRemaining));
        }

        if (options.log?.enabled) {
          const duration = Date.now() - startTime;
          logger.info('API Request', {
            requestId,
            method,
            url,
            status: response.status,
            duration,
            ip: request.headers.get('x-forwarded-for')?.split(',')[0],
          });
        }

        return response;
      } catch (error) {
        logger.error('API Error', {
          requestId,
          method,
          url,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });

        return NextResponse.json(
          {
            ok: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            requestId,
          },
          { status: 500 },
        );
      }
    };
  };
}

/**
 * 默认速率限制配置
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 100,
};

/**
 * 严格的速率限制配置
 */
export const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 10,
};

/**
 * 宽松的速率限制配置
 */
export const RELAXED_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 1000,
};
