/**
 * Base CRUD Operations - 通用 CRUD 操作基类
 *
 * 为所有 API 路由提供统一的 CRUD 操作封装
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { generateRequestId } from '@/server/performance';
import type { ApiResponse, PaginatedResult, PaginationParams } from '@/lib/types';

// ============================================================================
// 类型定义
// ============================================================================

export interface CrudService<T, CreateDTO, UpdateDTO> {
  findAll(params: PaginationParams & Record<string, unknown>): Promise<PaginatedResult<T>>;
  findById(id: string): Promise<T | null>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export interface RequestContext {
  requestId: string;
  startTime: number;
  userId?: string;
  permissions?: string[];
}

// ============================================================================
// 通用 Schema
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// 响应构建器
// ============================================================================

export function createSuccessResponse<T>(
  data: T,
  context: RequestContext,
  pagination?: PaginatedResult<T>['pagination'],
): NextResponse<ApiResponse<T>> {
  const durationMs = Date.now() - context.startTime;

  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      durationMs,
      ...(pagination && { pagination }),
    },
  };

  return NextResponse.json(response);
}

export function createErrorResponse(
  error: Error | string,
  context: RequestContext,
  status: number = 500,
  code?: string,
): NextResponse<ApiResponse<never>> {
  const durationMs = Date.now() - context.startTime;
  const errorMessage = error instanceof Error ? error.message : error;

  logger.error('API Error', {
    requestId: context.requestId,
    error: errorMessage,
    status,
    code,
  });

  const response: ApiResponse<never> = {
    success: false,
    error: {
      code: code || 'INTERNAL_ERROR',
      message: errorMessage,
    },
    meta: {
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      durationMs,
    },
  };

  return NextResponse.json(response, { status });
}

// ============================================================================
// 错误处理
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown, context: RequestContext): NextResponse {
  if (error instanceof ApiError) {
    return createErrorResponse(error.message, context, error.statusCode, error.code);
  }

  if (error instanceof z.ZodError) {
    return createErrorResponse('Validation failed', context, 400, 'VALIDATION_ERROR');
  }

  if (error instanceof Error) {
    return createErrorResponse(error.message, context);
  }

  return createErrorResponse('Unknown error', context);
}

// ============================================================================
// 请求上下文
// ============================================================================

export function createRequestContext(_req: NextRequest): RequestContext {
  return {
    requestId: generateRequestId(),
    startTime: Date.now(),
  };
}

// ============================================================================
// 验证中间件
// ============================================================================

export async function validateBody<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

export function validateQuery<T>(searchParams: URLSearchParams, schema: z.ZodSchema<T>): T {
  const params: Record<string, unknown> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return schema.parse(params);
}

// ============================================================================
// CRUD 处理器工厂
// ============================================================================

export interface CrudHandlersConfig<T, CreateDTO, UpdateDTO> {
  service: CrudService<T, CreateDTO, UpdateDTO>;
  createSchema: z.ZodSchema<CreateDTO>;
  updateSchema: z.ZodSchema<UpdateDTO>;
  resourceName: string;
}

export function createCrudHandlers<T, CreateDTO, UpdateDTO>(
  config: CrudHandlersConfig<T, CreateDTO, UpdateDTO>,
) {
  const { service, createSchema, updateSchema, resourceName } = config;

  // GET /api/resource
  async function list(req: NextRequest): Promise<NextResponse> {
    const context = createRequestContext(req);

    try {
      const params = validateQuery(req.nextUrl.searchParams, PaginationSchema);
      const result = await service.findAll(params);

      logger.info(`${resourceName} list fetched`, {
        requestId: context.requestId,
        count: result.data.length,
        total: result.pagination.total,
      });

      return createSuccessResponse(result.data, context, result.pagination);
    } catch (error) {
      return handleApiError(error, context);
    }
  }

  // GET /api/resource/:id
  async function get(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
    const context = createRequestContext(req);

    try {
      const { id } = IdParamSchema.parse(await params);
      const item = await service.findById(id);

      if (!item) {
        throw new ApiError(`${resourceName} not found`, 404, 'NOT_FOUND');
      }

      logger.info(`${resourceName} fetched`, {
        requestId: context.requestId,
        id,
      });

      return createSuccessResponse(item, context);
    } catch (error) {
      return handleApiError(error, context);
    }
  }

  // POST /api/resource
  async function create(req: NextRequest): Promise<NextResponse> {
    const context = createRequestContext(req);

    try {
      const data = await validateBody(req, createSchema);
      const item = await service.create(data);

      logger.info(`${resourceName} created`, {
        requestId: context.requestId,
        id: (item as Record<string, unknown>).id,
      });

      return createSuccessResponse(item, context);
    } catch (error) {
      return handleApiError(error, context);
    }
  }

  // PUT /api/resource/:id
  async function update(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
    const context = createRequestContext(req);

    try {
      const { id } = IdParamSchema.parse(await params);
      const data = await validateBody(req, updateSchema);
      const item = await service.update(id, data);

      logger.info(`${resourceName} updated`, {
        requestId: context.requestId,
        id,
      });

      return createSuccessResponse(item, context);
    } catch (error) {
      return handleApiError(error, context);
    }
  }

  // DELETE /api/resource/:id
  async function remove(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
    const context = createRequestContext(req);

    try {
      const { id } = IdParamSchema.parse(await params);
      await service.delete(id);

      logger.info(`${resourceName} deleted`, {
        requestId: context.requestId,
        id,
      });

      return createSuccessResponse({ success: true }, context);
    } catch (error) {
      return handleApiError(error, context);
    }
  }

  return {
    list,
    get,
    create,
    update,
    remove,
  };
}

// ============================================================================
// 速率限制
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
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

// ============================================================================
// 缓存控制
// ============================================================================

export function withCacheControl(
  response: NextResponse,
  options: {
    maxAge?: number;
    staleWhileRevalidate?: number;
    private?: boolean;
  },
): NextResponse {
  const directives: string[] = [];

  if (options.private) {
    directives.push('private');
  } else {
    directives.push('public');
  }

  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }

  if (options.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  response.headers.set('Cache-Control', directives.join(', '));
  return response;
}
