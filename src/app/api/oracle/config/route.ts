import { NextResponse } from 'next/server';

import { withCacheHeaders, CACHE_PRESETS } from '@/lib/api/cache';

export async function GET() {
  const response = NextResponse.json({
    mode: 'real',
    chains: [],
    syncInterval: 30000,
  });
  return withCacheHeaders(response, CACHE_PRESETS.long);
}
