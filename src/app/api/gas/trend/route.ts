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
