import type { NextRequest } from 'next/server';
import { listUMAAssertions, listUMADisputes } from '@/server/oracle/umaState';
import { handleApi, rateLimit } from '@/server/apiResponse';
import { logger } from '@/lib/logger';

const RATE_LIMITS = {
  GET: { key: 'uma_stats_get', limit: 60, windowMs: 60_000 },
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
      const hours = parseInt(url.searchParams.get('hours') || '24');

      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const [disputesResult, allAssertions, recentAssertions] = await Promise.all([
        listUMADisputes({ instanceId, status: 'Voting', limit: 1000 }),
        listUMAAssertions({ instanceId, limit: 100000 }),
        listUMAAssertions({ instanceId, limit: 10000 }),
      ]);

      const stats = {
        instanceId,
        period: { hours },
        generatedAt: new Date().toISOString(),
        assertions: {
          total: allAssertions.total,
          proposed: 0,
          disputed: 0,
          settled: 0,
          recentCount: recentAssertions.assertions.filter((a) => a.proposedAt > cutoffTime).length,
          volume: 0,
        },
        disputes: {
          total: disputesResult.total,
          active: disputesResult.total,
          recentCount: 0,
        },
        chains: {} as Record<string, { assertions: number; disputes: number }>,
      };

      for (const assertion of allAssertions.assertions) {
        if (assertion.status === 'Proposed') stats.assertions.proposed++;
        else if (assertion.status === 'Disputed') stats.assertions.disputed++;
        else if (assertion.status === 'Settled') stats.assertions.settled++;

        if (assertion.reward) {
          stats.assertions.volume += Number(assertion.reward) / 1e18;
        }

        const chainKey = assertion.chain;
        if (!stats.chains[chainKey]) {
          stats.chains[chainKey] = { assertions: 0, disputes: 0 };
        }
        stats.chains[chainKey].assertions++;
      }

      for (const dispute of disputesResult.disputes) {
        const chainKey = dispute.chain;
        if (!stats.chains[chainKey]) {
          stats.chains[chainKey] = { assertions: 0, disputes: 0 };
        }
        stats.chains[chainKey].disputes++;
      }

      const durationMs = Date.now() - startTime;
      logger.debug('UMA stats fetched', { requestId, instanceId, durationMs });

      return stats;
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('UMA stats GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}
