import { z } from 'zod';

import type { ChainStatusData, ChainStatusResponse } from '@/features/cross-chain/types';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess, apiError } from '@/shared/utils';

const ChainStatusQuerySchema = z.object({
  chain: z.string().optional(),
});

const CHAIN_CONFIG: Record<string, { displayName: string; baseResponseMs: number }> = {
  ethereum: { displayName: 'Ethereum', baseResponseMs: 250 },
  bsc: { displayName: 'BSC', baseResponseMs: 180 },
  polygon: { displayName: 'Polygon', baseResponseMs: 200 },
  avalanche: { displayName: 'Avalanche', baseResponseMs: 150 },
  arbitrum: { displayName: 'Arbitrum', baseResponseMs: 120 },
  optimism: { displayName: 'Optimism', baseResponseMs: 110 },
  base: { displayName: 'Base', baseResponseMs: 100 },
};

function generateChainStatusData(chain?: string): ChainStatusResponse {
  let chainKeys = Object.keys(CHAIN_CONFIG);
  if (chain) {
    chainKeys = chainKeys.filter((c) => c === chain.toLowerCase());
  }

  const timestamp = new Date().toISOString();

  const chains: ChainStatusData[] = chainKeys.map((chainKey) => {
    const config = CHAIN_CONFIG[chainKey]!;
    const responseTimeMs = config.baseResponseMs * (0.8 + Math.random() * 0.4);
    const staleMinutes = Math.random() < 0.8 ? Math.random() * 3 : 5 + Math.random() * 25;
    const status = staleMinutes < 5 ? 'healthy' : staleMinutes < 30 ? 'degraded' : 'offline';
    const dataFreshness = staleMinutes < 5 ? 'fresh' : staleMinutes < 30 ? 'stale' : 'unknown';

    return {
      chain: chainKey,
      displayName: config.displayName,
      status,
      responseTimeMs: Math.round(responseTimeMs),
      staleMinutes: Math.round(staleMinutes),
      lastPriceTimestamp: new Date(Date.now() - staleMinutes * 60 * 1000).toISOString(),
      dataFreshness,
    };
  });

  const healthyChains = chains.filter((c) => c.status === 'healthy').length;
  const degradedChains = chains.filter((c) => c.status === 'degraded').length;
  const offlineChains = chains.filter((c) => c.status === 'offline').length;
  const totalChains = chains.length;
  const avgResponseTimeMs =
    chains.length > 0
      ? Math.round(chains.reduce((sum, c) => sum + c.responseTimeMs, 0) / chains.length)
      : 0;
  const healthRate = totalChains > 0 ? (healthyChains / totalChains) * 100 : 0;

  return {
    success: true,
    chains,
    summary: {
      totalChains,
      healthyChains,
      degradedChains,
      offlineChains,
      avgResponseTimeMs,
      healthRate,
      lastUpdated: timestamp,
    },
    meta: {
      timestamp,
      dataSource: 'mock',
    },
  };
}

async function handleGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = ChainStatusQuerySchema.parse({
      chain: searchParams.get('chain') || undefined,
    });

    const data = generateChainStatusData(query.chain);

    return apiSuccess(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        'VALIDATION_ERROR',
        `Invalid query parameters: ${error.errors.map((e) => e.message).join(', ')}`,
        400,
      );
    }
    throw error;
  }
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
