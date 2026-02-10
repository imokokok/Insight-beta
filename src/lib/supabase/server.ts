/**
 * Supabase Server Client
 *
 * Server-side Supabase client for API routes and server functions
 * 使用 Service Role Key 进行服务端操作
 */

import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

import type { SupabaseClient } from '@supabase/supabase-js';

// 类型化的 Supabase 客户端
export type TypedSupabaseClient = SupabaseClient<Database>;

// Supabase 错误代码常量
export const SUPABASE_ERROR_CODES = {
  NO_DATA: 'PGRST116',
  DUPLICATE_KEY: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
} as const;

/**
 * 创建服务端 Supabase 客户端（使用 Service Role Key）
 * 用于：API Routes、Server Actions、Background Jobs
 */
export function createSupabaseClient(): TypedSupabaseClient {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Missing Supabase environment variables, using mock client');
    return createMockClient() as unknown as TypedSupabaseClient;
  }

  try {
    return createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch {
    logger.warn('@supabase/supabase-js not installed, using mock client');
    return createMockClient() as unknown as TypedSupabaseClient;
  }
}

/**
 * 服务端 Supabase 客户端单例
 * 在服务端代码中直接使用此实例
 */
export const supabaseAdmin = createSupabaseClient();

/**
 * 检查 Supabase 连接是否健康
 */
export async function checkSupabaseHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabaseAdmin.from('oracle_protocols_info').select('id').limit(1);

    if (error) {
      return { healthy: false, error: error.message };
    }

    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Mock client types
type MockQueryBuilder = {
  eq: () => { single: () => Promise<{ data: null; error: { code: string; message: string } }> };
  order: () => {
    limit: () => {
      single: () => Promise<{ data: null; error: { code: string; message: string } }>;
    };
  };
  gte: () => { order: () => { data: []; error: null } };
  lte: () => { data: []; error: null };
  data: [];
  error: null;
};

type MockSupabaseClient = {
  from: () => {
    select: () => MockQueryBuilder;
    insert: () => { data: null; error: null };
    update: () => { eq: () => { data: null; error: null } };
    upsert: () => { data: null; error: null };
    delete: () => { eq: () => { data: null; error: null } };
  };
  channel: () => {
    on: () => { subscribe: () => { unsubscribe: () => void } };
  };
  rpc: () => Promise<{ data: null; error: null }>;
};

function createMockClient(): MockSupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: { code: SUPABASE_ERROR_CODES.NO_DATA, message: 'No data found' },
          }),
        }),
        order: () => ({
          limit: () => ({
            single: async () => ({
              data: null,
              error: { code: SUPABASE_ERROR_CODES.NO_DATA, message: 'No data found' },
            }),
          }),
        }),
        gte: () => ({ order: () => ({ data: [], error: null }) }),
        lte: () => ({ data: [], error: null }),
        data: [],
        error: null,
      }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ data: null, error: null }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  };
}
