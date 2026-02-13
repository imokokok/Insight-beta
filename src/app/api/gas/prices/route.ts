import type { NextRequest } from 'next/server';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { gasPriceService } from '@/services/gas';
import { apiSuccess, apiError, getQueryParam } from '@/shared/utils';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

async function handleGet(request: NextRequest) {
  const chainsParam = getQueryParam(request, 'chains');

  if (!chainsParam) {
    return apiError('Chains parameter is required', 400);
  }

  const chains = chainsParam.split(',').map((c) => c.trim()) as SupportedChain[];
  const gasPrices = await gasPriceService.getGasPricesForChains(chains);

  const result = Array.from(gasPrices.entries()).map(([, data]) => ({
    ...data,
  }));

  return apiSuccess(result);
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
