/**
 * Database Access Layer
 *
 * 统一的数据库访问层，封装 Supabase Client 操作
 * 提供类型安全的数据访问方法
 */

import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { TypedSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

// ============================================================================
// 类型导出
// ============================================================================

export type { Database } from '@/types/supabase';

// 辅助类型
export type TableName = keyof Database['public']['Tables'];
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

// ============================================================================
// 通用 CRUD 操作
// ============================================================================

/**
 * 通用查询构建器
 */
export class QueryBuilder<T extends TableName> {
  constructor(
    private table: T,
    private client: TypedSupabaseClient = supabaseAdmin,
  ) {}

  /**
   * 查询单条记录
   */
  async findOne(filters: Partial<TableRow<T>>): Promise<TableRow<T> | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = this.client.from(this.table).select('*') as any;

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key as keyof TableRow<T>, value);
    });

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No data found
      }
      logger.error(`Failed to findOne in ${String(this.table)}`, { error });
      throw error;
    }

    return data as unknown as TableRow<T>;
  }

  /**
   * 查询多条记录
   */
  async findMany(
    options: {
      filters?: Partial<TableRow<T>>;
      orderBy?: { column: keyof TableRow<T>; ascending?: boolean };
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<TableRow<T>[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = this.client.from(this.table).select('*') as any;

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key as keyof TableRow<T>, value);
      });
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column as string, {
        ascending: options.orderBy.ascending ?? false,
      });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error(`Failed to findMany in ${String(this.table)}`, { error });
      throw error;
    }

    return (data || []) as unknown as TableRow<T>[];
  }

  /**
   * 插入记录
   */
  async insert(data: TableInsert<T>): Promise<TableRow<T>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (this.client.from(this.table).insert(data as any) as any)
      .select()
      .single();

    if (error) {
      logger.error(`Failed to insert into ${String(this.table)}`, { error });
      throw error;
    }

    return result as unknown as TableRow<T>;
  }

  /**
   * 批量插入
   */
  async insertMany(data: TableInsert<T>[]): Promise<TableRow<T>[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (
      this.client.from(this.table).insert(data as any) as any
    ).select();

    if (error) {
      logger.error(`Failed to insertMany into ${String(this.table)}`, { error });
      throw error;
    }

    return (result || []) as unknown as TableRow<T>[];
  }

  /**
   * 更新记录
   */
  async update(filters: Partial<TableRow<T>>, data: Partial<TableRow<T>>): Promise<TableRow<T>[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = this.client.from(this.table).update(data as any) as any;

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key as keyof TableRow<T>, value);
    });

    const { data: result, error } = await query.select();

    if (error) {
      logger.error(`Failed to update ${String(this.table)}`, { error });
      throw error;
    }

    return (result || []) as unknown as TableRow<T>[];
  }

  /**
   * Upsert 记录
   */
  async upsert(data: TableInsert<T>, conflictColumns: (keyof TableRow<T>)[]): Promise<TableRow<T>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (
      this.client
        .from(this.table)
        .upsert(data as any, { onConflict: conflictColumns.join(',') }) as any
    )
      .select()
      .single();

    if (error) {
      logger.error(`Failed to upsert into ${String(this.table)}`, { error });
      throw error;
    }

    if (!result) {
      throw new Error(`Upsert returned no data for table ${String(this.table)}`);
    }

    return result as unknown as TableRow<T>;
  }

  /**
   * 删除记录
   */
  async delete(filters: Partial<TableRow<T>>): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = this.client.from(this.table).delete() as any;

    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key as keyof TableRow<T>, value);
    });

    const { error } = await query;

    if (error) {
      logger.error(`Failed to delete from ${String(this.table)}`, { error });
      throw error;
    }
  }

  /**
   * 计数
   */
  async count(filters?: Partial<TableRow<T>>): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = this.client.from(this.table).select('*', { count: 'exact', head: true }) as any;

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key as keyof TableRow<T>, value);
      });
    }

    const { count, error } = await query;

    if (error) {
      logger.error(`Failed to count ${String(this.table)}`, { error });
      throw error;
    }

    return count || 0;
  }
}

