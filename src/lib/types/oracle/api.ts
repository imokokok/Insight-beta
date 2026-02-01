/**
 * API Types - API 响应相关类型定义
 */

export type ApiOk<T extends Record<string, unknown>> = { ok: true } & T;

export type ApiError = {
  ok: false;
  error: string | { code: string; details?: unknown };
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type ApiResponse<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export type ListResult<T> = {
  items: T[];
  total: number;
  nextCursor: number | null;
};
