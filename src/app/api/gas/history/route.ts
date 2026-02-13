import type { NextRequest } from 'next/server';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { gasPriceService } from '@/services/gas';
import { apiSuccess, getQueryParam, getRequiredQueryParam } from '@/shared/utils';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

async function handleGet(request: NextRequest) {
  const chain = getRequiredQueryParam(request, 'chain') as SupportedChain;
  const provider = getQueryParam(request, 'provider') as
    | 'etherscan'
    | 'gasnow'
    | 'blocknative'
    | 'ethgasstation'
    | 'gasprice'
    | null;
  const limitParam = getQueryParam(request, 'limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  const history = gasPriceService.getHistory(chain, provider ?? undefined, Math.min(limit, 1000));

  return apiSuccess({
    history,
    meta: {
      count: history.length,
      chain,
      provider,
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