// ============================================================================
// 表特定的查询构建器
// ============================================================================

/**
 * 价格历史查询
 */
export const priceHistory = {
  raw: new QueryBuilder('price_history_raw'),
  min1: new QueryBuilder('price_history_min1'),
  min5: new QueryBuilder('price_history_min5'),
  hour1: new QueryBuilder('price_history_hour1'),
  day1: new QueryBuilder('price_history_day1'),
};

/**
 * Solana 数据查询
 */
export const solana = {
  priceFeeds: new QueryBuilder('solana_price_feeds'),
  priceHistories: new QueryBuilder('solana_price_histories'),
  oracleInstances: new QueryBuilder('solana_oracle_instances'),
  syncStatus: new QueryBuilder('solana_sync_status'),
  alerts: new QueryBuilder('solana_alerts'),
};

/**
 * SLO 数据查询
 */
export const slo = {
  definitions: new QueryBuilder('slo_definitions'),
  metrics: new QueryBuilder('slo_metrics'),
  errorBudgets: new QueryBuilder('error_budgets'),
};

/**
 * 统一预言机数据查询
 */
export const unified = {
  oracleInstances: new QueryBuilder('unified_oracle_instances'),
  priceFeeds: new QueryBuilder('unified_price_feeds'),
  priceUpdates: new QueryBuilder('unified_price_updates'),
  assertions: new QueryBuilder('unified_assertions'),
  disputes: new QueryBuilder('unified_disputes'),
  syncState: new QueryBuilder('unified_sync_state'),
  statistics: new QueryBuilder('unified_statistics'),
  alertRules: new QueryBuilder('unified_alert_rules'),
  alerts: new QueryBuilder('unified_alerts'),
  configTemplates: new QueryBuilder('unified_config_templates'),
  protocols: new QueryBuilder('oracle_protocols_info'),
};

/**
 * 价格操纵检测查询
 */
export const manipulation = {
  detections: new QueryBuilder('manipulation_detections'),
  config: new QueryBuilder('detection_config'),
  blockedFeeds: new QueryBuilder('blocked_feeds'),
  logs: new QueryBuilder('monitoring_logs'),
};

/**
 * 事件查询
 */
export const events = {
  timeline: new QueryBuilder('event_timeline'),
  deployments: new QueryBuilder('deployment_records'),
};

// ============================================================================
// 原始 Supabase Client 导出
// ============================================================================

export { supabaseAdmin } from '@/lib/supabase/server';

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 执行原始 SQL 查询（谨慎使用）
 */
export async function executeRawQuery<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const { data, error } = await (
    supabaseAdmin as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>;
    }
  ).rpc('execute_sql', {
    query: sql,
    params: params || [],
  });

  if (error) {
    logger.error('Failed to execute raw query', { error, sql });
    throw error;
  }

  return (data || []) as T[];
}

/**
 * 批量操作（事务）
 */
export async function withTransaction<T>(
  operations: (client: TypedSupabaseClient) => Promise<T>,
): Promise<T> {
  // Note: Supabase 目前不直接支持客户端事务
  // 这里是一个占位符，实际使用时可能需要使用数据库函数
  return operations(supabaseAdmin);
}

/**
 * 订阅表变化
 */
export function subscribeToTable<T extends TableName>(
  table: T,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: TableRow<T> | null;
    old: TableRow<T> | null;
  }) => void,
  filter?: { column: string; value: string },
) {
  const channel = supabaseAdmin.channel(`${String(table)}_changes`).on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: table as string,
      filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
    },
    (payload) => {
      callback({
        eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        new: payload.new as TableRow<T> | null,
        old: payload.old as TableRow<T> | null,
      });
    },
  );

  channel.subscribe();

  return {
    unsubscribe: () => channel.unsubscribe(),
  };
}
