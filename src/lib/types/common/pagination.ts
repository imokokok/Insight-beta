/**
 * Pagination Types - 统一分页类型定义
 *
 * 集中管理所有分页相关的类型定义，避免重复
 */

// ============================================================================
// 分页参数
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export type PaginationParamsInput = PaginationParams | { page?: number; limit?: number; cursor?: string };

// ============================================================================
// 分页元数据
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  cursor?: string;
  nextCursor?: string;
}

// ============================================================================
// 分页结果
// ============================================================================

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// 游标分页
// ============================================================================

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// ============================================================================
// 偏移分页
// ============================================================================

export interface OffsetPaginationParams {
  offset?: number;
  limit?: number;
}

export interface OffsetPaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// 分页状态
// ============================================================================

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

export interface InfiniteScrollState<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  cursor: string | null;
}

// ============================================================================
// 分页工具函数
// ============================================================================

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextCursor: page < totalPages ? String(page + 1) : undefined,
  };
}

export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function getNextPage(meta: PaginationMeta): number | null {
  return meta.hasNext ? meta.page + 1 : null;
}

export function getPreviousPage(meta: PaginationMeta): number | null {
  return meta.hasPrev ? meta.page - 1 : null;
}

export function isValidPage(page: number, totalPages: number): boolean {
  return page >= 1 && page <= totalPages;
}

// ============================================================================
// 类型guards
// ============================================================================

export function isCursorPagination(
  params: PaginationParamsInput,
): params is CursorPaginationParams {
  return 'cursor' in params && params.cursor !== undefined;
}

export function isOffsetPagination(
  params: PaginationParamsInput,
): params is OffsetPaginationParams {
  return 'offset' in params && params.offset !== undefined;
}
