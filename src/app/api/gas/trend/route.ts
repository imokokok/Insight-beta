import type { NextRequest } from 'next/server';

import { gasPriceService } from '@/services/gas';
import { apiSuccess, apiError, withErrorHandler, getRequiredQueryParam } from '@/shared/utils';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const chain = getRequiredQueryParam(request, 'chain') as SupportedChain | null;
  const priceLevel = getRequiredQueryParam(request, 'priceLevel') as
    | 'slow'
    | 'average'
    | 'fast'
    | 'fastest'
    | null;

  if (!chain) {
    return apiError('Chain parameter is required', 400);
  }

  if (!priceLevel) {
    return apiError('Price level parameter is required', 400);
  }

  const trend = gasPriceService.getTrend(chain, priceLevel);

  return apiSuccess(trend);
});
