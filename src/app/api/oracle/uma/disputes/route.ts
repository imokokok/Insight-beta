import type { NextRequest } from 'next/server';
import { listUMADisputes } from '@/server/oracle/umaState';
import { handleApi, rateLimit } from '@/server/apiResponse';
import { logger } from '@/lib/logger';

const RATE_LIMITS = {
  GET: { key: 'uma_disputes_get', limit: 120, windowMs: 60_000 },
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
      const status = url.searchParams.get('status') as 'Voting' | 'Executed' | 'Dismissed' | null;
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { disputes, total } = await listUMADisputes({
        instanceId,
        status: status || undefined,
        limit,
        offset,
      });

      const durationMs = Date.now() - startTime;
      logger.debug('UMA disputes fetched', {
        requestId,
        instanceId,
        count: disputes.length,
        durationMs,
      });

      return {
        items: disputes,
        total,
        limit,
        offset,
        instanceId,
      };
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('UMA disputes GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}
