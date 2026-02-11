import type { NextRequest } from 'next/server';

import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import {
  apiSuccess,
  apiError,
  withErrorHandler,
  getRequiredQueryParam,
} from '@/lib/utils';
import { gasPriceService } from '@/server/gas';

export const GET = withErrorHandler(async (request: NextRequest) => {
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
});
