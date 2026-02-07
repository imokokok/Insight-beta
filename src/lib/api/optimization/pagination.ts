/**
 * Pagination - 统一分页处理
 */

import { z } from 'zod';

import type { PaginatedResult } from '@/lib/types';

// ============================================================================
// 分页 Schema
// ============================================================================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ============================================================================
// 分页计算
// ============================================================================

export interface PaginationInput {
  page: number;
  limit: number;
  total: number;
}

export interface PaginationOutput {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  skip: number;
  take: number;
}

export function calculatePagination(input: PaginationInput): PaginationOutput {
  const { page, limit, total } = input;
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const skip = (page - 1) * limit;
  const take = limit;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    skip,
    take,
  };
}

// ============================================================================
// 分页结果构建
// ============================================================================

export function createPaginatedResult<T>(
  data: T[],
  pagination: PaginationOutput,
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
    },
  };
}

// ============================================================================
// Prisma 分页辅助
// ============================================================================

export interface PrismaPaginationOptions {
  page?: number;
  limit?: number;
  cursor?: { id: string };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function buildPrismaPagination(options: PrismaPaginationOptions): {
  skip?: number;
  take: number;
  cursor?: { id: string };
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const { page = 1, limit = 20, cursor, sortBy, sortOrder = 'desc' } = options;

  const result: ReturnType<typeof buildPrismaPagination> = {
    take: limit,
  };

  if (cursor) {
    result.cursor = cursor;
    result.skip = 1; // 跳过游标项
  } else {
    result.skip = (page - 1) * limit;
  }

  if (sortBy) {
    result.orderBy = { [sortBy]: sortOrder };
  }

  return result;
}

// ============================================================================
// 分页验证
// ============================================================================

export function validatePagination(params: unknown): { page: number; limit: number } {
  const result = PaginationQuerySchema.safeParse(params);

  if (!result.success) {
    // 返回默认值
    return { page: 1, limit: 20 };
  }

  return {
    page: result.data.page,
    limit: result.data.limit,
  };
}
