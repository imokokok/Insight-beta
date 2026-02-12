/**
 * API Types - API 请求和响应类型
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
}
