import type { NextRequest } from 'next/server';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { gasPriceService } from '@/services/gas';
import { apiSuccess, apiError, getRequiredQueryParam } from '@/shared/utils';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

async function handleGet(request: NextRequest) {
  const chain = getRequiredQueryParam(request, 'chain') as SupportedChain | null;
  const provider = getRequiredQueryParam(request, 'provider') as
    | 'etherscan'
    | 'gasnow'
    | 'blocknative'
    | 'ethgasstation'
    | 'gasprice'
    | null;
  const priceLevel = getRequiredQueryParam(request, 'priceLevel') as
    | 'slow'
    | 'average'
    | 'fast'
    | 'fastest'
    | null;

  if (!chain) {
    return apiError('Chain parameter is required', 400);
  }

  if (!provider) {
    return apiError('Provider parameter is required', 400);
  }

  if (!priceLevel) {
    return apiError('Price level parameter is required', 400);
  }

  const statistics = gasPriceService.getStatistics(chain, provider, priceLevel);

  return apiSuccess(statistics);
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
