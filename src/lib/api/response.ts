/**
 * API Response Utilities
 *
 * 统一的API响应处理工具
 * - 提供标准的响应类型定义
 * - 提供统一的响应创建函数
 * - 提供错误响应处理
 */

import { NextResponse } from 'next/server';

// ============================================================================
// 响应类型
// ============================================================================

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建成功响应
 * @param data 响应数据
 * @param page 页码（用于分页）
 * @param limit 每页数量（用于分页）
 * @param total 总数量（用于分页）
 * @returns 标准API响应对象
 */
export function createResponse<T>(data: T, page?: number, limit?: number, total?: number): ApiResponse<T> {
  const response: ApiResponse<T> = {
    ok: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  if (page !== undefined) {
    response.meta!.page = page;
    response.meta!.limit = limit;
    response.meta!.total = total;
    response.meta!.hasMore = total !== undefined ? page * limit! < total : false;
  }

  return response;
}

/**
 * 创建错误响应
 * @param error 错误信息
 * @param status HTTP状态码
 * @returns NextResponse对象
 */
export function createErrorResponse(error: string, status: number = 400): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * 创建成功的NextResponse
 * @param data 响应数据
 * @param page 页码（用于分页）
 * @param limit 每页数量（用于分页）
 * @param total 总数量（用于分页）
 * @returns NextResponse对象
 */
export function createSuccessResponse<T>(data: T, page?: number, limit?: number, total?: number): NextResponse {
  const response = createResponse(data, page, limit, total);
  return NextResponse.json(response);
}

/**
 * 处理API请求错误
 * @param errorMessage 错误信息
 * @param status HTTP状态码
 * @returns NextResponse对象
 */
export function handleApiError(errorMessage: string, status: number = 500): NextResponse {
  return createErrorResponse(errorMessage, status);
}
