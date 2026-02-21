/**
 * API Handler Utilities
 *
 * API 路由的统一错误处理和响应格式化工具
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * API 错误对象格式
 */
export interface ApiErrorObject {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * API 响应格式（新格式）
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorObject;
  meta?: Record<string, unknown>;
}

/**
 * 旧版 API 响应格式（向后兼容）
 * @deprecated 使用 ApiResponse 代替
 */
export interface LegacyApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * 创建成功的 API 响应
 *
 * @param data - 响应数据
 * @param status - HTTP 状态码，默认 200
 * @returns NextResponse
 *
 * @example
 * ```typescript
 * return apiSuccess({ gasPrice: 100 });
 * return apiSuccess({ gasPrice: 100 }, 201);
 * ```
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    } satisfies ApiResponse<T>,
    { status },
  );
}

/**
 * 创建错误的 API 响应
 *
 * @param code - 错误代码
 * @param message - 错误信息
 * @param status - HTTP 状态码，默认 500
 * @param details - 额外错误详情
 * @returns NextResponse
 *
 * @example
 * ```typescript
 * return apiError('VALIDATION_ERROR', 'Chain parameter is required', 400);
 * return apiError('INTERNAL_ERROR', 'Internal server error', 500);
 * ```
 */
export function apiError(
  code: string,
  message: string,
  status: number = 500,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
    } satisfies ApiResponse,
    { status },
  );
}

/**
 * API 路由处理函数类型
 */
export type ApiRouteHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * 带错误处理的 API 路由包装器
 *
 * 自动捕获处理函数中的错误并返回统一格式的错误响应
 *
 * @param handler - API 路由处理函数
 * @returns 包装后的处理函数
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (request: NextRequest) => {
 *   const data = await fetchData();
 *   return apiSuccess(data);
 * });
 * ```
 */
export function getQueryParam(request: NextRequest, key: string): string | null {
  return request.nextUrl.searchParams.get(key);
}
