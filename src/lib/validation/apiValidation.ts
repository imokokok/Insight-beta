/**
 * API 验证中间件
 *
 * 统一处理 API 请求的参数验证
 */

import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { logger } from '@/lib/logger';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ValidationError;
}

export interface ValidationError {
  code: string;
  message: string;
  details?: z.ZodError['errors'];
}

/**
 * 验证查询参数
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): ValidationResult<T> {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const result = schema.safeParse(params);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: result.error.errors,
        },
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    logger.error('Query validation error:', { error });
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate query parameters',
      },
    };
  }
}

/**
 * 验证请求体
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: result.error.errors,
        },
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    logger.error('Body validation error:', { error });
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to parse or validate request body',
      },
    };
  }
}

/**
 * 验证路由参数
 */
export function validateRouteParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>,
): ValidationResult<T> {
  try {
    const result = schema.safeParse(params);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid route parameters',
          details: result.error.errors,
        },
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    logger.error('Route params validation error:', { error });
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate route parameters',
      },
    };
  }
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(error: ValidationError): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: 400 },
  );
}

/**
 * 通用的查询参数验证 Schema
 */
export const commonQuerySchema = {
  instanceId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  cursor: z.coerce.number().optional(),
};

/**
 * 分页参数验证 Schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

/**
 * 时间范围参数验证 Schema
 */
export const timeRangeSchema = z.object({
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
});
