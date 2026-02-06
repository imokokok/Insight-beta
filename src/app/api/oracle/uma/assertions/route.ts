import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { handleApi, rateLimit } from '@/server/apiResponse';
import { listUMAAssertions } from '@/server/oracle/umaState';

const RATE_LIMITS = {
  GET: { key: 'uma_assertions_get', limit: 120, windowMs: 60_000 },
  POST: { key: 'uma_assertions_post', limit: 30, windowMs: 60_000 },
} as const;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId') || 'uma-mainnet';
      const status = url.searchParams.get('status') as
        | 'Requested'
        | 'Proposed'
        | 'Disputed'
        | 'Settled'
        | null;
      const identifier = url.searchParams.get('identifier') || undefined;
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { assertions, total } = await listUMAAssertions({
        instanceId,
        status: status || undefined,
        identifier,
        limit,
        offset,
      });

      const durationMs = Date.now() - startTime;
      logger.debug('UMA assertions fetched', {
        requestId,
        instanceId,
        count: assertions.length,
        durationMs,
      });

      return {
        items: assertions,
        total,
        limit,
        offset,
        instanceId,
      };
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('UMA assertions GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}
