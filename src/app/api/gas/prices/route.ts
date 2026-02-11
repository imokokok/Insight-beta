import type { NextRequest } from 'next/server';

import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import {
  apiSuccess,
  apiError,
  withErrorHandler,
  getQueryParam,
} from '@/lib/utils';
import { gasPriceService } from '@/server/gas';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const chainsParam = getQueryParam(request, 'chains');

  if (!chainsParam) {
    return apiError('Chains parameter is required', 400);
  }

  const chains = chainsParam.split(',').map(c => c.trim()) as SupportedChain[];
  const gasPrices = await gasPriceService.getGasPricesForChains(chains);

  const result = Array.from(gasPrices.entries()).map(([, data]) => ({
    ...data,
  }));

  return apiSuccess(result);
});
