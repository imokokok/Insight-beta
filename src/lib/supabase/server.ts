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

export type TypedSupabaseClient = SupabaseClient<Database>;

export const SUPABASE_ERROR_CODES = {
  NO_DATA: 'PGRST116',
  DUPLICATE_KEY: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
} as const;

/**
 * 创建 Mock Supabase 客户端（使用 Proxy 实现）
 */
function createMockClient(): TypedSupabaseClient {
  const createMockChain = () => {
    const chain: Record<string, unknown> = {};

    const methods = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'like', 'ilike', 'is', 'not', 'or', 'and'];
    const terminators = ['single', 'maybeSingle', 'limit', 'order', 'range', 'abortSignal'];

    methods.forEach((method) => {
      chain[method] = (..._args: unknown[]) => createMockChain();
    });

    terminators.forEach((method) => {
      chain[method] = (..._args: unknown[]) => {
        if (method === 'single' || method === 'maybeSingle') {
          return Promise.resolve({
            data: null,
            error: { code: SUPABASE_ERROR_CODES.NO_DATA, message: 'No data found' },
          });
        }
        return createMockChain();
      };
    });

    chain['data'] = [];
    chain['error'] = null;

    return chain;
  };

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'from') {
        return () => ({
          select: () => createMockChain(),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
          upsert: () => Promise.resolve({ data: null, error: null }),
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        });
      }

      if (prop === 'channel') {
        return () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        });
      }

      if (prop === 'rpc') {
        return () => Promise.resolve({ data: null, error: null });
      }

      return undefined;
    },
  };

  return new Proxy({}, handler) as unknown as TypedSupabaseClient;
}

/**
 * 创建服务端 Supabase 客户端（使用 Service Role Key）
 * 用于：API Routes、Server Actions、Background Jobs
 */
export function createSupabaseClient(): TypedSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Missing Supabase environment variables, using mock client');
    return createMockClient();
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
    return createMockClient();
  }
}

/**
 * 服务端 Supabase 客户端单例
 * 在服务端代码中直接使用此实例
 */
export const supabaseAdmin = createSupabaseClient();
