/**
 * Supabase Server Client
 * 
 * Server-side Supabase client for API routes
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/config/env';

export function createSupabaseClient() {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
