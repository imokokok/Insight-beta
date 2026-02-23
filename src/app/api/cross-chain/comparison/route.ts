import type { NextRequest } from 'next/server';

import { isSupportedChain, type ChainId } from '@/config/chains';
import { VALID_SYMBOLS } from '@/config/constants';
import { crossChainAnalysisService } from '@/features/oracle/services/crossChainAnalysisService';
import { apiSuccess, apiError, getQueryParam } from '@/lib/api/apiResponse';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { validateSymbol } from '@/lib/api/validation';
import { logger } from '@/shared/logger';

function validateChains(chainsParam: string | null): ChainId[] | null {
  if (!chainsParam) return null;

  const chains = chainsParam.split(',').map((c) => c.trim().toLowerCase());
  const invalidChains = chains.filter((c) => !isSupportedChain(c));

  if (invalidChains.length > 0) {
    return null;
  }

  return chains as ChainId[];
}

async function handleGet(request: NextRequest) {
  const symbol = getQueryParam(request, 'symbol');
  const chainsParam = getQueryParam(request, 'chains');

  const validatedSymbol = validateSymbol(symbol);
  if (validatedSymbol === null) {
    return apiError(
      'INVALID_SYMBOL',
      `Invalid symbol. Valid symbols: ${VALID_SYMBOLS.join(', ')}`,
      400,
    );
  }

  const chains = chainsParam !== null ? validateChains(chainsParam) : null;
  if (chainsParam !== null && chains === null) {
    return apiError('INVALID_CHAINS', 'Invalid chains parameter', 400);
  }

  const comparison = await crossChainAnalysisService.comparePrices(
    validatedSymbol,
    chains ?? undefined,
  );

  logger.info('Cross-chain comparison completed', {
    symbol: symbol!.toUpperCase(),
    chainsCount: comparison.pricesByChain.length,
    priceRangePercent: comparison.statistics.priceRangePercent,
  });

  return apiSuccess({
    comparison,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
