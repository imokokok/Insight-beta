/**
 * Supabase Server Client
 *
 * Server-side Supabase client for API routes
 */

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

import type { SupabaseClient } from '@supabase/supabase-js';

// 简化的 Supabase 客户端类型
export type TypedSupabaseClient = SupabaseClient;

export function createSupabaseClient(): TypedSupabaseClient {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Missing Supabase environment variables, using mock client');
    return createMockClient() as unknown as TypedSupabaseClient;
  }

  // Try to use actual supabase client if available
  try {
    // Dynamic import to avoid build errors if package not installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as TypedSupabaseClient;
  } catch {
    logger.warn('@supabase/supabase-js not installed, using mock client');
    return createMockClient() as unknown as TypedSupabaseClient;
  }
}

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
};

function createMockClient(): MockSupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: { code: 'PGRST116', message: 'No data found' },
          }),
        }),
        order: () => ({
          limit: () => ({
            single: async () => ({
              data: null,
              error: { code: 'PGRST116', message: 'No data found' },
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
  };
}
