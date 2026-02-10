/**
 * Supabase Browser Client
 *
 * Client-side Supabase client for React components
 * 使用 Anon Key 进行客户端操作，受 RLS 策略限制
 */

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

import type { SupabaseClient } from '@supabase/supabase-js';

// 类型化的 Supabase 客户端
export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * 创建浏览器端 Supabase 客户端（使用 Anon Key）
 * 用于：React Components、Client-side data fetching
 *
 * 注意：此函数应在组件内或 useEffect 中调用，避免 SSR 问题
 */
export function createBrowserClient(): TypedSupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Supabase 客户端单例（浏览器端）
 * 注意：仅在客户端使用，避免在服务端导入
 */
let browserClient: TypedSupabaseClient | null = null;

export function getSupabaseBrowserClient(): TypedSupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient should only be called on the client side');
  }

  if (!browserClient) {
    browserClient = createBrowserClient();
  }

  return browserClient;
}
