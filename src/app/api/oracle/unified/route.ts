/**
 * Unified Oracle API Route (Optimized)
 *
 * 通用预言机聚合API
 * 提供跨协议的价格数据聚合和比较
 *
 * 优化点：
 * 1. 使用 Zod 进行参数验证
 * 2. 细化的错误分类处理
 * 3. 性能指标收集
 * 4. 结构化日志
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  unifiedOracleGetSchema,
  unifiedOraclePostSchema,
  formatZodError,
} from '@/lib/validation/oracleSchemas';
import { getUnifiedPriceData, compareProtocols } from '@/server/oracle/unifiedService';
import { metrics } from '@/lib/monitoring/metrics';
import type { ErrorCode } from '@/lib/types/oracle';

export const dynamic = 'force-dynamic';

// ============================================================================
// 错误处理
// ============================================================================

class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

// 错误类已定义在 AppError 中，可根据需要扩展

// ============================================================================
// 辅助函数
// ============================================================================

function createErrorResponse(error: AppError, traceId: string): NextResponse {
  logger.error('API Error', {
    code: error.code,
    message: error.message,
    status: error.statusCode,
    details: error.details,
    traceId,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        traceId,
      },
    },
    { status: error.statusCode },
  );
}

function createSuccessResponse<T>(
  data: T,
  meta: Record<string, unknown>,
  traceId: string,
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      ...meta,
      traceId,
      timestamp: new Date().toISOString(),
    },
  });
}

function getTraceId(request: NextRequest): string {
  return (
    request.headers.get('x-trace-id') ||
    `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
}

// ============================================================================
// API 路由
// ============================================================================

/**
 * GET /api/oracle/unified
 *
 * 获取聚合价格数据
 * 支持多协议价格对比和异常检测
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  const traceId = getTraceId(request);

  try {
    // 1. 解析和验证参数
    const { searchParams } = new URL(request.url);
    const rawParams = {
      pair: searchParams.get('pair'),
      protocols: searchParams.get('protocols') || undefined,
      includeStats: searchParams.get('includeStats') || undefined,
      chain: searchParams.get('chain') || undefined,
    };

    const validation = unifiedOracleGetSchema.safeParse(rawParams);
    if (!validation.success) {
      throw new ValidationError(formatZodError(validation.error));
    }

    const { pair, protocols, includeStats } = validation.data;

    logger.info('Fetching unified oracle data', {
      event: 'unified_oracle_get',
      pair,
      protocols,
      includeStats,
      traceId,
    });

    // 2. 执行业务逻辑
    const data = await getUnifiedPriceData({
      pair,
      protocols,
      includeStats,
    });

    // 3. 记录性能指标
    const duration = performance.now() - startTime;
    metrics.histogram('api.unified_oracle.get.duration', duration, {
      pair,
      protocols: protocols?.join(',') || 'all',
    });
    metrics.increment('api.unified_oracle.get.success', 1, {
      pair,
      protocols: protocols?.join(',') || 'all',
    });

    logger.info('Unified oracle data fetched successfully', {
      event: 'unified_oracle_get_success',
      pair,
      duration,
      traceId,
    });

    return createSuccessResponse(
      data,
      {
        pair,
        protocols,
        duration,
      },
      traceId,
    );
  } catch (error) {
    const duration = performance.now() - startTime;
    metrics.histogram('api.unified_oracle.get.duration', duration, { error: 'true' });
    metrics.increment('api.unified_oracle.get.error', 1);

    if (error instanceof AppError) {
      return createErrorResponse(error, traceId);
    }

    logger.error('Unexpected error in unified oracle GET', {
      error: error instanceof Error ? error.message : String(error),
      traceId,
    });

    return createErrorResponse(
      new AppError('INTERNAL_ERROR', 'An unexpected error occurred'),
      traceId,
    );
  }
}

/**
 * POST /api/oracle/unified
 *
 * 执行跨协议价格比较
 * 检测价格偏差和异常
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const traceId = getTraceId(request);

  try {
    // 1. 解析和验证请求体
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    const validation = unifiedOraclePostSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError(formatZodError(validation.error));
    }

    const { pair, protocols, threshold, includeHistory } = validation.data;

    logger.info('Comparing oracle protocols', {
      event: 'unified_oracle_compare',
      pair,
      protocols,
      threshold,
      includeHistory,
      traceId,
    });

    // 2. 执行业务逻辑
    const comparison = await compareProtocols({
      pair,
      protocols,
      deviationThreshold: threshold,
      includeHistory,
    });

    // 3. 记录性能指标
    const duration = performance.now() - startTime;
    metrics.histogram('api.unified_oracle.compare.duration', duration, {
      pair,
      protocols: protocols?.join(',') || 'all',
    });
    metrics.increment('api.unified_oracle.compare.success', 1, {
      pair,
      protocols: protocols?.join(',') || 'all',
    });

    logger.info('Protocol comparison completed successfully', {
      event: 'unified_oracle_compare_success',
      pair,
      duration,
      traceId,
    });

    return createSuccessResponse(
      comparison,
      {
        pair,
        threshold,
        protocols,
        duration,
      },
      traceId,
    );
  } catch (error) {
    const duration = performance.now() - startTime;
    metrics.histogram('api.unified_oracle.compare.duration', duration, { error: 'true' });
    metrics.increment('api.unified_oracle.compare.error', 1);

    if (error instanceof AppError) {
      return createErrorResponse(error, traceId);
    }

    logger.error('Unexpected error in unified oracle POST', {
      error: error instanceof Error ? error.message : String(error),
      traceId,
    });

    return createErrorResponse(
      new AppError('INTERNAL_ERROR', 'An unexpected error occurred'),
      traceId,
    );
  }
}
