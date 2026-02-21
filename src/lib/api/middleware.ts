/**
 * Enhanced API Middleware System
 *
 * 统一的 API 中间件系统，提供：
 * - 请求日志
 * - 速率限制
 * - 认证检查
 * - 统一错误处理
 */

import type { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { RATE_LIMIT_CONFIG } from '@/config/constants';
import { rateLimit as checkRateLimit } from '@/lib/security/rateLimit';
import { logger } from '@/shared/logger';
import { apiError } from '@/shared/utils/apiHandler';

const SENSITIVE_PARAMS = ['api_key', 'token', 'secret', 'password', 'key', 'auth', 'credential'];

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost');
    const params = new URLSearchParams(parsed.search);

    for (const [key] of params) {
      if (SENSITIVE_PARAMS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        params.set(key, '***');
      }
    }

    parsed.search = params.toString();
    return parsed.pathname + (parsed.search ? '?' + parsed.search : '');
  } catch {
    return url;
  }
}

function sanitizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];

  headers.forEach((value, key) => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      result[key] = '***';
    } else {
      result[key] = value;
    }
  });

  return result;
}

export { sanitizeHeaders };

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
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
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
          return apiError('METHOD_NOT_ALLOWED', `Method ${method} not allowed`, 405);
        }

        let rateLimitRemaining = -1;

        if (options.rateLimit) {
          const result = await checkRateLimit(request, options.rateLimit);
          rateLimitRemaining = result.remaining;
          if (!result.allowed) {
            const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
            const response = apiError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429, {
              retryAfter,
            });
            response.headers.set('X-RateLimit-Remaining', '0');
            response.headers.set('Retry-After', String(retryAfter));
            return response;
          }
        }

        if (options.auth?.required) {
          const token = request.headers.get(options.auth.header || 'authorization');
          if (!token) {
            return apiError('AUTHENTICATION_REQUIRED', 'Authentication required', 401);
          }
          if (options.auth.validateToken) {
            const valid = await options.auth.validateToken(token);
            if (!valid) {
              return apiError('INVALID_TOKEN', 'Invalid token', 401);
            }
          }
        }

        if (options.validate?.custom) {
          const validation = await options.validate.custom(request);
          if (!validation.valid) {
            return apiError('VALIDATION_ERROR', validation.error || 'Validation failed', 400);
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
            url: sanitizeUrl(request.url),
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

        return apiError(
          'INTERNAL_ERROR',
          error instanceof Error ? error.message : 'Internal server error',
          500,
          { requestId },
        );
      }
    };
  };
}

/**
 * 默认速率限制配置
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: RATE_LIMIT_CONFIG.DEFAULT_WINDOW_MS,
  maxRequests: RATE_LIMIT_CONFIG.DEFAULT_MAX_REQUESTS,
};

/**
 * 严格的速率限制配置
 */
export const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: RATE_LIMIT_CONFIG.DEFAULT_WINDOW_MS,
  maxRequests: RATE_LIMIT_CONFIG.STRICT_MAX_REQUESTS,
};

/**
 * 宽松的速率限制配置
 */
export const RELAXED_RATE_LIMIT: RateLimitConfig = {
  windowMs: RATE_LIMIT_CONFIG.DEFAULT_WINDOW_MS,
  maxRequests: RATE_LIMIT_CONFIG.RELAXED_MAX_REQUESTS,
};
