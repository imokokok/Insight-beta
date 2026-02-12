import type { NextRequest } from 'next/server';

import type { SupportedChain } from '@/types/unifiedOracleTypes';
import {
  apiSuccess,
  apiError,
  withErrorHandler,
  getQueryParam,
} from '@/shared/utils';
import { gasPriceService } from '@/services/gas';

export const GET = withErrorHandler(async (request: NextRequest) => {
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
});
