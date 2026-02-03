/**
 * Supabase Server Client
 *
 * Server-side Supabase client for API routes
 */

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseClient(): any {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Missing Supabase environment variables, using mock client');
    return createMockClient();
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
    });
  } catch {
    logger.warn('@supabase/supabase-js not installed, using mock client');
    return createMockClient();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockClient(): any {
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
