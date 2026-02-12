import type { NextRequest } from 'next/server';

import { gasPriceService } from '@/services/gas';
import {
  apiSuccess,
  apiError,
  withErrorHandler,
  getRequiredQueryParam,
  getQueryParam,
} from '@/shared/utils';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const chain = getRequiredQueryParam(request, 'chain') as SupportedChain | null;
  const provider = getQueryParam(request, 'provider') as
    | 'etherscan'
    | 'gasnow'
    | 'blocknative'
    | 'ethgasstation'
    | 'gasprice'
    | null;
  const limitParam = getQueryParam(request, 'limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  if (!chain) {
    return apiError('Chain parameter is required', 400);
  }

  const history = gasPriceService.getHistory(chain, provider ?? undefined, Math.min(limit, 1000));

  return apiSuccess({
    history,
    meta: {
      count: history.length,
      chain,
      provider,
    },
  });
});
