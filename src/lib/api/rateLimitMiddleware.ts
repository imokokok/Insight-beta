/**
 * API Rate Limit Middleware - API 速率限制中间件
 *
 * 为 Next.js API Routes 提供统一的速率限制保护
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { RateLimitConfig } from '@/lib/security/rateLimit';
import { rateLimit } from '@/lib/security/rateLimit';

// 默认速率限制配置
const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 100, // 每分钟最多 100 请求
};

// 不同路径的特定配置
const pathConfigs: Record<string, RateLimitConfig> = {
  // 认证相关接口 - 更严格的限制
  '/api/auth': {
    windowMs: 15 * 60 * 1000, // 15 分钟
    maxRequests: 5, // 5 次登录尝试
  },
  // 数据查询接口 - 较宽松的限制
  '/api/oracle': {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 200, // 200 次查询
  },
  // 写操作接口 - 中等限制
  '/api/oracle/assertions': {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  '/api/oracle/disputes': {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
};

/**
 * 获取路径对应的速率限制配置
 */
function getConfigForPath(pathname: string): RateLimitConfig {
  // 查找最匹配的特定配置
  for (const [path, config] of Object.entries(pathConfigs)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }
  return defaultConfig;
}

/**
 * 创建带速率限制的 API 响应
 */
export async function withRateLimit(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  const config = getConfigForPath(req.nextUrl.pathname);

  const result = await rateLimit(req, config);

  // 如果超出限制，返回 429 错误
  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        resetTime: result.resetTime,
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

  // 执行实际处理器
  const response = await handler(req);

  // 添加速率限制头信息
  response.headers.set('X-RateLimit-Limit', String(result.totalLimit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetTime));

  return response;
}

/**
 * 高阶函数：包装 API 路由处理器
 *
 * 使用示例：
 * ```ts
 * export async function GET(req: NextRequest) {
 *   return withRateLimitHandler(req, async (req) => {
 *     // 处理逻辑
 *     return NextResponse.json(data);
 *   });
 * }
 * ```
 */
export function withRateLimitHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    return withRateLimit(req, handler);
  };
}

/**
 * 检查是否在白名单中（如健康检查端点）
 */
const whitelistPaths = ['/api/health', '/api/status'];

export function isWhitelisted(pathname: string): boolean {
  return whitelistPaths.some((path) => pathname.startsWith(path));
}
