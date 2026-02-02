/**
 * Supabase Server Client
 * 
 * Server-side Supabase client for API routes
 */

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

// Simple Supabase client mock for development
// In production, replace with actual @supabase/supabase-js
class SimpleSupabaseClient {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
  }

  from(table: string) {
    return new SupabaseQueryBuilder(table);
  }
}

class SupabaseQueryBuilder {
  private table: string;
  private filters: Array<{ column: string; operator: string; value: unknown }> = [];
  private selectColumns = '*';
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private rangeConfig: { start: number; end: number } | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string, options?: { count: string; head: boolean }) {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  order(column: string, { ascending }: { ascending: boolean }) {
    this.orderConfig = { column, ascending };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(start: number, end: number) {
    this.rangeConfig = { start, end };
    return this;
  }

  single() {
    this.limitCount = 1;
    return this;
  }

  async single() {
    // Return mock data for development
    return {
      data: null,
      error: { code: 'PGRST116', message: 'No data found' },
    };
  }

  async then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    // Mock implementation - return empty data
    const result = { data: null, error: null };
    
    if (onfulfilled) {
      try {
        return await onfulfilled(result as { data: unknown; error: null });
      } catch (error) {
        if (onrejected) {
          return await onrejected(error);
        }
        throw error;
      }
    }
    
    return result as TResult1;
  }
}

export function createSupabaseClient() {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Missing Supabase environment variables, using mock client');
    return new SimpleSupabaseClient('http://localhost:54321', 'mock-key') as unknown as ReturnType<typeof createSupabaseClient>;
  }

  // Try to use actual supabase client if available
  try {
    // Dynamic import to avoid build errors if package not installed
    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch {
    logger.warn('@supabase/supabase-js not installed, using mock client');
    return new SimpleSupabaseClient(supabaseUrl, supabaseKey) as unknown as ReturnType<typeof createSupabaseClient>;
  }
}
