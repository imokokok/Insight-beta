import type { NextRequest } from 'next/server';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { gasPriceService } from '@/services/gas';
import { apiSuccess, apiError, getQueryParam } from '@/shared/utils';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

async function handleGet(request: NextRequest) {
  const chain = getQueryParam(request, 'chain') as SupportedChain | null;
  const provider = getQueryParam(request, 'provider') as
    | 'etherscan'
    | 'gasnow'
    | 'blocknative'
    | 'ethgasstation'
    | 'gasprice'
    | null;

  if (!chain) {
    return apiError('Chain parameter is required', 400);
  }

  const gasPrice = await gasPriceService.getGasPrice(chain, provider ?? undefined);

  return apiSuccess(gasPrice);
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
