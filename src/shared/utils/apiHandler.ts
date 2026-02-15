/**
 * API Handler Utilities
 *
 * API 路由的统一错误处理和响应格式化工具
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * API 响应格式
 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * API 错误响应选项
 */
export interface ApiErrorOptions {
  status?: number;
  message?: string;
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
      ok: true,
      data,
    } satisfies ApiResponse<T>,
    { status },
  );
}

/**
 * 创建错误的 API 响应
 *
 * @param message - 错误信息
 * @param status - HTTP 状态码，默认 500
 * @returns NextResponse
 *
 * @example
 * ```typescript
 * return apiError('Chain parameter is required', 400);
 * return apiError('Internal server error', 500);
 * ```
 */
export function apiError(message: string, status: number = 500): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: message,
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
