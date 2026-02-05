/**
 * 通用列表查询处理器
 * 统一处理所有列表查询 API 的重复逻辑
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';
import { rateLimit } from './rateLimit';
import { requireAdmin } from './admin';
import { cachedJson } from './cache';
import { handleApi } from './handleApi';
import { isCronAuthorized } from '@/server/cronAuth';

// ============================================================================
// 通用列表查询参数 Schema
// ============================================================================

export const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.coerce.number().min(0).default(0),
  sync: z.enum(['0', '1']).optional(),
  instanceId: z.string().optional().nullable(),
  q: z.string().optional().nullable(),
});

export type ListQueryParams = z.infer<typeof listQuerySchema>;

// ============================================================================
// 列表查询配置接口
// ============================================================================

export interface ListHandlerConfig<T, F extends ListQueryParams> {
  /** 限流配置 */
  rateLimitConfig: {
    key: string;
    limit: number;
    windowMs: number;
  };

  /** 缓存配置 */
  cacheConfig?: {
    ttlMs: number;
    keyPrefix?: string;
  };

  /** 参数验证 Schema（扩展基础 schema） */
  paramsSchema?: z.ZodType<Omit<F, keyof ListQueryParams>>;

  /** 是否需要管理员权限才能 sync */
  requireAdminForSync?: boolean;

  /** 同步函数 */
  syncFn?: (instanceId?: string) => Promise<void>;

  /** 数据查询函数 */
  fetchFn: (
    params: F,
    instanceId?: string,
  ) => Promise<{
    items: T[];
    total: number;
    nextCursor: number | null;
  }>;

  /** 响应转换函数（可选） */
  transformResponse?: (data: {
    items: T[];
    total: number;
    nextCursor: number | null;
  }) => Record<string, unknown>;
}

// ============================================================================
// 创建通用列表查询处理器
// ============================================================================

export function createListHandler<T, F extends ListQueryParams>(config: ListHandlerConfig<T, F>) {
  return async function handler(request: Request): Promise<Response> {
    return handleApi(request, async () => {
      // 1. 限流检查
      const limited = await rateLimit(request, config.rateLimitConfig);
      if (limited) return limited as Response;

      const url = new URL(request.url);
      const rawParams = Object.fromEntries(url.searchParams);
      const instanceId = url.searchParams.get('instanceId')?.trim() || undefined;

      // 2. 参数验证
      const baseParams = listQuerySchema.parse(rawParams);
      const extraParams = config.paramsSchema
        ? config.paramsSchema.parse(rawParams)
        : ({} as Omit<F, keyof ListQueryParams>);
      const params = { ...baseParams, ...extraParams } as F;

      // 3. 处理强制同步
      if (params.sync === '1' && config.syncFn) {
        const isCron = isCronAuthorized(request);
        if (!isCron && config.requireAdminForSync !== false) {
          const auth = await requireAdmin(request, {
            strict: true,
            scope: 'oracle_sync_trigger',
          });
          if (auth) return auth;
        }
        await config.syncFn(instanceId);
      }

      // 4. 数据查询
      const compute = async () => {
        const result = await config.fetchFn(params, instanceId);
        return config.transformResponse ? config.transformResponse(result) : result;
      };

      // 5. 直接返回（如果是 sync 模式）
      if (params.sync === '1') {
        const result = await compute();
        return NextResponse.json({ success: true, ...result });
      }

      // 6. 缓存包装
      if (config.cacheConfig) {
        const cacheKey = config.cacheConfig.keyPrefix
          ? `${config.cacheConfig.keyPrefix}:${url.search}`
          : `oracle_api:${url.pathname}${url.search}`;
        return cachedJson(cacheKey, config.cacheConfig.ttlMs, compute);
      }

      const result = await compute();
      return NextResponse.json({ success: true, ...result });
    });
  };
}

// ============================================================================
// 便捷函数：创建标准列表处理器
// ============================================================================

export interface StandardListConfig<T> {
  /** 路由路径（用于限流键和缓存键） */
  path: string;
  /** 数据查询函数 */
  fetchFn: (
    params: ListQueryParams,
    instanceId?: string,
  ) => Promise<{
    items: T[];
    total: number;
    nextCursor: number | null;
  }>;
  /** 同步函数（可选） */
  syncFn?: (instanceId?: string) => Promise<void>;
  /** 缓存时间（毫秒，默认 5000） */
  cacheTtlMs?: number;
  /** 限流配置（可选） */
  rateLimit?: {
    limit?: number;
    windowMs?: number;
  };
}

/**
 * 创建标准列表处理器（使用默认配置）
 */
export function createStandardListHandler<T>(config: StandardListConfig<T>) {
  return createListHandler<T, ListQueryParams>({
    rateLimitConfig: {
      key: `${config.path.replace(/\//g, '_')}_get`,
      limit: config.rateLimit?.limit ?? 120,
      windowMs: config.rateLimit?.windowMs ?? 60_000,
    },
    cacheConfig: {
      ttlMs: config.cacheTtlMs ?? 5_000,
      keyPrefix: config.path.replace(/\//g, '_'),
    },
    syncFn: config.syncFn,
    fetchFn: config.fetchFn,
  });
}
